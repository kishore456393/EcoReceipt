import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateBillNumber } from "@/lib/generate-bill-number";

export const dynamic = "force-dynamic";

interface SelfCheckoutItem {
  itemId?: string;
  name: string;
  price: number;
  quantity: number;
}

// POST: Public endpoint — customer submits a self-checkout bill
export async function POST(
  req: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        taxPercent: true,
        upiId: true,
        upiName: true,
        name: true,
      },
    });

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { items, customerName, customerPhone } = body as {
      items: SelfCheckoutItem[];
      customerName?: string;
      customerPhone?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    if (!customerName?.trim()) {
      return NextResponse.json(
        { error: "Customer name is required for self-checkout" },
        { status: 400 }
      );
    }

    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const taxPercent = shop.taxPercent;
    const taxAmount = (subtotal * taxPercent) / 100;
    const total = subtotal + taxAmount;

    const billNumber = await generateBillNumber(shop.id);

    const bill = await prisma.bill.create({
      data: {
        shopId: shop.id,
        billNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim() || null,
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        taxPercent,
        discount: 0,
        total: Math.round(total * 100) / 100,
        status: "PENDING_VERIFICATION",
        selfCheckout: true,
        items: {
          create: items.map((item) => ({
            itemId: item.itemId || null,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: Math.round(item.price * item.quantity * 100) / 100,
          })),
        },
      },
      include: {
        items: true,
        shop: {
          select: {
            name: true,
            upiId: true,
            upiName: true,
          },
        },
      },
    });

    // Decrease stock for items with valid itemIds
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
  } catch (error: unknown) {
    console.error("Self-checkout bill creation error:", error);
    const err = error as { code?: string };
    const errorMessage =
      err?.code === "P2002"
        ? "Duplicate bill number, please try again"
        : "Failed to create bill";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
