import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET: Public endpoint — check bill status for self-checkout polling
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params;

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      select: {
        id: true,
        status: true,
        verifiedAt: true,
        selfCheckout: true,
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: bill.status,
      verified: bill.status === "PAID" && bill.verifiedAt !== null,
      verifiedAt: bill.verifiedAt,
    });
  } catch (error) {
    console.error("Bill status check error:", error);
    return NextResponse.json(
      { error: "Failed to check bill status" },
      { status: 500 }
    );
  }
}
