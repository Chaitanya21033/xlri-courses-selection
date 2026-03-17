import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight rate limiting middleware for critical API routes.
 * Uses in-memory Map — adequate for single-instance deployments.
 * For multi-instance production, use Redis or a dedicated rate limiter.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const bidAttempts = new Map<string, RateLimitEntry>();

// Bidding: max 60 requests per minute per IP
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

export function middleware(req: NextRequest) {
  const { pathname, method } = req.nextUrl;
  const ip = getClientIp(req);

  // Rate limit bidding operations
  if (pathname.startsWith("/api/student/bids") && method === "POST") {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/student/bids/:path*"],
};
