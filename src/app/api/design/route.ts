import { NextResponse } from "next/server";
import { DESIGN_PREF_COOKIE } from "@/lib/design-preference";

/**
 * Secret URL to switch design:
 *   /api/design?theme=classic
 *   /api/design?theme=editorial
 *
 * Sets cookie and redirects to overview.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const theme = url.searchParams.get("theme");

  if (theme !== "classic" && theme !== "editorial") {
    return NextResponse.json({ error: "Use ?theme=classic or ?theme=editorial" }, { status: 400 });
  }

  const response = NextResponse.redirect(new URL("/overview", request.url));
  response.cookies.set(DESIGN_PREF_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}
