import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateBillNumber } from "@/lib/generate-bill-number";

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
      discount = 0,
      taxPercent,
    } = body as {
      items: BillItemInput[];
      customerName?: string;
      customerPhone?: string;
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

    const bill = await prisma.$transaction(async (tx) => {
      const createdBill = await tx.bill.create({
        data: {
          shopId: shop.id,
          billNumber,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
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
        },
        include: {
          items: true,
        },
      });

      // Decrease stock for each item that has an itemId
      for (const item of items) {
        if (item.itemId) {
          await tx.item.update({
            where: { id: item.itemId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return createdBill;
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error("Error creating bill:", error);
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 }
    );
  }
}
