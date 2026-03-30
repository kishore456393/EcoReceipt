import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// In-memory store for scanner sessions (in production, use Redis)
const scannerSessions = new Map<
  string,
  {
    barcodes: Array<{ barcode: string; timestamp: number }>;
    lastPoll: number;
    userId: string;
  }
>();

// Clean up old sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of scannerSessions.entries()) {
    // Remove sessions inactive for more than 30 minutes
    if (now - session.lastPoll > 30 * 60 * 1000) {
      scannerSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

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

    const scanSession = scannerSessions.get(sessionId);
    if (!scanSession) {
      return NextResponse.json(
        { error: "Session not found or expired" },
        { status: 404 }
      );
    }

    // Add barcode to session
    scanSession.barcodes.push({
      barcode: barcode.trim(),
      timestamp: Date.now(),
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

  if (!sessionId || !scannerSessions.has(sessionId)) {
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
    const newSessionId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    scannerSessions.set(newSessionId, {
      barcodes: [],
      lastPoll: Date.now(),
      userId: session.user.id,
    });
    return NextResponse.json({ sessionId: newSessionId });
  }

  // Poll for barcodes
  if (sessionId) {
    const scanSession = scannerSessions.get(sessionId);
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

    scanSession.lastPoll = Date.now();

    // Get and clear barcodes
    const barcodes = [...scanSession.barcodes];
    scanSession.barcodes = [];

    return NextResponse.json({ barcodes });
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
    const scanSession = scannerSessions.get(sessionId);
    if (scanSession?.userId === session.user.id) {
      scannerSessions.delete(sessionId);
    }
  }

  return NextResponse.json({ success: true });
}
