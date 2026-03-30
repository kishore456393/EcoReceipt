import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // Public routes
  const publicRoutes = ["/", "/login"];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isReceiptRoute = pathname.startsWith("/receipt/");
  const isScannerRoute = pathname.startsWith("/scanner/");
  const isSelfCheckoutRoute = pathname.startsWith("/self-checkout/");
  const isApiRoute = pathname.startsWith("/api/");

  // Allow public routes, receipt pages, scanner pages, self-checkout pages, and API routes
  if (isPublicRoute || isReceiptRoute || isScannerRoute || isSelfCheckoutRoute || isApiRoute) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow only shop owner role for dashboard authentication
  if (token.role !== "SHOP_OWNER") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "access_denied");
    return NextResponse.redirect(loginUrl);
  }

  // Customer dashboard is disabled in shop-owner-only mode
  if (pathname.startsWith("/customer")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|hero-illustration.svg|og-image.png).*)",
  ],
};
