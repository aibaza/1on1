import { eq, sql, and, asc } from "drizzle-orm";
import type { TransactionClient } from "@/lib/db/tenant-context";
import { meetingSeries, sessions, users } from "@/lib/db/schema";

export interface SeriesCardData {
  id: string;
  managerId: string;
  cadence: string;
  status: string;
  nextSessionAt: string | null;
  preferredDay: string | null;
  preferredTime: string | null;
  report: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  latestSession: {
    id: string;
    status: string;
    sessionNumber: number;
    sessionScore: string | null;
  } | null;
  latestSummary: { blurb: string; sentiment: string } | null;
  scoreHistory: number[];
}

/**
 * Fetch series with report info, latest session, and top nudge.
 * Used by both the sessions page and dashboard upcoming section.
 */
export async function getSeriesCardData(
  tx: TransactionClient,
  tenantId: string,
  options?: {
    /** Only include active series with a scheduled next session */
    upcomingOnly?: boolean;
    /** Limit number of results */
    limit?: number;
    /** Filter by manager ID */
    managerId?: string;
    /** Filter by role — 'member' shows series where user is reportId */
    role?: string;
    userId?: string;
  }
): Promise<SeriesCardData[]> {
  const conditions = [eq(meetingSeries.tenantId, tenantId)];

  if (options?.upcomingOnly) {
    conditions.push(
      eq(meetingSeries.status, "active"),
      sql`${meetingSeries.nextSessionAt} IS NOT NULL`
    );
  }

  if (options?.role === "member" && options?.userId) {
    conditions.push(eq(meetingSeries.reportId, options.userId));
  } else if (options?.role === "manager" && options?.userId) {
    conditions.push(eq(meetingSeries.managerId, options.userId));
  }
  // admin sees all

  let query = tx
    .select({
      id: meetingSeries.id,
      managerId: meetingSeries.managerId,
      reportId: meetingSeries.reportId,
      cadence: meetingSeries.cadence,
      status: meetingSeries.status,
      nextSessionAt: meetingSeries.nextSessionAt,
      preferredDay: meetingSeries.preferredDay,
      preferredTime: meetingSeries.preferredTime,
    })
    .from(meetingSeries)
    .innerJoin(users, eq(meetingSeries.reportId, users.id))
    .where(and(...conditions))
    .orderBy(
      sql`CASE WHEN ${meetingSeries.nextSessionAt} IS NULL THEN 1 ELSE 0 END`,
      meetingSeries.nextSessionAt
    )
    .$dynamic();

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const seriesList = await query;

  if (seriesList.length === 0) return [];

  // Fetch report info
  const reportIds = [...new Set(seriesList.map((s) => s.reportId))];
  const reportUsers = await tx
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(sql`${users.id} IN ${reportIds}`);

  const reportMap = new Map(reportUsers.map((u) => [u.id, u]));

  // Fetch latest session for each series
  const seriesIds = seriesList.map((s) => s.id);
  const latestSessions = await tx
    .select({
      id: sessions.id,
      seriesId: sessions.seriesId,
      status: sessions.status,
      sessionNumber: sessions.sessionNumber,
      sessionScore: sessions.sessionScore,
    })
    .from(sessions)
    .where(
      sql`${sessions.seriesId} IN ${seriesIds} AND ${sessions.sessionNumber} = (
        SELECT MAX(s2.session_number) FROM "session" s2 WHERE s2.series_id = ${sessions.seriesId}
      )`
    );

  const latestMap = new Map(latestSessions.map((s) => [s.seriesId, s]));

  // Fetch score history and latest aiSummary (completed sessions ordered by session number)
  const scoreRows = await tx
    .select({
      seriesId: sessions.seriesId,
      sessionScore: sessions.sessionScore,
      aiSummary: sessions.aiSummary,
    })
    .from(sessions)
    .where(
      and(
        sql`${sessions.seriesId} IN ${seriesIds}`,
        eq(sessions.status, "completed"),
        sql`${sessions.sessionScore} IS NOT NULL`
      )
    )
    .orderBy(asc(sessions.sessionNumber));

  const scoreHistoryMap = new Map<string, number[]>();
  const latestSummaryMap = new Map<string, { blurb: string; sentiment: string }>();
  for (const r of scoreRows) {
    const arr = scoreHistoryMap.get(r.seriesId) ?? [];
    arr.push(parseFloat(r.sessionScore!));
    scoreHistoryMap.set(r.seriesId, arr);
    if (r.aiSummary?.cardBlurb) {
      latestSummaryMap.set(r.seriesId, {
        blurb: r.aiSummary.cardBlurb,
        sentiment: r.aiSummary.overallSentiment,
      });
    }
  }

  return seriesList.map((s) => {
    const report = reportMap.get(s.reportId);
    const latest = latestMap.get(s.id);
    return {
      id: s.id,
      managerId: s.managerId,
      cadence: s.cadence,
      status: s.status,
      nextSessionAt: s.nextSessionAt?.toISOString() ?? null,
      preferredDay: s.preferredDay,
      preferredTime: s.preferredTime,
      report: {
        id: s.reportId,
        firstName: report?.firstName ?? "",
        lastName: report?.lastName ?? "",
        avatarUrl: report?.avatarUrl ?? null,
      },
      latestSession: latest
        ? {
            id: latest.id,
            status: latest.status,
            sessionNumber: latest.sessionNumber,
            sessionScore: latest.sessionScore,
          }
        : null,
      latestSummary: latestSummaryMap.get(s.id) ?? null,
      scoreHistory: scoreHistoryMap.get(s.id) ?? [],
    };
  });
}
