import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageSeries } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { meetingSeries, sessions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageSeries(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: seriesId } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch the series
        const seriesRows = await tx
          .select()
          .from(meetingSeries)
          .where(
            and(
              eq(meetingSeries.id, seriesId),
              eq(meetingSeries.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (seriesRows.length === 0) {
          return { error: "SERIES_NOT_FOUND" };
        }

        const series = seriesRows[0];

        // Only the manager on the series can start a session
        if (session.user.id !== series.managerId) {
          return { error: "FORBIDDEN" };
        }

        // Check if there's already an in_progress session
        const inProgress = await tx
          .select({ id: sessions.id })
          .from(sessions)
          .where(
            and(
              eq(sessions.seriesId, seriesId),
              eq(sessions.status, "in_progress")
            )
          )
          .limit(1);

        if (inProgress.length > 0) {
          return {
            error: "SESSION_IN_PROGRESS",
            sessionId: inProgress[0].id,
          };
        }

        // Count existing sessions to determine session number
        const countResult = await tx
          .select({
            count: sql<number>`cast(count(*) as int)`,
          })
          .from(sessions)
          .where(eq(sessions.seriesId, seriesId));

        const sessionNumber = (countResult[0]?.count ?? 0) + 1;
        const now = new Date();

        // Create session record
        const [newSession] = await tx
          .insert(sessions)
          .values({
            seriesId,
            tenantId: session.user.tenantId,
            templateId: series.defaultTemplateId,
            sessionNumber,
            scheduledAt: now,
            startedAt: now,
            status: "in_progress",
          })
          .returning();

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "session_started",
          resourceType: "session",
          resourceId: newSession.id,
          metadata: {
            seriesId,
            sessionNumber,
          },
        });

        return { session: newSession };
      }
    );

    if ("error" in result) {
      switch (result.error) {
        case "SERIES_NOT_FOUND":
          return NextResponse.json(
            { error: "Series not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json(
            { error: "Only the manager can start a session" },
            { status: 403 }
          );
        case "SESSION_IN_PROGRESS":
          return NextResponse.json(
            {
              error: "A session is already in progress",
              sessionId: (result as { error: string; sessionId: string })
                .sessionId,
            },
            { status: 409 }
          );
      }
    }

    const newSession = (result as { session: typeof sessions.$inferSelect })
      .session;

    return NextResponse.json(
      { id: newSession.id, sessionNumber: newSession.sessionNumber },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to start session:", error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}
