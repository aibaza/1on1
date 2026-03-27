import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/lib/auth/config";

/**
 * GET /api/calendar/connect
 *
 * Initiates the Google OAuth flow for Calendar access.
 * Redirects the user to Google's consent screen with calendar.events scope.
 * This is separate from the login OAuth — a user can log in with email/password
 * and still connect their Google Calendar here.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`
  );

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    // Pass user ID in state so we can match on callback
    state: session.user.id,
  });

  return NextResponse.redirect(url);
}
