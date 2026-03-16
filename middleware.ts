import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // Public routes
  const publicRoutes = ["/", "/login", "/role-select"];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isReceiptRoute = pathname.startsWith("/receipt/");
  const isApiRoute = pathname.startsWith("/api/");

  // Allow public routes, receipt pages, and API routes
  if (isPublicRoute || isReceiptRoute || isApiRoute) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user has no role, redirect to role selection
  if (!token.role && pathname !== "/role-select") {
    return NextResponse.redirect(new URL("/role-select", req.url));
  }

  // Prevent customers from accessing dashboard routes
  if (token.role === "CUSTOMER" && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/customer", req.url));
  }

  // Prevent shop owners from accessing customer routes
  if (token.role === "SHOP_OWNER" && pathname.startsWith("/customer")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|hero-illustration.svg|og-image.png).*)",
  ],
};
