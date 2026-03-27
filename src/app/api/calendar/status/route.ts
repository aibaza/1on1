import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { adminDb } from "@/lib/db";
import { calendarConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/calendar/status
 *
 * Returns the current user's calendar connection status.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [conn] = await adminDb
    .select({
      id: calendarConnections.id,
      provider: calendarConnections.provider,
      providerEmail: calendarConnections.providerEmail,
      enabled: calendarConnections.enabled,
      createdAt: calendarConnections.createdAt,
    })
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, session.user.id),
        eq(calendarConnections.provider, "google")
      )
    )
    .limit(1);

  return NextResponse.json({
    google: conn
      ? {
          connected: true,
          enabled: conn.enabled,
          email: conn.providerEmail,
          connectedAt: conn.createdAt.toISOString(),
        }
      : { connected: false },
  });
}
