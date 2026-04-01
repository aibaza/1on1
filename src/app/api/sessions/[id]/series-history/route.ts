import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant, isAdmin } from "@/lib/auth/rbac";
import {
  sessions,
  meetingSeries,
  actionItems,
  talkingPoints,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm";

/**
 * GET /api/sessions/[id]/series-history
 *
 * Returns full history for the current series:
 * - All action items (all statuses) from the series, with assignee info
 * - All talking points from all sessions in the series
 *
 * Used by the wizard's "View all" history dialogs.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify session exists and get series ID
        const sessionRows = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.id, sessionId),
              eq(sessions.tenantId, session.user.tenantId)
            )
          )
          .limit(1);

        if (sessionRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        const seriesId = sessionRows[0].seriesId;

        // Verify participant
        const seriesRows = await tx
          .select({
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, seriesId))
          .limit(1);

        if (seriesRows.length === 0) {
          return { error: "NOT_FOUND" as const };
        }

        if (
          !isAdmin(session.user.level) &&
          !isSeriesParticipant(session.user.id, seriesRows[0])
        ) {
          return { error: "FORBIDDEN" as const };
        }

        // Fetch all sessions in this series (for session number mapping)
        const seriesSessions = await tx
          .select({
            id: sessions.id,
            sessionNumber: sessions.sessionNumber,
            scheduledAt: sessions.scheduledAt,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.seriesId, seriesId),
              eq(sessions.tenantId, session.user.tenantId)
            )
          )
          .orderBy(desc(sessions.sessionNumber));

        const sessionIds = seriesSessions.map((s) => s.id);
        const sessionNumberMap = new Map(
          seriesSessions.map((s) => [s.id, s.sessionNumber])
        );
        const sessionDateMap = new Map(
          seriesSessions.map((s) => [s.id, s.scheduledAt.toISOString()])
        );

        if (sessionIds.length === 0) {
          return {
            actionItems: [],
            talkingPoints: [],
            managerId: seriesRows[0].managerId,
            reportId: seriesRows[0].reportId,
          };
        }

        // Fetch ALL action items from the series (all statuses)
        const allActionItems = await tx
          .select({
            id: actionItems.id,
            title: actionItems.title,
            status: actionItems.status,
            dueDate: actionItems.dueDate,
            category: actionItems.category,
            assigneeId: actionItems.assigneeId,
            createdById: actionItems.createdById,
            sessionId: actionItems.sessionId,
            completedAt: actionItems.completedAt,
            createdAt: actionItems.createdAt,
          })
          .from(actionItems)
          .where(
            and(
              eq(actionItems.tenantId, session.user.tenantId),
              inArray(actionItems.sessionId, sessionIds)
            )
          )
          .orderBy(desc(actionItems.createdAt));

        // Fetch ALL talking points from the series
        const allTalkingPoints = await tx
          .select({
            id: talkingPoints.id,
            content: talkingPoints.content,
            category: talkingPoints.category,
            isDiscussed: talkingPoints.isDiscussed,
            discussedAt: talkingPoints.discussedAt,
            authorId: talkingPoints.authorId,
            sessionId: talkingPoints.sessionId,
            carriedFromSessionId: talkingPoints.carriedFromSessionId,
            createdAt: talkingPoints.createdAt,
          })
          .from(talkingPoints)
          .where(inArray(talkingPoints.sessionId, sessionIds))
          .orderBy(desc(talkingPoints.createdAt));

        // Collect unique user IDs for name lookup
        const userIds = new Set<string>();
        for (const ai of allActionItems) {
          userIds.add(ai.assigneeId);
          userIds.add(ai.createdById);
        }
        for (const tp of allTalkingPoints) {
          userIds.add(tp.authorId);
        }

        const userMap = new Map<
          string,
          { firstName: string; lastName: string }
        >();
        if (userIds.size > 0) {
          const userRows = await tx
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
            })
            .from(users)
            .where(inArray(users.id, [...userIds]));
          for (const u of userRows) {
            userMap.set(u.id, {
              firstName: u.firstName,
              lastName: u.lastName,
            });
          }
        }

        return {
          managerId: seriesRows[0].managerId,
          reportId: seriesRows[0].reportId,
          actionItems: allActionItems.map((ai) => ({
            id: ai.id,
            title: ai.title,
            status: ai.status,
            dueDate: ai.dueDate,
            category: ai.category,
            assigneeId: ai.assigneeId,
            assignee: userMap.get(ai.assigneeId) ?? null,
            sessionNumber: sessionNumberMap.get(ai.sessionId) ?? 0,
            sessionDate: sessionDateMap.get(ai.sessionId) ?? null,
            completedAt: ai.completedAt?.toISOString() ?? null,
            createdAt: ai.createdAt.toISOString(),
          })),
          talkingPoints: allTalkingPoints.map((tp) => ({
            id: tp.id,
            content: tp.content,
            category: tp.category,
            isDiscussed: tp.isDiscussed,
            discussedAt: tp.discussedAt?.toISOString() ?? null,
            authorId: tp.authorId,
            author: userMap.get(tp.authorId) ?? null,
            sessionNumber: sessionNumberMap.get(tp.sessionId) ?? 0,
            sessionDate: sessionDateMap.get(tp.sessionId) ?? null,
            carriedFromSessionId: tp.carriedFromSessionId,
            createdAt: tp.createdAt.toISOString(),
          })),
        };
      }
    );

    if ("error" in result && !("actionItems" in result)) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        case "FORBIDDEN":
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch series history:", error);
    return NextResponse.json(
      { error: "Failed to fetch series history" },
      { status: 500 }
    );
  }
}
