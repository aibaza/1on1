import { eq, sql, and, asc } from "drizzle-orm";
import type { TransactionClient } from "@/lib/db/tenant-context";
import { meetingSeries, sessions, users, sessionAnswers, templateQuestions, talkingPoints, questionnaireTemplates } from "@/lib/db/schema";

export interface SeriesCardData {
  id: string;
  managerId: string;
  cadence: string;
  defaultTemplateName?: string | null;
  status: string;
  nextSessionAt: string | null;
  preferredDay: string | null;
  preferredTime: string | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
  };
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
    scheduledAt: string | null;
    talkingPointCount: number;
  } | null;
  latestSummary: { blurb: string; sentiment: string } | null;
  assessmentHistory: number[];
  questionHistories: { questionText: string; scoreWeight: number; values: number[] }[];
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
    /** Home page mode: show only series where user is manager OR report */
    myOnly?: boolean;
  }
): Promise<SeriesCardData[]> {
  const conditions = [eq(meetingSeries.tenantId, tenantId)];

  if (options?.upcomingOnly) {
    conditions.push(
      eq(meetingSeries.status, "active"),
      sql`${meetingSeries.nextSessionAt} IS NOT NULL`
    );
  }

  if (options?.myOnly && options?.userId) {
    // Home page: always show only series where user is manager OR report
    conditions.push(
      sql`(${meetingSeries.managerId} = ${options.userId} OR ${meetingSeries.reportId} = ${options.userId})`
    );
  } else if (options?.role === "member" && options?.userId) {
    conditions.push(eq(meetingSeries.reportId, options.userId));
  } else if (options?.role === "manager" && options?.userId) {
    conditions.push(
      sql`(${meetingSeries.managerId} = ${options.userId} OR ${meetingSeries.reportId} = ${options.userId})`
    );
  }
  // admin sees all (when myOnly is not set)

  let query = tx
    .select({
      id: meetingSeries.id,
      managerId: meetingSeries.managerId,
      reportId: meetingSeries.reportId,
      cadence: meetingSeries.cadence,
      defaultTemplateId: meetingSeries.defaultTemplateId,
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

  // Fetch template names
  const templateIds = [...new Set(seriesList.map((s) => s.defaultTemplateId).filter(Boolean))] as string[];
  let templateNameMap = new Map<string, string>();
  if (templateIds.length > 0) {
    const templateRows = await tx
      .select({ id: questionnaireTemplates.id, name: questionnaireTemplates.name })
      .from(questionnaireTemplates)
      .where(sql`${questionnaireTemplates.id} IN ${templateIds}`);
    templateNameMap = new Map(templateRows.map((t) => [t.id, t.name]));
  }

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

  // Fetch manager info
  const managerIds = [...new Set(seriesList.map((s) => s.managerId))];
  const managerUsers = await tx
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(sql`${users.id} IN ${managerIds}`);
  const managerMap = new Map(managerUsers.map((u) => [u.id, u]));

  // Fetch latest session for each series
  const seriesIds = seriesList.map((s) => s.id);
  const latestSessions = await tx
    .select({
      id: sessions.id,
      seriesId: sessions.seriesId,
      status: sessions.status,
      sessionNumber: sessions.sessionNumber,
      sessionScore: sessions.sessionScore,
      scheduledAt: sessions.scheduledAt,
    })
    .from(sessions)
    .where(
      sql`${sessions.seriesId} IN ${seriesIds} AND ${sessions.sessionNumber} = (
        SELECT MAX(s2.session_number) FROM "session" s2 WHERE s2.series_id = ${sessions.seriesId}
      )`
    );

  // Auto-revert stale in_progress sessions with 0 answers (started > 1 hour ago)
  const staleThreshold = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const staleSessions = latestSessions.filter(
    (s) => s.status === "in_progress" && s.scheduledAt && s.scheduledAt.toISOString() < staleThreshold
  );
  for (const stale of staleSessions) {
    const [{ count }] = await tx
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(sessionAnswers)
      .where(eq(sessionAnswers.sessionId, stale.id));
    if (count === 0) {
      await tx
        .update(sessions)
        .set({ status: "scheduled", startedAt: null })
        .where(eq(sessions.id, stale.id));
      stale.status = "scheduled";
    }
  }

  const latestMap = new Map(latestSessions.map((s) => [s.seriesId, s]));

  // Fetch talking point counts for active (scheduled or in_progress) sessions
  const scheduledSessionIds = latestSessions
    .filter((s) => s.status === "scheduled" || s.status === "in_progress")
    .map((s) => s.id);

  const talkingPointCountMap = new Map<string, number>();
  if (scheduledSessionIds.length > 0) {
    const counts = await tx
      .select({
        sessionId: talkingPoints.sessionId,
        count: sql<number>`count(*)::int`,
      })
      .from(talkingPoints)
      .where(sql`${talkingPoints.sessionId} IN ${scheduledSessionIds}`)
      .groupBy(talkingPoints.sessionId);
    for (const c of counts) {
      talkingPointCountMap.set(c.sessionId, c.count);
    }
  }

  // Fetch score history and latest aiSummary (completed sessions ordered by session number)
  const scoreRows = await tx
    .select({
      seriesId: sessions.seriesId,
      aiAssessmentScore: sessions.aiAssessmentScore,
      aiSummary: sessions.aiSummary,
    })
    .from(sessions)
    .where(
      and(
        sql`${sessions.seriesId} IN ${seriesIds}`,
        eq(sessions.status, "completed"),
        sql`${sessions.aiAssessmentScore} IS NOT NULL`
      )
    )
    .orderBy(asc(sessions.sessionNumber));

  const assessmentHistoryMap = new Map<string, number[]>();
  const latestSummaryMap = new Map<string, { blurb: string; sentiment: string }>();
  for (const r of scoreRows) {
    const arr = assessmentHistoryMap.get(r.seriesId) ?? [];
    arr.push(r.aiAssessmentScore!);
    assessmentHistoryMap.set(r.seriesId, arr);
    if (r.aiSummary?.cardBlurb) {
      latestSummaryMap.set(r.seriesId, {
        blurb: r.aiSummary.cardBlurb,
        sentiment: r.aiSummary.overallSentiment,
      });
    }
  }

  // Fetch per-question numeric answer histories for weighted questions
  const questionRows = await tx
    .select({
      seriesId: sessions.seriesId,
      sessionNumber: sessions.sessionNumber,
      questionText: templateQuestions.questionText,
      scoreWeight: templateQuestions.scoreWeight,
      answerType: templateQuestions.answerType,
      answerNumeric: sessionAnswers.answerNumeric,
    })
    .from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(templateQuestions, eq(sessionAnswers.questionId, templateQuestions.id))
    .where(
      and(
        sql`${sessions.seriesId} IN ${seriesIds}`,
        eq(sessions.status, "completed"),
        sql`CAST(${templateQuestions.scoreWeight} AS numeric) > 0.5`,
        sql`${templateQuestions.answerType} IN ('rating_1_5', 'rating_1_10', 'mood')`,
        sql`${sessionAnswers.answerNumeric} IS NOT NULL`
      )
    )
    .orderBy(asc(sessions.sessionNumber));

  // Map: seriesId -> questionText -> { scoreWeight, values[] }
  const questionHistoriesMap = new Map<string, Map<string, { scoreWeight: number; values: number[] }>>();
  for (const r of questionRows) {
    let qMap = questionHistoriesMap.get(r.seriesId);
    if (!qMap) {
      qMap = new Map();
      questionHistoriesMap.set(r.seriesId, qMap);
    }
    let entry = qMap.get(r.questionText);
    if (!entry) {
      entry = { scoreWeight: parseFloat(r.scoreWeight ?? "1"), values: [] };
      qMap.set(r.questionText, entry);
    }
    const raw = parseFloat(r.answerNumeric!);
    const scaled = r.answerType === "rating_1_10" ? raw * 10 : raw * 20;
    entry.values.push(Math.min(100, scaled));
  }

  return seriesList.map((s) => {
    const report = reportMap.get(s.reportId);
    const latest = latestMap.get(s.id);
    const qMap = questionHistoriesMap.get(s.id);
    const questionHistories = qMap
      ? Array.from(qMap.entries()).map(([questionText, { scoreWeight, values }]) => ({
          questionText,
          scoreWeight,
          values,
        }))
      : [];
    return {
      id: s.id,
      managerId: s.managerId,
      cadence: s.cadence,
      defaultTemplateName: s.defaultTemplateId ? templateNameMap.get(s.defaultTemplateId) ?? null : null,
      status: s.status,
      nextSessionAt: s.nextSessionAt?.toISOString() ?? null,
      preferredDay: s.preferredDay,
      preferredTime: s.preferredTime,
      manager: {
        id: s.managerId,
        firstName: managerMap.get(s.managerId)?.firstName ?? "",
        lastName: managerMap.get(s.managerId)?.lastName ?? "",
      },
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
            scheduledAt: latest.scheduledAt?.toISOString() ?? null,
            talkingPointCount: talkingPointCountMap.get(latest.id) ?? 0,
          }
        : null,
      latestSummary: latestSummaryMap.get(s.id) ?? null,
      assessmentHistory: assessmentHistoryMap.get(s.id) ?? [],
      questionHistories,
    };
  });
}
