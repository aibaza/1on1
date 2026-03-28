/**
 * Google Calendar push notification (webhook) registration.
 * Sets up a watch channel on a user's calendar so we receive
 * notifications when events change.
 */

import { google } from "googleapis";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/webhook`;

/**
 * Register a push notification channel for a user's calendar.
 * Google sends notifications for 7 days, so this needs periodic renewal.
 */
export async function registerCalendarWebhook(
  connectionId: string,
  accessToken: string,
  calendarId: string
): Promise<void> {
  const channelId = randomUUID();

  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2 });

  try {
    const res = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: WEBHOOK_URL,
        // Expire in 7 days (maximum allowed by Google)
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await adminDb
      .update(calendarConnections)
      .set({
        webhookChannelId: channelId,
        webhookResourceId: res.data.resourceId ?? null,
        webhookExpiration: res.data.expiration
          ? new Date(Number(res.data.expiration))
          : null,
        updatedAt: new Date(),
      })
      .where(eq(calendarConnections.id, connectionId));
  } catch (err) {
    console.error("Failed to register calendar webhook:", err);
    // Non-fatal — outbound sync still works without webhooks
  }
}

/**
 * Stop a push notification channel (e.g., on disconnect).
 */
export async function unregisterCalendarWebhook(
  accessToken: string,
  channelId: string,
  resourceId: string
): Promise<void> {
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2 });

  try {
    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId,
      },
    });
  } catch {
    // Channel may already be expired — ignore
  }
}

/**
 * Renew all expiring webhook channels.
 * Should be called by a cron job every 6 days.
 */
export async function renewExpiringWebhooks(): Promise<void> {
  const { getValidAccessToken } = await import("./token");

  // Find connections with webhooks expiring within 24 hours
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const expiring = await adminDb
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.enabled, true));

  for (const conn of expiring) {
    if (
      !conn.webhookExpiration ||
      conn.webhookExpiration.getTime() > soon.getTime()
    ) {
      continue;
    }

    try {
      const accessToken = await getValidAccessToken(conn.id);

      // Stop old channel
      if (conn.webhookChannelId && conn.webhookResourceId) {
        await unregisterCalendarWebhook(
          accessToken,
          conn.webhookChannelId,
          conn.webhookResourceId
        );
      }

      // Register new channel
      await registerCalendarWebhook(conn.id, accessToken, conn.calendarId);
    } catch (err) {
      console.error(
        `Failed to renew webhook for connection ${conn.id}:`,
        err
      );
    }
  }
}
