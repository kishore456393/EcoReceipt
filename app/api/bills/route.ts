import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateBillNumber } from "@/lib/generate-bill-number";
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

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      shopId: shop.id,
    };

    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          items: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.bill.count({ where }),
    ]);

    return NextResponse.json({
      bills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}

interface BillItemInput {
  itemId?: string;
  name: string;
  price: number;
  quantity: number;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await prisma.shop.findUnique({
      where: { ownerId: session.user.id },
    });

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found. Please create a shop first." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      items,
      customerName,
      customerPhone,
      customerEmail,
      discount = 0,
      taxPercent,
    } = body as {
      items: BillItemInput[];
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      discount?: number;
      taxPercent?: number;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    const subtotal = items.reduce(
      (sum: number, item: BillItemInput) => sum + item.price * item.quantity,
      0
    );

    const effectiveTaxPercent =
      taxPercent !== undefined ? taxPercent : shop.taxPercent;
    const discountAmount = discount || 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * effectiveTaxPercent) / 100;
    const total = taxableAmount + taxAmount;

    const billNumber = await generateBillNumber(shop.id);

    // Create the bill (no interactive transaction — Supabase connection pooler doesn't support them)
    const bill = await prisma.bill.create({
      data: {
        shopId: shop.id,
        billNumber,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        taxPercent: effectiveTaxPercent,
        discount: Math.round(discountAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        items: {
          create: items.map((item: BillItemInput) => ({
            itemId: item.itemId || null,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: Math.round(item.price * item.quantity * 100) / 100,
          })),
        },
      } as any,
      include: {
        items: true,
      },
    });

    // Decrease stock for items (batch update, non-blocking)
    const stockUpdates = items
      .filter((item) => item.itemId)
      .map((item) =>
        prisma.item.update({
          where: { id: item.itemId! },
          data: { stock: { decrement: item.quantity } },
        })
      );

    if (stockUpdates.length > 0) {
      await Promise.all(stockUpdates);
    }

     return NextResponse.json(bill, { status: 201 });
  } catch (error: any) {
    console.error("Error creating bill:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    const errorMessage = error?.code === "P2002"
      ? "Duplicate bill number, please try again"
      : "Failed to create bill";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH: Verify a self-checkout bill (owner only)
export async function PATCH(req: Request) {
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

    const body = await req.json();
    const { billId, action } = body as { billId: string; action: "verify" | "cancel" };

    if (!billId || !action) {
      return NextResponse.json(
        { error: "billId and action are required" },
        { status: 400 }
      );
    }

    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        shopId: shop.id,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (action === "verify") {
      const updated = await prisma.bill.update({
        where: { id: billId },
        data: {
          status: "PAID",
          verifiedAt: new Date(),
        } as any, // Cast to any because verifiedAt might not be present in cached types
        include: { items: true },
      });

      let smsSent = false;
      let smsError: string | undefined;
      let smsSkipReason: string | undefined;

      if (!updated.customerPhone) {
        smsSkipReason = "No customer phone number on bill";
      } else if (!shop.smsApiKey) {
        smsSkipReason = "Fast2SMS API key not configured in Shop Settings";
      } else {
        const baseUrl = getNetworkUrl();
        const receiptUrl = `${baseUrl}/receipt/${updated.qrToken}`;

        const message = formatBillSMS({
          shopName: shop.name,
          billNumber: updated.billNumber,
          items: (updated as any).items.map((i: any) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            total: i.total,
          })),
          subtotal: updated.subtotal,
          taxAmount: updated.taxAmount,
          discount: updated.discount,
          total: updated.total,
          status: "PAID",
          receiptUrl,
          customerName: updated.customerName || undefined,
        });

        const result = await sendSMSFast2SMS(shop.smsApiKey, updated.customerPhone, message);
        smsSent = result.success;
        smsError = result.error;

        if (!result.success) {
          console.error("SMS sending failed for self-checkout:", result.error);
        }
      }

      // Auto-send Email when bill is verified and customer email exists
      let emailSent = false;
      let emailError: string | undefined;
      let emailSkipReason: string | undefined;

      const customerEmail = (updated as any).customerEmail;
      const senderEmail = (shop as any).senderEmail;
      const emailAppPassword = (shop as any).emailAppPassword;

      if (!customerEmail) {
        emailSkipReason = "No customer email on bill";
      } else if (!senderEmail || !emailAppPassword) {
        emailSkipReason = "Shop Email credentials not configured in Shop Settings";
      } else {
        const baseUrl = getNetworkUrl();
        const receiptUrl = `${baseUrl}/receipt/${updated.qrToken}`;

        const result = await sendEmailReceipt({
          shopName: shop.name,
          senderEmail: senderEmail,
          emailAppPassword: emailAppPassword,
          customerEmail: customerEmail,
          billNumber: updated.billNumber,
          items: (updated as any).items.map((i: any) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            total: i.total,
          })),
          subtotal: updated.subtotal,
          taxAmount: updated.taxAmount,
          discount: updated.discount,
          total: updated.total,
          status: "PAID",
          receiptUrl,
          customerName: updated.customerName || undefined,
        });

        emailSent = result.success;
        emailError = result.error;

        if (!result.success) {
          console.error("Email sending failed for self-checkout:", result.error);
        }
      }

      return NextResponse.json({ ...updated, smsSent, smsError, smsSkipReason, emailSent, emailError, emailSkipReason });
    }

    if (action === "cancel") {
      const updated = await prisma.bill.update({
        where: { id: billId },
        data: {
          status: "CANCELLED",
        },
        include: { items: true },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error verifying bill:", error);
    return NextResponse.json(
      { error: "Failed to verify bill" },
      { status: 500 }
    );
  }
}
