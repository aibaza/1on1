import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { meetingSeries, sessions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  getScoreTrend,
  getCategoryAverages,
  getSessionComparison,
  getActionItemVelocity,
  getMeetingAdherence,
} from "@/lib/analytics/queries";
import { periodToDateRange } from "@/lib/analytics/period";

/**
 * GET /api/analytics/individual/[id]
 *
 * Returns analytics data for a specific user.
 * Query params:
 *   - period: preset string (30d, 3mo, 6mo, 1yr)
 *   - startDate, endDate: ISO date strings for custom range
 *   - compare: sessionId1,sessionId2 for session comparison
 *
 * Auth: user must be the person themselves, their manager, or an admin.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: targetUserId } = await params;
  const { user } = session;

  try {
    const result = await withTenantContext(
      user.tenantId,
      user.id,
      async (tx) => {
        // Authorization check
        if (user.role === "member" && user.id !== targetUserId) {
          return { error: "forbidden" } as const;
        }

        if (user.role === "manager" && user.id !== targetUserId) {
          // Verify the target user is a direct report via meeting_series
          const series = await tx
            .select({ id: meetingSeries.id })
            .from(meetingSeries)
            .where(
              and(
                eq(meetingSeries.managerId, user.id),
                eq(meetingSeries.reportId, targetUserId),
              ),
            )
            .limit(1);

          if (series.length === 0) {
            return { error: "forbidden" } as const;
          }
        }

        // Parse period
        const url = new URL(request.url);
        const period = url.searchParams.get("period") ?? "3mo";
        const customStart = url.searchParams.get("startDate");
        const customEnd = url.searchParams.get("endDate");
        const compare = url.searchParams.get("compare");

        let startDate: string;
        let endDate: string;

        if (customStart && customEnd) {
          startDate = customStart;
          endDate = customEnd;
        } else {
          const range = periodToDateRange(period);
          startDate = range.startDate.toISOString().split("T")[0]!;
          endDate = range.endDate.toISOString().split("T")[0]!;
        }

        // Determine effective role for velocity/adherence queries
        // When viewing a specific user, use "member" role to scope to their data
        const effectiveRole = targetUserId === user.id ? user.role : "member";

        // Fetch analytics in parallel
        const [scoreTrend, categoryAverages, sessionList, velocity, adherence] = await Promise.all([
          getScoreTrend(tx, targetUserId, startDate, endDate),
          getCategoryAverages(tx, targetUserId, startDate, endDate),
          // Get completed sessions for comparison selector
          tx
            .select({
              id: sessions.id,
              date: sql<string>`to_char(${sessions.completedAt}, 'YYYY-MM-DD')`,
              number: sessions.sessionNumber,
            })
            .from(sessions)
            .where(
              and(
                eq(sessions.status, "completed"),
                sql`${sessions.seriesId} IN (
                  SELECT id FROM meeting_series WHERE report_id = ${targetUserId}
                )`,
              ),
            )
            .orderBy(sessions.completedAt),
          getActionItemVelocity(tx, targetUserId, effectiveRole, startDate, endDate),
          getMeetingAdherence(tx, targetUserId, effectiveRole, startDate, endDate),
        ]);

        // Comparison data (optional)
        let comparison = null;
        if (compare) {
          const [id1, id2] = compare.split(",");
          if (id1 && id2) {
            comparison = await getSessionComparison(tx, id1, id2);
          }
        }

        return {
          scoreTrend,
          categoryAverages,
          sessions: sessionList.filter((s) => s.date !== null),
          comparison,
          velocity,
          adherence,
        };
      },
    );

    if ("error" in result && result.error === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[analytics/individual] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
