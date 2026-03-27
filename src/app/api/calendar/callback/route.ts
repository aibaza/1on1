import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/lib/auth/config";
import { adminDb } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/calendar/callback
 *
 * Google OAuth callback after the user grants calendar access.
 * Exchanges the auth code for tokens and stores them in calendar_connections.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login`
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // User denied access or other error
  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/account?calendar=denied`
    );
  }

  if (!code || state !== session.user.id) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/account?calendar=error`
    );
  }

  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.AUTH_GOOGLE_ID,
      process.env.AUTH_GOOGLE_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`
    );

    const { tokens } = await oauth2.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/account?calendar=error`
      );
    }

    // Get the Google account email for display
    oauth2.setCredentials(tokens);
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
    const userInfo = await oauth2Api.userinfo.get();
    const providerEmail = userInfo.data.email ?? null;

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Upsert: update if connection already exists, insert otherwise
    const existing = await adminDb
      .select({ id: calendarConnections.id })
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.userId, session.user.id),
          eq(calendarConnections.provider, "google")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await adminDb
        .update(calendarConnections)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          providerEmail,
          enabled: true,
          updatedAt: new Date(),
        })
        .where(eq(calendarConnections.id, existing[0].id));
    } else {
      await adminDb.insert(calendarConnections).values({
        userId: session.user.id,
        provider: "google",
        providerEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      });
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/account?calendar=connected`
    );
  } catch (err) {
    console.error("Failed to exchange Google Calendar tokens:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/account?calendar=error`
    );
  }
}
