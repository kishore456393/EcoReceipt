import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET: Public endpoint — returns shop info + active items for self-checkout
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
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
        taxPercent: true,
      },
    });

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    // Get all active items for this shop
    const items = await prisma.item.findMany({
      where: {
        shopId,
        isActive: true,
        stock: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        price: true,
        category: true,
        unit: true,
        stock: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ shop, items });
  } catch (error) {
    console.error("Self-checkout shop fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop info" },
      { status: 500 }
    );
  }
}
