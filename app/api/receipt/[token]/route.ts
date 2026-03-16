import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const bill = await prisma.bill.findUnique({
      where: { qrToken: token },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            logo: true,
            gstNumber: true,
            upiId: true,
            upiName: true,
            category: true,
          },
        },
        items: true,
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error("Error fetching receipt:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipt" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    const bill = await prisma.bill.findUnique({
      where: { qrToken: token },
    });

    if (!bill) {
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action } = body as { action: "view" | "download" };

    if (!action || !["view", "download"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'view' or 'download'." },
        { status: 400 }
      );
    }

    const receipt = await prisma.receipt.upsert({
      where: {
        billId_customerId: {
          billId: bill.id,
          customerId: session.user.id,
        },
      },
      update: {
        ...(action === "view" && { viewedAt: new Date() }),
        ...(action === "download" && { downloadedAt: new Date() }),
      },
      create: {
        billId: bill.id,
        customerId: session.user.id,
        viewedAt: new Date(),
        ...(action === "download" && { downloadedAt: new Date() }),
      },
    });

    return NextResponse.json(receipt);
  } catch (error) {
    console.error("Error recording receipt action:", error);
    return NextResponse.json(
      { error: "Failed to record receipt action" },
      { status: 500 }
    );
  }
}
