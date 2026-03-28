import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/lib/auth/config";
import { adminDb } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/calendar/disconnect
 *
 * Disconnects Google Calendar — revokes the token and removes the connection.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const [conn] = await adminDb
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.userId, session.user.id),
          eq(calendarConnections.provider, "google")
        )
      )
      .limit(1);

    if (!conn) {
      return NextResponse.json(
        { error: "No Google Calendar connection found" },
        { status: 404 }
      );
    }

    // Stop webhook channel (best effort)
    if (conn.webhookChannelId && conn.webhookResourceId) {
      try {
        const { unregisterCalendarWebhook } = await import(
          "@/lib/calendar/webhook"
        );
        await unregisterCalendarWebhook(
          conn.accessToken,
          conn.webhookChannelId,
          conn.webhookResourceId
        );
      } catch {
        // Channel may already be expired
      }
    }

    // Revoke the token at Google (best effort)
    try {
      const oauth2 = new google.auth.OAuth2(
        process.env.AUTH_GOOGLE_ID,
        process.env.AUTH_GOOGLE_SECRET
      );
      oauth2.setCredentials({ access_token: conn.accessToken });
      await oauth2.revokeToken(conn.accessToken);
    } catch {
      // Token may already be revoked — continue with deletion
    }

    // Remove from our database
    await adminDb
      .delete(calendarConnections)
      .where(eq(calendarConnections.id, conn.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to disconnect Google Calendar:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
