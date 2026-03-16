import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
    const period = searchParams.get("period") || "month";

    // Determine date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const dateFilter = {
      shopId: shop.id,
      createdAt: {
        gte: startDate,
        lte: now,
      },
    };

    // Total revenue and bill counts
    const [totalStats, paidCount, pendingCount] = await Promise.all([
      prisma.bill.aggregate({
        where: {
          ...dateFilter,
          status: "PAID",
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.bill.count({
        where: { ...dateFilter, status: "PAID" },
      }),
      prisma.bill.count({
        where: { ...dateFilter, status: "PENDING" },
      }),
    ]);

    const totalBills = await prisma.bill.count({ where: dateFilter });
    const totalRevenue = totalStats._sum.total || 0;

    // Revenue by day (for charts)
    const bills = await prisma.bill.findMany({
      where: {
        ...dateFilter,
        status: "PAID",
      },
      select: {
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const revenueByDayMap = new Map<
      string,
      { revenue: number; count: number }
    >();

    for (const bill of bills) {
      const dateKey = bill.createdAt.toISOString().slice(0, 10);
      const existing = revenueByDayMap.get(dateKey) || {
        revenue: 0,
        count: 0,
      };
      existing.revenue += bill.total;
      existing.count += 1;
      revenueByDayMap.set(dateKey, existing);
    }

    const revenueByDay = Array.from(revenueByDayMap.entries()).map(
      ([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        count: data.count,
      })
    );

    // Top selling items (top 5 by quantity)
    const topSellingItems = await prisma.billItem.groupBy({
      by: ["name"],
      where: {
        bill: {
          ...dateFilter,
          status: "PAID",
        },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    });

    const topItems = topSellingItems.map((item) => ({
      name: item.name,
      totalQuantity: item._sum.quantity || 0,
      totalRevenue: Math.round((item._sum.total || 0) * 100) / 100,
    }));

    // Low stock items (stock <= lowStockThreshold)
    const lowStockItems = await prisma.$queryRaw<
      {
        id: string;
        name: string;
        stock: number;
        lowStockThreshold: number;
        category: string;
      }[]
    >`
      SELECT "id", "name", "stock", "lowStockThreshold", "category"
      FROM "Item"
      WHERE "shopId" = ${shop.id}
        AND "isActive" = true
        AND "stock" <= "lowStockThreshold"
      ORDER BY "stock" ASC
    `;

    // Total items in stock count
    const itemsInStock = await prisma.item.count({
      where: { shopId: shop.id, isActive: true },
    });

    // Recent bills (last 5)
    const recentBills = await prisma.bill.findMany({
      where: { shopId: shop.id },
      select: {
        id: true,
        billNumber: true,
        total: true,
        status: true,
        customerName: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalBills,
      paidCount,
      pendingCount,
      itemsInStock,
      revenueByDay,
      topSellingItems: topItems,
      lowStockItems,
      recentBills,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
