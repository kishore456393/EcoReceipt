import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
  // If a public URL is configured (e.g. in production), use that
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
    return NextResponse.json({ url: process.env.NEXTAUTH_URL.replace(/\/$/, "") });
  }

  // In development, find the LAN IP so phones on same WiFi can scan the QR
  const interfaces = os.networkInterfaces();
  let lanIp: string | null = null;

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const info of iface) {
      // Pick first non-internal IPv4 address
      if (info.family === "IPv4" && !info.internal) {
        lanIp = info.address;
        break;
      }
    }
    if (lanIp) break;
  }

  const port = process.env.PORT || "3000";
  const url = lanIp ? `http://${lanIp}:${port}` : `http://localhost:${port}`;

  return NextResponse.json({ url });
}
