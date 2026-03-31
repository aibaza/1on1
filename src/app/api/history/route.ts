import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isAdmin } from "@/lib/auth/rbac";
import {
  sessions,
  meetingSeries,
  users,
} from "@/lib/db/schema";
import { eq, and, or, desc, lt, lte, gte, sql, inArray } from "drizzle-orm";

/**
 * GET /api/history
 *
 * Returns paginated session history with optional filters.
 * Sessions are returned with series metadata for grouping.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // "completed" | "in_progress" | null (all)
  const from = searchParams.get("from"); // ISO date string
  const to = searchParams.get("to"); // ISO date string
  const seriesId = searchParams.get("seriesId"); // UUID
  const cursor = searchParams.get("cursor"); // session ID for pagination
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "20", 10) || 20, 1), 50);

  // Validate date params before use
  const fromDate = from ? new Date(from) : null;
  if (fromDate && isNaN(fromDate.getTime())) {
    return NextResponse.json({ error: "Invalid 'from' date" }, { status: 400 });
  }
  const toDate = to ? new Date(to) : null;
  if (toDate && isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Invalid 'to' date" }, { status: 400 });
  }

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // First, find all series the user participates in (or all if admin)
        const userIsAdmin = isAdmin(session.user.level);

        let seriesFilter;
        if (userIsAdmin) {
          seriesFilter = eq(meetingSeries.tenantId, session.user.tenantId);
        } else {
          seriesFilter = and(
            eq(meetingSeries.tenantId, session.user.tenantId),
            or(
              eq(meetingSeries.managerId, session.user.id),
              eq(meetingSeries.reportId, session.user.id)
            )
          );
        }

        const userSeries = await tx
          .select({ id: meetingSeries.id })
          .from(meetingSeries)
          .where(seriesFilter!);

        const userSeriesIds = userSeries.map((s) => s.id);

        if (userSeriesIds.length === 0) {
          return {
            sessions: [],
            seriesScores: {},
            hasMore: false,
            nextCursor: null,
          };
        }

        // Build query conditions
        const conditions = [
          eq(sessions.tenantId, session.user.tenantId),
          inArray(sessions.seriesId, userSeriesIds),
        ];

        if (status && (status === "completed" || status === "in_progress")) {
          conditions.push(eq(sessions.status, status));
        }
        if (fromDate) {
          conditions.push(gte(sessions.scheduledAt, fromDate));
        }
        if (toDate) {
          // Include the entire end day
          const endOfDay = new Date(toDate);
          endOfDay.setDate(endOfDay.getDate() + 1);
          conditions.push(lt(sessions.scheduledAt, endOfDay));
        }
        if (seriesId) {
          conditions.push(eq(sessions.seriesId, seriesId));
        }

        // Cursor-based pagination
        if (cursor) {
          const cursorRow = await tx
            .select({ scheduledAt: sessions.scheduledAt })
            .from(sessions)
            .where(eq(sessions.id, cursor))
            .limit(1);

          if (cursorRow.length > 0) {
            conditions.push(
              or(
                lt(sessions.scheduledAt, cursorRow[0].scheduledAt),
                and(
                  eq(sessions.scheduledAt, cursorRow[0].scheduledAt),
                  lt(sessions.id, cursor)
                )
              )!
            );
          }
        }

        // Fetch sessions with manager and report names via subqueries
        const sessionRows = await tx
          .select({
            id: sessions.id,
            sessionNumber: sessions.sessionNumber,
            scheduledAt: sessions.scheduledAt,
            completedAt: sessions.completedAt,
            status: sessions.status,
            sessionScore: sessions.sessionScore,
            durationMinutes: sessions.durationMinutes,
            seriesId: sessions.seriesId,
          })
          .from(sessions)
          .where(and(...conditions))
          .orderBy(desc(sessions.scheduledAt), desc(sessions.id))
          .limit(limit + 1);

        const hasMore = sessionRows.length > limit;
        const pagedSessions = hasMore ? sessionRows.slice(0, limit) : sessionRows;
        const nextCursor = hasMore
          ? pagedSessions[pagedSessions.length - 1].id
          : null;

        // Fetch series info with manager/report names for all series in results
        const resultSeriesIds = [...new Set(pagedSessions.map((s) => s.seriesId))];
        const seriesInfo = resultSeriesIds.length > 0
          ? await tx
              .select({
                id: meetingSeries.id,
                managerId: meetingSeries.managerId,
                reportId: meetingSeries.reportId,
              })
              .from(meetingSeries)
              .where(inArray(meetingSeries.id, resultSeriesIds))
          : [];

        // Fetch user names for all managers and reports
        const allUserIds = [
          ...new Set([
            ...seriesInfo.map((s) => s.managerId),
            ...seriesInfo.map((s) => s.reportId),
          ]),
        ];
        const userRows = allUserIds.length > 0
          ? await tx
              .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
              })
              .from(users)
              .where(inArray(users.id, allUserIds))
          : [];
        const userMap = new Map(userRows.map((u) => [u.id, u]));
        const seriesMap = new Map(seriesInfo.map((s) => [s.id, s]));

        // Fetch score data per series for sparklines (last 6 completed sessions per series)
        const seriesScores: Record<string, number[]> = {};
        for (const sid of resultSeriesIds) {
          const scoreRows = await tx
            .select({
              sessionNumber: sessions.sessionNumber,
              sessionScore: sessions.sessionScore,
            })
            .from(sessions)
            .where(
              and(
                eq(sessions.seriesId, sid),
                eq(sessions.status, "completed")
              )
            )
            .orderBy(desc(sessions.sessionNumber))
            .limit(6);

          // Reverse to get chronological order and extract scores
          seriesScores[sid] = scoreRows
            .reverse()
            .filter((r) => r.sessionScore !== null)
            .map((r) => Number(r.sessionScore));
        }

        // Build enriched session data
        const enrichedSessions = pagedSessions.map((s) => {
          const seriesData = seriesMap.get(s.seriesId);
          const manager = seriesData ? userMap.get(seriesData.managerId) : null;
          const report = seriesData ? userMap.get(seriesData.reportId) : null;

          return {
            id: s.id,
            sessionNumber: s.sessionNumber,
            scheduledAt: s.scheduledAt.toISOString(),
            completedAt: s.completedAt?.toISOString() ?? null,
            status: s.status,
            sessionScore: s.sessionScore ? Number(s.sessionScore) : null,
            durationMinutes: s.durationMinutes,
            seriesId: s.seriesId,
            reportFirstName: report?.firstName ?? "",
            reportLastName: report?.lastName ?? "",
            managerFirstName: manager?.firstName ?? "",
            managerLastName: manager?.lastName ?? "",
          };
        });

        return {
          sessions: enrichedSessions,
          seriesScores,
          hasMore,
          nextCursor,
        };
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
