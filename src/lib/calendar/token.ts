import { google } from "googleapis";
import { eq } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";

/**
 * Returns a valid access token for a calendar connection,
 * refreshing it if expired. Updates the DB with new tokens.
 *
 * Uses adminDb (bypasses RLS) because this may run in background
 * sync contexts without a user session.
 */
export async function getValidAccessToken(
  connectionId: string
): Promise<string> {
  const [conn] = await adminDb
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.id, connectionId))
    .limit(1);

  if (!conn) {
    throw new Error(`Calendar connection ${connectionId} not found`);
  }

  if (!conn.enabled) {
    throw new Error(`Calendar connection ${connectionId} is disabled`);
  }

  // Token still valid (with 5-minute buffer)
  const bufferMs = 5 * 60 * 1000;
  if (conn.expiresAt.getTime() > Date.now() + bufferMs) {
    return conn.accessToken;
  }

  // Refresh the token
  if (conn.provider === "google") {
    return refreshGoogleToken(connectionId, conn.refreshToken);
  }

  throw new Error(`Token refresh not implemented for provider: ${conn.provider}`);
}

async function refreshGoogleToken(
  connectionId: string,
  refreshToken: string
): Promise<string> {
  const oauth2 = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );
  oauth2.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2.refreshAccessToken();

  if (!credentials.access_token) {
    // Token revoked — disable the connection
    await adminDb
      .update(calendarConnections)
      .set({ enabled: false, updatedAt: new Date() })
      .where(eq(calendarConnections.id, connectionId));

    throw new Error("Google refresh token revoked — connection disabled");
  }

  const expiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600 * 1000); // Default 1h

  await adminDb
    .update(calendarConnections)
    .set({
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token ?? refreshToken,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(calendarConnections.id, connectionId));

  return credentials.access_token;
}

/**
 * Get a user's active calendar connection for a given provider.
 */
export async function getUserCalendarConnection(
  userId: string,
  provider: "google" | "microsoft" = "google"
) {
  const [conn] = await adminDb
    .select()
    .from(calendarConnections)
    .where(
      eq(calendarConnections.userId, userId)
    )
    .limit(1);

  if (!conn || conn.provider !== provider || !conn.enabled) {
    return null;
  }

  return conn;
}
