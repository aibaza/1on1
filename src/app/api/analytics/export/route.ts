import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import {
  sessions,
  meetingSeries,
  users,
  questionnaireTemplates,
  actionItems,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { generateCSV, sessionDataToRows } from "@/lib/analytics/csv";
import { periodToDateRange } from "@/components/analytics/period-selector";
import {
  getScoreTrend,
  getCategoryAverages,
  getActionItemVelocity,
  getMeetingAdherence,
} from "@/lib/analytics/queries";

/**
 * GET /api/analytics/export
 *
 * Exports analytics data as CSV.
 * Query params:
 *   - type: "full" | "score-trend" | "categories" | "velocity" | "adherence"
 *   - userId (optional): for individual exports
 *   - period: preset string (30d, 3mo, 6mo, 1yr)
 *   - startDate, endDate: ISO date strings for custom range
 *
 * RBAC:
 *   - Members: own data only
 *   - Managers: their reports' data
 *   - Admins: org-wide
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Not authenticated", { status: 401 });
  }

  const { user } = session;
  const url = new URL(request.url);
  const exportType = url.searchParams.get("type") ?? "full";
  const targetUserId = url.searchParams.get("userId");
  const periodPreset = url.searchParams.get("period") ?? "3mo";
  const customStart = url.searchParams.get("startDate");
  const customEnd = url.searchParams.get("endDate");

  // Parse date range
  let startDate: string;
  let endDate: string;
  if (customStart && customEnd) {
    startDate = customStart;
    endDate = customEnd;
  } else {
    const range = periodToDateRange(periodPreset);
    startDate = range.startDate.toISOString().split("T")[0]!;
    endDate = range.endDate.toISOString().split("T")[0]!;
  }

  try {
    const result = await withTenantContext(
      user.tenantId,
      user.id,
      async (tx) => {
        // RBAC: determine effective user for filtering
        const effectiveUserId = targetUserId ?? user.id;

        // Members can only export their own data
        if (user.role === "member" && effectiveUserId !== user.id) {
          return { error: "forbidden" } as const;
        }

        // Managers can only export data for their reports (or self)
        if (
          user.role === "manager" &&
          effectiveUserId !== user.id
        ) {
          const series = await tx
            .select({ id: meetingSeries.id })
            .from(meetingSeries)
            .where(
              and(
                eq(meetingSeries.managerId, user.id),
                eq(meetingSeries.reportId, effectiveUserId),
              ),
            )
            .limit(1);

          if (series.length === 0) {
            return { error: "forbidden" } as const;
          }
        }

        let csv: string;
        const role = user.role;

        switch (exportType) {
          case "score-trend": {
            const data = await getScoreTrend(
              tx,
              effectiveUserId,
              startDate,
              endDate,
            );
            csv = generateCSV(
              ["Date", "Score"],
              data.map((d) => [d.date, d.score.toFixed(2)]),
            );
            break;
          }

          case "categories": {
            const data = await getCategoryAverages(
              tx,
              effectiveUserId,
              startDate,
              endDate,
            );
            csv = generateCSV(
              ["Category", "Average Score", "Sample Count"],
              data.map((d) => [
                d.category,
                d.avgScore.toFixed(2),
                d.sampleCount,
              ]),
            );
            break;
          }

          case "velocity": {
            const data = await getActionItemVelocity(
              tx,
              effectiveUserId,
              role,
              startDate,
              endDate,
            );
            csv = generateCSV(
              ["Month", "Avg Days to Complete", "Items Completed"],
              data.map((d) => [d.month, d.avgDays, d.count]),
            );
            break;
          }

          case "adherence": {
            const data = await getMeetingAdherence(
              tx,
              effectiveUserId,
              role,
              startDate,
              endDate,
            );
            csv = generateCSV(
              [
                "Month",
                "Completed",
                "Cancelled",
                "Missed",
                "Total",
                "Adherence %",
              ],
              data.map((d) => [
                d.month,
                d.completed,
                d.cancelled,
                d.missed,
                d.total,
                d.adherencePercent,
              ]),
            );
            break;
          }

          case "full":
          default: {
            // Full session data export
            const managers = alias(users, "managers");
            const reports = alias(users, "reports");

            const sessionRows = await tx
              .select({
                date: sql<string>`to_char(${sessions.completedAt}, 'YYYY-MM-DD')`,
                reportFirstName: reports.firstName,
                reportLastName: reports.lastName,
                managerFirstName: managers.firstName,
                managerLastName: managers.lastName,
                templateName: questionnaireTemplates.name,
                score: sessions.sessionScore,
                durationMinutes: sessions.durationMinutes,
                status: sessions.status,
                aiSummary: sessions.aiSummary,
              })
              .from(sessions)
              .innerJoin(
                meetingSeries,
                eq(sessions.seriesId, meetingSeries.id),
              )
              .innerJoin(reports, eq(meetingSeries.reportId, reports.id))
              .innerJoin(managers, eq(meetingSeries.managerId, managers.id))
              .leftJoin(
                questionnaireTemplates,
                eq(sessions.templateId, questionnaireTemplates.id),
              )
              .where(
                and(
                  sql`${sessions.status} IN ('completed', 'cancelled', 'missed')`,
                  sql`${sessions.scheduledAt} >= ${startDate}::date`,
                  sql`${sessions.scheduledAt} <= ${endDate}::date + interval '1 day'`,
                  // Role-based filter
                  role === "admin"
                    ? sql`1=1`
                    : role === "manager"
                      ? eq(meetingSeries.managerId, user.id)
                      : eq(meetingSeries.reportId, user.id),
                ),
              )
              .orderBy(sessions.scheduledAt);

            // Count action items per session in separate query for simplicity
            const actionCounts = await tx
              .select({
                sessionId: actionItems.sessionId,
                total: sql<number>`COUNT(*)::int`,
                completed:
                  sql<number>`COUNT(*) FILTER (WHERE ${actionItems.status} = 'completed')::int`,
              })
              .from(actionItems)
              .groupBy(actionItems.sessionId);

            const actionMap = new Map(
              actionCounts.map((a) => [
                a.sessionId,
                { total: a.total, completed: a.completed },
              ]),
            );

            const formatted = sessionRows.map((s) => ({
              date: s.date,
              reportName: `${s.reportFirstName} ${s.reportLastName}`,
              managerName: `${s.managerFirstName} ${s.managerLastName}`,
              templateName: s.templateName,
              score: s.score,
              durationMinutes: s.durationMinutes,
              status: s.status,
              actionItemsCreated: 0,
              actionItemsCompleted: 0,
              aiSummary:
                s.aiSummary && typeof s.aiSummary === "object" && "keyTakeaways" in s.aiSummary
                  ? (s.aiSummary.keyTakeaways as string[]).join("; ")
                  : null,
            }));

            const { headers, rows } = sessionDataToRows(formatted);
            csv = generateCSV(headers, rows);
            break;
          }
        }

        return { csv };
      },
    );

    if ("error" in result && result.error === "forbidden") {
      return new Response("Forbidden", { status: 403 });
    }

    if ("csv" in result) {
      const dateStr = new Date().toISOString().split("T")[0];
      return new Response(result.csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="1on1-analytics-${exportType}-${dateStr}.csv"`,
        },
      });
    }

    return new Response("Internal error", { status: 500 });
  } catch (error) {
    console.error("[analytics/export] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
