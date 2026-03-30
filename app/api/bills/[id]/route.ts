import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { formatBillSMS, sendSMSFast2SMS } from "@/lib/sms";
import { sendEmailReceipt } from "@/lib/mail";
import os from "os";

function getNetworkUrl(): string {
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }
  const interfaces = os.networkInterfaces();
  let lanIp: string | null = null;
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const info of iface) {
      if (info.family === "IPv4" && !info.internal) {
        lanIp = info.address;
        break;
      }
    }
    if (lanIp) break;
  }
  const port = process.env.PORT || "3000";
  return lanIp ? `http://${lanIp}:${port}` : `http://localhost:${port}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await prisma.shop.findUnique({
      where: { ownerId: session.user.id },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const { id } = await params;

    const bill = await prisma.bill.findFirst({
      where: {
        id,
        shopId: shop.id,
      },
      include: {
        items: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error("Error fetching bill:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await prisma.shop.findUnique({
      where: { ownerId: session.user.id },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const { id } = await params;

    const existingBill = await prisma.bill.findFirst({
      where: {
        id,
        shopId: shop.id,
      },
    });

    if (!existingBill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status, razorpayPaymentId, razorpayOrderId } = body;

    if (status && !["PENDING", "PAID", "CANCELLED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be PENDING, PAID, or CANCELLED." },
        { status: 400 }
      );
    }

    const bill = await prisma.bill.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(razorpayPaymentId !== undefined && { razorpayPaymentId }),
        ...(razorpayOrderId !== undefined && { razorpayOrderId }),
      },
      include: {
        items: true,
      },
    });

    // Auto-send SMS when bill is marked PAID and customer phone exists
    let smsSent = false;
    let smsError: string | undefined;
    let smsSkipReason: string | undefined;

    if (status === "PAID") {
      if (!bill.customerPhone) {
        smsSkipReason = "No customer phone number on bill";
      } else if (!shop.smsApiKey) {
        smsSkipReason = "Fast2SMS API key not configured in Shop Settings";
      } else {
        const baseUrl = getNetworkUrl();
        const receiptUrl = `${baseUrl}/receipt/${bill.qrToken}`;

        const message = formatBillSMS({
          shopName: shop.name,
          billNumber: bill.billNumber,
          items: bill.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            total: i.total,
          })),
          subtotal: bill.subtotal,
          taxAmount: bill.taxAmount,
          discount: bill.discount,
          total: bill.total,
          status: "PAID",
          receiptUrl,
          customerName: bill.customerName || undefined,
        });

        const result = await sendSMSFast2SMS(shop.smsApiKey, bill.customerPhone, message);
        smsSent = result.success;
        smsError = result.error;

        if (!result.success) {
          console.error("SMS sending failed:", result.error);
        }
      }
    }

    // Auto-send Email when bill is marked PAID and customer email exists
    let emailSent = false;
    let emailError: string | undefined;
    let emailSkipReason: string | undefined;

    if (status === "PAID") {
      const customerEmail = (bill as any).customerEmail;
      const senderEmail = (shop as any).senderEmail;
      const emailAppPassword = (shop as any).emailAppPassword;

      if (!customerEmail) {
        emailSkipReason = "No customer email on bill";
      } else if (!senderEmail || !emailAppPassword) {
        emailSkipReason = "Shop Email credentials not configured in Shop Settings";
      } else {
        const baseUrl = getNetworkUrl();
        const receiptUrl = `${baseUrl}/receipt/${bill.qrToken}`;

        const result = await sendEmailReceipt({
          shopName: shop.name,
          senderEmail: senderEmail,
          emailAppPassword: emailAppPassword,
          customerEmail: customerEmail,
          billNumber: bill.billNumber,
          items: bill.items.map((i: any) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            total: i.total,
          })),
          subtotal: bill.subtotal,
          taxAmount: bill.taxAmount,
          discount: bill.discount,
          total: bill.total,
          status: "PAID",
          receiptUrl,
          customerName: bill.customerName || undefined,
        });

        emailSent = result.success;
        emailError = result.error;

        if (!result.success) {
          console.error("Email sending failed:", result.error);
        }
      }
    }

    return NextResponse.json({ ...bill, smsSent, smsError, smsSkipReason, emailSent, emailError, emailSkipReason });
  } catch (error) {
    console.error("Error updating bill:", error);
    return NextResponse.json(
      { error: "Failed to update bill" },
      { status: 500 }
    );
  }
}
