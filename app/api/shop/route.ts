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

    const shop = await prisma.shop.findUnique({
      where: { ownerId: session.user.id },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json(shop);
  } catch (error) {
    console.error("Error fetching shop:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      address,
      phone,
      logo,
      gstNumber,
      upiId,
      upiName,
      category,
      taxPercent,
      razorpayKey,
      razorpaySecret,
      smsApiKey,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Shop name is required" },
        { status: 400 }
      );
    }

    const shop = await prisma.shop.upsert({
      where: { ownerId: session.user.id },
      update: {
        name,
        address,
        phone,
        logo,
        gstNumber,
        upiId,
        upiName,
        category,
        taxPercent: taxPercent ? parseFloat(taxPercent) : 0,
        razorpayKey,
        razorpaySecret,
        smsApiKey,
      },
      create: {
        ownerId: session.user.id,
        name,
        address,
        phone,
        logo,
        gstNumber,
        upiId,
        upiName,
        category,
        taxPercent: taxPercent ? parseFloat(taxPercent) : 0,
        razorpayKey,
        razorpaySecret,
        smsApiKey,
      },
    });

    return NextResponse.json(shop);
  } catch (error) {
    console.error("Error creating/updating shop:", error);
    return NextResponse.json(
      { error: "Failed to create/update shop" },
      { status: 500 }
    );
  }
}
