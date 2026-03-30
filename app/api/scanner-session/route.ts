import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: Add a barcode to a session (PUBLIC - no auth required for phone scanner)
export async function POST(req: NextRequest) {
  try {
    const { sessionId, barcode } = await req.json();

    if (!sessionId || !barcode) {
      return NextResponse.json(
        { error: "sessionId and barcode required" },
        { status: 400 }
      );
    }

    const scanSession = await prisma.scannerSession.findUnique({
      where: { id: sessionId },
    });

    if (!scanSession) {
      return NextResponse.json(
        { error: "Session not found or expired" },
        { status: 404 }
      );
    }

    // Add barcode to session
    let barcodes: Array<{ barcode: string; timestamp: number }> = [];
    try {
      if (scanSession.barcodes) {
        barcodes = JSON.parse(scanSession.barcodes);
      }
    } catch {
      // ignore
    }

    barcodes.push({
      barcode: barcode.trim(),
      timestamp: Date.now(),
    });

    await prisma.scannerSession.update({
      where: { id: sessionId },
      data: { barcodes: JSON.stringify(barcodes) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Scanner session POST error:", error);
    return NextResponse.json(
      { error: "Failed to add barcode" },
      { status: 500 }
    );
  }
}

// HEAD: Check if session exists (PUBLIC - for phone to verify connection)
export async function HEAD(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new NextResponse(null, { status: 404 });
  }

  const session = await prisma.scannerSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, { status: 200 });
}

// GET: Create new session or poll for barcodes
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const action = searchParams.get("action");

  // Create new session
  if (action === "create") {
    // Clean up old sessions first
    await prisma.scannerSession.deleteMany({
      where: {
        updatedAt: {
          lt: new Date(Date.now() - 30 * 60 * 1000), // older than 30 mins
        },
      },
    });

    const newSessionId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    await prisma.scannerSession.create({
      data: {
        id: newSessionId,
        userId: session.user.id,
        barcodes: "[]",
      },
    });

    return NextResponse.json({ sessionId: newSessionId });
  }

  // Poll for barcodes
  if (sessionId) {
    const scanSession = await prisma.scannerSession.findUnique({
      where: { id: sessionId },
    });

    if (!scanSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (scanSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let barcodes: Array<{ barcode: string; timestamp: number }> = [];
    try {
      if (scanSession.barcodes) {
        barcodes = JSON.parse(scanSession.barcodes);
      }
    } catch {
      // ignore
    }

    // Get and clear barcodes
    if (barcodes.length > 0) {
      await prisma.scannerSession.update({
        where: { id: sessionId },
        data: { barcodes: "[]" },
      });
    } else {
      // Just update updatedAt if no new barcodes, to keep session active
      await prisma.scannerSession.update({
        where: { id: sessionId },
        data: { barcodes: "[]" },
      });
    }

    return NextResponse.json({ barcodes: barcodes.map(b => ({ barcode: b.barcode, timestamp: b.timestamp })) });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

// DELETE: End a session
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (sessionId) {
    await prisma.scannerSession.deleteMany({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
    });
  }

  return NextResponse.json({ success: true });
}
