import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";

const WINDOW_MS = 60_000;

function getLimit(pathname: string, method: string): number {
  if (pathname.startsWith("/api/auth")) return 10;
  if (pathname === "/api/invites" && method === "POST") return 10;
  if (/\/api\/.*\/ai-/.test(pathname) || /\/api\/.*\/ai$/.test(pathname))
    return 20;
  return 100;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting only applies to API routes
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(request);
    const limit = getLimit(pathname, request.method);
    const key = `${ip}:${pathname.startsWith("/api/auth") ? "/api/auth" : pathname}`;

    const { allowed, retryAfterMs } = checkRateLimit(key, limit, WINDOW_MS);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
        }
      );
    }
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico|monitoring).*)"],
};
