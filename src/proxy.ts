import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths that don't need auth
  const publicPrefixes = [
    "/",
    "/about",
    "/solutions",
    "/faq",
    "/case-studies",
    "/blog",
    "/request-demo",
    "/auth/",
    "/api/auth/",
    "/_next/",
    "/static/",
    "/favicon",
  ];

  const isPublicPath = publicPrefixes.some(
    (p) => pathname === p || pathname.startsWith(p)
  );

  if (isPublicPath) return NextResponse.next();

  // Get JWT token without importing db
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string | undefined;

  // Role-based routing
  if (pathname.startsWith("/portal/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }
  if (pathname.startsWith("/portal/professor") && role !== "PROFESSOR") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }
  if (pathname.startsWith("/portal/student") && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
