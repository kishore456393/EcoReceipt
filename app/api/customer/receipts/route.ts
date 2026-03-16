import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const receipts = await prisma.receipt.findMany({
      where: { customerId: session.user.id },
      include: {
        bill: {
          include: {
            shop: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { viewedAt: "desc" },
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error("Failed to fetch customer receipts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
