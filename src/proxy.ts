import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * In-memory rate limiting for critical API routes.
 * Adequate for single-instance deployments.
 * For multi-instance production, swap to Redis.
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const bidAttempts = new Map<string, RateLimitEntry>();
const BID_LIMIT = 60;
const BID_WINDOW = 60 * 1000;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    if (/^[\d.:a-fA-F]+$/.test(firstIp)) return firstIp;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count };
}

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

  // Rate limit bidding POST requests
  if (pathname.startsWith("/api/student/bids") && req.method === "POST") {
    const ip = getClientIp(req);
    const { allowed, remaining } = checkLimit(bidAttempts, ip, BID_LIMIT, BID_WINDOW);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many bid requests. Please slow down." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Limit": String(BID_LIMIT),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
  }

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
