import { auth } from "@/lib/auth/config";

function getBaseUrl(req: Request): string {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return `${proto}://${forwardedHost}`;
  }
  return new URL(req.url).origin;
}

export const proxy = auth((req) => {
  const isAuth = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register") ||
    req.nextUrl.pathname.startsWith("/verify-email") ||
    req.nextUrl.pathname.startsWith("/forgot-password") ||
    req.nextUrl.pathname.startsWith("/reset-password");

  const baseUrl = getBaseUrl(req);

  // Unauthenticated users can only access auth pages and API routes
  if (!isAuth && !isAuthPage) {
    return Response.redirect(new URL("/login", baseUrl));
  }

  // Authenticated users should not see auth pages
  if (isAuth && isAuthPage) {
    return Response.redirect(new URL("/overview", baseUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
