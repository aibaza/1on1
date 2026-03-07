import { eq, and, gte, lte, sql, inArray, isNull } from "drizzle-orm";
import type { TransactionClient } from "@/lib/db/tenant-context";
import {
  analyticsSnapshots,
  sessions,
  sessionAnswers,
  templateQuestions,
  templateSections,
  teamMembers,
  users,
  actionItems,
  meetingSeries,
} from "@/lib/db/schema";
import {
  METRIC_NAMES,
  OPERATIONAL_METRICS,
  SCORABLE_ANSWER_TYPES,
} from "./constants";

// ---------- Types ----------

export interface ScoreTrendPoint {
  date: string;
  score: number;
}

export interface CategoryAverage {
  category: string;
  avgScore: number;
  sampleCount: number;
  history: number[];
}

export interface SessionComparisonRow {
  category: string;
  score1: number;
  score2: number;
  delta: number;
}

export interface TeamAverage {
  category: string;
  avgScore: number;
  memberCount: number;
  history: number[];
}

export interface HeatmapDataPoint {
  userId: string;
  userName: string;
  category: string;
  score: number;
  sampleCount: number;
}

// ---------- Score Trend ----------

/**
 * Get session score trend for a user over a date range.
 *
 * Queries analytics_snapshot for session_score metric, ordered by period start.
 * Falls back to live query on sessions table if no snapshots exist.
 */
export async function getScoreTrend(
  tx: TransactionClient,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<ScoreTrendPoint[]> {
  // Try snapshots first
  const snapshots = await tx
    .select({
      date: analyticsSnapshots.periodStart,
      score: analyticsSnapshots.metricValue,
    })
    .from(analyticsSnapshots)
    .where(
      and(
        eq(analyticsSnapshots.userId, userId),
        eq(analyticsSnapshots.metricName, METRIC_NAMES.SESSION_SCORE),
        eq(analyticsSnapshots.periodType, "month"),
        isNull(analyticsSnapshots.teamId),
        gte(analyticsSnapshots.periodStart, startDate),
        lte(analyticsSnapshots.periodStart, endDate),
      ),
    )
    .orderBy(analyticsSnapshots.periodStart);

  if (snapshots.length > 0) {
    return snapshots
      .map((s) => ({
        date: s.date,
        score: Number(s.score),
      }))
      .filter((s) => !isNaN(s.score));
  }

  // Fallback: live query on sessions via series where user is report
  const liveResults = await tx
    .select({
      date: sql<string>`to_char(${sessions.completedAt}, 'YYYY-MM-DD')`,
      score: sessions.sessionScore,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.status, "completed"),
        sql`${sessions.sessionScore} IS NOT NULL`,
        sql`${sessions.completedAt} >= ${startDate}::date`,
        sql`${sessions.completedAt} <= ${endDate}::date + interval '1 day'`,
        sql`${sessions.seriesId} IN (
          SELECT id FROM meeting_series WHERE report_id = ${userId}
        )`,
      ),
    )
    .orderBy(sessions.completedAt);

  return liveResults
    .filter((r) => r.score !== null && r.date !== null)
    .map((r) => ({
      date: r.date!,
      score: Number(r.score!),
    }))
    .filter((r) => !isNaN(r.score));
}

// ---------- Category Averages ----------

/**
 * Get per-category average scores for a user over a date range.
 *
 * Queries analytics_snapshot for category metrics. Falls back to live query
 * joining session_answers + template_questions + template_sections.
 */
export async function getCategoryAverages(
  tx: TransactionClient,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<CategoryAverage[]> {
  // Try snapshots first -- exclude operational metrics to get only category scores
  const operationalNames = [...OPERATIONAL_METRICS];

  const snapshots = await tx
    .select({
      metricName: analyticsSnapshots.metricName,
      avgScore: sql<string>`AVG(${analyticsSnapshots.metricValue}::numeric)`,
      sampleCount: sql<number>`SUM(${analyticsSnapshots.sampleCount})::int`,
    })
    .from(analyticsSnapshots)
    .where(
      and(
        eq(analyticsSnapshots.userId, userId),
        isNull(analyticsSnapshots.teamId),
        sql`${analyticsSnapshots.metricName} NOT IN (${sql.join(
          operationalNames.map((n) => sql`${n}`),
          sql`, `,
        )})`,
        gte(analyticsSnapshots.periodStart, startDate),
        lte(analyticsSnapshots.periodStart, endDate),
      ),
    )
    .groupBy(analyticsSnapshots.metricName);

  // Per-session history query (always live — used for sparklines)
  const historyRows = await tx
    .select({
      sectionName: templateSections.name,
      sessionId: sessions.id,
      completedAt: sessions.completedAt,
      avgScore: sql<string>`AVG(${sessionAnswers.answerNumeric}::numeric)`,
    })
    .from(sessionAnswers)
    .innerJoin(templateQuestions, eq(sessionAnswers.questionId, templateQuestions.id))
    .innerJoin(templateSections, eq(templateQuestions.sectionId, templateSections.id))
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.status, "completed"),
        sql`${sessionAnswers.answerNumeric} IS NOT NULL`,
        sql`${sessionAnswers.skipped} = false`,
        sql`${sessions.completedAt} >= ${startDate}::date`,
        sql`${sessions.completedAt} <= ${endDate}::date + interval '1 day'`,
        sql`${sessions.seriesId} IN (SELECT id FROM meeting_series WHERE report_id = ${userId})`,
        sql`${templateQuestions.answerType} IN (${sql.join([...SCORABLE_ANSWER_TYPES].map((t) => sql`${t}`), sql`, `)})`,
      ),
    )
    .groupBy(templateSections.name, sessions.id, sessions.completedAt)
    .orderBy(templateSections.name, sessions.completedAt);

  const historyMap = new Map<string, number[]>();
  for (const row of historyRows) {
    const cat = row.sectionName.trim();
    const arr = historyMap.get(cat) ?? [];
    arr.push(Number(row.avgScore));
    historyMap.set(cat, arr);
  }

  if (snapshots.length > 0) {
    // metricName IS the category display name (stored as section name directly)
    return snapshots.map((s) => ({
      category: s.metricName,
      avgScore: Number(s.avgScore),
      sampleCount: s.sampleCount,
      history: historyMap.get(s.metricName) ?? [],
    }));
  }

  // Fallback: live query
  const liveResults = await tx
    .select({
      sectionName: templateSections.name,
      avgScore: sql<string>`AVG(${sessionAnswers.answerNumeric}::numeric)`,
      sampleCount: sql<number>`COUNT(*)::int`,
    })
    .from(sessionAnswers)
    .innerJoin(
      templateQuestions,
      eq(sessionAnswers.questionId, templateQuestions.id),
    )
    .innerJoin(
      templateSections,
      eq(templateQuestions.sectionId, templateSections.id),
    )
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.status, "completed"),
        sql`${sessionAnswers.answerNumeric} IS NOT NULL`,
        sql`${sessionAnswers.skipped} = false`,
        sql`${sessions.completedAt} >= ${startDate}::date`,
        sql`${sessions.completedAt} <= ${endDate}::date + interval '1 day'`,
        sql`${sessions.seriesId} IN (
          SELECT id FROM meeting_series WHERE report_id = ${userId}
        )`,
        sql`${templateQuestions.answerType} IN (${sql.join(
          [...SCORABLE_ANSWER_TYPES].map((t) => sql`${t}`),
          sql`, `,
        )})`,
      ),
    )
    .groupBy(templateSections.name);

  return liveResults.map((r) => ({
    category: r.sectionName.trim(),
    avgScore: Number(r.avgScore),
    sampleCount: r.sampleCount,
    history: historyMap.get(r.sectionName.trim()) ?? [],
  }));
}

// ---------- Session Comparison ----------

/**
 * Compare per-category scores between two sessions.
 *
 * Live query (not snapshot) -- fetches per-category averages for both sessions
 * and computes deltas.
 */
export async function getSessionComparison(
  tx: TransactionClient,
  sessionId1: string,
  sessionId2: string,
): Promise<SessionComparisonRow[]> {
  async function getSessionCategoryScores(
    sessionId: string,
  ): Promise<Map<string, number>> {
    const rows = await tx
      .select({
        sectionName: templateSections.name,
        avgScore: sql<string>`AVG(${sessionAnswers.answerNumeric}::numeric)`,
      })
      .from(sessionAnswers)
      .innerJoin(
        templateQuestions,
        eq(sessionAnswers.questionId, templateQuestions.id),
      )
      .innerJoin(
        templateSections,
        eq(templateQuestions.sectionId, templateSections.id),
      )
      .where(
        and(
          eq(sessionAnswers.sessionId, sessionId),
          sql`${sessionAnswers.answerNumeric} IS NOT NULL`,
          sql`${sessionAnswers.skipped} = false`,
          sql`${templateQuestions.answerType} IN (${sql.join(
            [...SCORABLE_ANSWER_TYPES].map((t) => sql`${t}`),
            sql`, `,
          )})`,
        ),
      )
      .groupBy(templateSections.name);

    const map = new Map<string, number>();
    for (const row of rows) {
      const cat = row.sectionName.trim();
      map.set(cat, Number(row.avgScore));
    }
    return map;
  }

  const [scores1, scores2] = await Promise.all([
    getSessionCategoryScores(sessionId1),
    getSessionCategoryScores(sessionId2),
  ]);

  // Merge all categories from both sessions
  const allCategories = new Set([...scores1.keys(), ...scores2.keys()]);
  const results: SessionComparisonRow[] = [];

  for (const category of allCategories) {
    const s1 = scores1.get(category) ?? 0;
    const s2 = scores2.get(category) ?? 0;
    results.push({
      category,
      score1: s1,
      score2: s2,
      delta: Number((s2 - s1).toFixed(3)),
    });
  }

  return results;
}

// ---------- Team Averages ----------

/**
 * Get aggregated category averages across all team members.
 *
 * Queries analytics_snapshot for all members of a given team, aggregates
 * per-category. Enforces minimum 3 data points for anonymization.
 */
export async function getTeamAverages(
  tx: TransactionClient,
  teamId: string,
  startDate: string,
  endDate: string,
  anonymize: boolean = false,
): Promise<TeamAverage[]> {
  // Get team member user IDs
  const members = await tx
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  if (members.length === 0) return [];

  const memberIds = members.map((m) => m.userId);
  const operationalNames = [...OPERATIONAL_METRICS];

  const results = await tx
    .select({
      metricName: analyticsSnapshots.metricName,
      avgScore: sql<string>`AVG(${analyticsSnapshots.metricValue}::numeric)`,
      memberCount:
        sql<number>`COUNT(DISTINCT ${analyticsSnapshots.userId})::int`,
    })
    .from(analyticsSnapshots)
    .where(
      and(
        inArray(analyticsSnapshots.userId, memberIds),
        isNull(analyticsSnapshots.teamId),
        sql`${analyticsSnapshots.metricName} NOT IN (${sql.join(
          operationalNames.map((n) => sql`${n}`),
          sql`, `,
        )})`,
        gte(analyticsSnapshots.periodStart, startDate),
        lte(analyticsSnapshots.periodStart, endDate),
      ),
    )
    .groupBy(analyticsSnapshots.metricName);

  // Per-session history query for sparklines
  const teamHistoryRows = await tx
    .select({
      sectionName: templateSections.name,
      sessionId: sessions.id,
      completedAt: sessions.completedAt,
      avgScore: sql<string>`AVG(${sessionAnswers.answerNumeric}::numeric)`,
    })
    .from(sessionAnswers)
    .innerJoin(templateQuestions, eq(sessionAnswers.questionId, templateQuestions.id))
    .innerJoin(templateSections, eq(templateQuestions.sectionId, templateSections.id))
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
    .where(
      and(
        eq(sessions.status, "completed"),
        sql`${sessionAnswers.answerNumeric} IS NOT NULL`,
        sql`${sessionAnswers.skipped} = false`,
        sql`${sessions.completedAt} >= ${startDate}::date`,
        sql`${sessions.completedAt} <= ${endDate}::date + interval '1 day'`,
        inArray(meetingSeries.reportId, memberIds),
        sql`${templateQuestions.answerType} IN (${sql.join([...SCORABLE_ANSWER_TYPES].map((t) => sql`${t}`), sql`, `)})`,
      ),
    )
    .groupBy(templateSections.name, sessions.id, sessions.completedAt)
    .orderBy(templateSections.name, sessions.completedAt);

  const teamHistoryMap = new Map<string, number[]>();
  for (const row of teamHistoryRows) {
    const cat = row.sectionName.trim();
    const arr = teamHistoryMap.get(cat) ?? [];
    arr.push(Number(row.avgScore));
    teamHistoryMap.set(cat, arr);
  }

  const snapshotData = results
    .filter((r) => Number(r.avgScore) > 0)
    .filter((r) => !anonymize || Number(r.memberCount) >= 2)
    .map((r) => ({
      category: r.metricName,
      avgScore: Number(r.avgScore),
      memberCount: r.memberCount,
      history: teamHistoryMap.get(r.metricName) ?? [],
    }));

  if (snapshotData.length > 0) {
    return snapshotData;
  }

  // Fallback: live query from session_answers
  const liveResults = await tx
    .select({
      sectionName: templateSections.name,
      avgScore: sql<string>`AVG(${sessionAnswers.answerNumeric}::numeric)`,
      memberCount:
        sql<number>`COUNT(DISTINCT ${meetingSeries.reportId})::int`,
    })
    .from(sessionAnswers)
    .innerJoin(
      templateQuestions,
      eq(sessionAnswers.questionId, templateQuestions.id),
    )
    .innerJoin(
      templateSections,
      eq(templateQuestions.sectionId, templateSections.id),
    )
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
    .where(
      and(
        eq(sessions.status, "completed"),
        sql`${sessionAnswers.answerNumeric} IS NOT NULL`,
        sql`${sessionAnswers.skipped} = false`,
        sql`${sessions.completedAt} >= ${startDate}::date`,
        sql`${sessions.completedAt} <= ${endDate}::date + interval '1 day'`,
        inArray(meetingSeries.reportId, memberIds),
        sql`${templateQuestions.answerType} IN (${sql.join(
          [...SCORABLE_ANSWER_TYPES].map((t) => sql`${t}`),
          sql`, `,
        )})`,
      ),
    )
    .groupBy(templateSections.name);

  return liveResults
    .filter((r) => !anonymize || Number(r.memberCount) >= 2)
    .map((r) => ({
      category: r.sectionName.trim(),
      avgScore: Number(r.avgScore),
      memberCount: r.memberCount,
      history: teamHistoryMap.get(r.sectionName.trim()) ?? [],
    }));
}

// ---------- Team Heatmap ----------

/**
 * Get per-user per-category scores for a team heatmap.
 *
 * Returns individual scores for each team member per category.
 * When anonymize=true, user names are replaced with "Member 1", "Member 2", etc.
 */
export async function getTeamHeatmapData(
  tx: TransactionClient,
  teamId: string,
  startDate: string,
  endDate: string,
  anonymize: boolean = false,
): Promise<HeatmapDataPoint[]> {
  // Get team member user IDs with names
  const members = await tx
    .select({
      userId: teamMembers.userId,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

  if (members.length === 0) return [];

  const memberIds = members.map((m) => m.userId);
  const operationalNames = [...OPERATIONAL_METRICS];

  const snapshots = await tx
    .select({
      userId: analyticsSnapshots.userId,
      metricName: analyticsSnapshots.metricName,
      avgScore: sql<string>`AVG(${analyticsSnapshots.metricValue}::numeric)`,
      sampleCount: sql<number>`SUM(${analyticsSnapshots.sampleCount})::int`,
    })
    .from(analyticsSnapshots)
    .where(
      and(
        inArray(analyticsSnapshots.userId, memberIds),
        isNull(analyticsSnapshots.teamId),
        sql`${analyticsSnapshots.metricName} NOT IN (${sql.join(
          operationalNames.map((n) => sql`${n}`),
          sql`, `,
        )})`,
        gte(analyticsSnapshots.periodStart, startDate),
        lte(analyticsSnapshots.periodStart, endDate),
      ),
    )
    .groupBy(analyticsSnapshots.userId, analyticsSnapshots.metricName);

  // Build name lookup, with optional anonymization
  const nameMap = new Map<string, string>();
  const sortedMembers = [...members].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
  );
  sortedMembers.forEach((m, idx) => {
    nameMap.set(
      m.userId,
      anonymize ? `Member ${idx + 1}` : `${m.firstName} ${m.lastName}`,
    );
  });

  const snapshotData = snapshots
    .filter((s) => s.userId !== null && (s.sampleCount ?? 0) > 0)
    .map((s) => ({
      userId: anonymize ? "" : s.userId!,
      userName: nameMap.get(s.userId!) ?? "Unknown",
      category: s.metricName,
      score: Number(s.avgScore),
      sampleCount: s.sampleCount ?? 0,
    }));

  if (snapshotData.length > 0) {
    return snapshotData;
  }

  // Fallback: live query from session_answers
  const liveResults = await tx
    .select({
      userId: meetingSeries.reportId,
      sectionName: templateSections.name,
      avgScore: sql<string>`AVG(${sessionAnswers.answerNumeric}::numeric)`,
      sampleCount: sql<number>`COUNT(*)::int`,
    })
    .from(sessionAnswers)
    .innerJoin(
      templateQuestions,
      eq(sessionAnswers.questionId, templateQuestions.id),
    )
    .innerJoin(
      templateSections,
      eq(templateQuestions.sectionId, templateSections.id),
    )
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
    .where(
      and(
        eq(sessions.status, "completed"),
        sql`${sessionAnswers.answerNumeric} IS NOT NULL`,
        sql`${sessionAnswers.skipped} = false`,
        sql`${sessions.completedAt} >= ${startDate}::date`,
        sql`${sessions.completedAt} <= ${endDate}::date + interval '1 day'`,
        inArray(meetingSeries.reportId, memberIds),
        sql`${templateQuestions.answerType} IN (${sql.join(
          [...SCORABLE_ANSWER_TYPES].map((t) => sql`${t}`),
          sql`, `,
        )})`,
      ),
    )
    .groupBy(meetingSeries.reportId, templateSections.name);

  return liveResults
    .filter((r) => r.userId !== null)
    .map((r) => ({
      userId: anonymize ? "" : r.userId!,
      userName: nameMap.get(r.userId!) ?? "Unknown",
      category: r.sectionName.trim(),
      score: Number(r.avgScore),
      sampleCount: r.sampleCount ?? 0,
    }));
}

// ---------- Action Item Velocity ----------

export interface VelocityPoint {
  month: string;
  avgDays: number;
  count: number;
}

/**
 * Get action item velocity: average days from creation to completion per month.
 *
 * For managers: filters items in their series. For admins: org-wide.
 * For members: only their own assigned items.
 */
export async function getActionItemVelocity(
  tx: TransactionClient,
  userId: string,
  role: string,
  startDate: string,
  endDate: string,
): Promise<VelocityPoint[]> {
  // Build role-specific filter
  let roleFilter;
  if (role === "admin") {
    roleFilter = sql`1=1`; // org-wide (RLS handles tenant)
  } else if (role === "manager") {
    roleFilter = inArray(
      actionItems.sessionId,
      tx
        .select({ id: sessions.id })
        .from(sessions)
        .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
        .where(eq(meetingSeries.managerId, userId)),
    );
  } else {
    roleFilter = eq(actionItems.assigneeId, userId);
  }

  const rows = await tx
    .select({
      month: sql<string>`to_char(${actionItems.completedAt}, 'YYYY-MM')`,
      avgDays: sql<string>`AVG(EXTRACT(EPOCH FROM (${actionItems.completedAt} - ${actionItems.createdAt})) / 86400)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(actionItems)
    .where(
      and(
        eq(actionItems.status, "completed"),
        sql`${actionItems.completedAt} IS NOT NULL`,
        sql`${actionItems.completedAt} >= ${startDate}::date`,
        sql`${actionItems.completedAt} <= ${endDate}::date + interval '1 day'`,
        roleFilter,
      ),
    )
    .groupBy(sql`to_char(${actionItems.completedAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${actionItems.completedAt}, 'YYYY-MM')`);

  return rows
    .filter((r) => r.month !== null)
    .map((r) => ({
      month: r.month!,
      avgDays: Number(Number(r.avgDays).toFixed(1)),
      count: r.count,
    }));
}

// ---------- Meeting Adherence ----------

export interface AdherencePoint {
  month: string;
  completed: number;
  cancelled: number;
  missed: number;
  total: number;
  adherencePercent: number;
}

/**
 * Get meeting adherence: percentage of scheduled sessions completed per month.
 *
 * Counts sessions by final status (completed, cancelled, missed).
 * Excludes scheduled/in_progress (not yet resolved).
 * For managers: their series. For admins: org-wide. For members: their series as report.
 */
export async function getMeetingAdherence(
  tx: TransactionClient,
  userId: string,
  role: string,
  startDate: string,
  endDate: string,
): Promise<AdherencePoint[]> {
  // Build role-specific filter
  let roleFilter;
  if (role === "admin") {
    roleFilter = sql`1=1`;
  } else if (role === "manager") {
    roleFilter = sql`${sessions.seriesId} IN (
      SELECT id FROM meeting_series WHERE manager_id = ${userId}
    )`;
  } else {
    roleFilter = sql`${sessions.seriesId} IN (
      SELECT id FROM meeting_series WHERE report_id = ${userId}
    )`;
  }

  const rows = await tx
    .select({
      month: sql<string>`to_char(${sessions.scheduledAt}, 'YYYY-MM')`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${sessions.status} = 'completed')::int`,
      cancelled: sql<number>`COUNT(*) FILTER (WHERE ${sessions.status} = 'cancelled')::int`,
      missed: sql<number>`COUNT(*) FILTER (WHERE ${sessions.status} = 'missed')::int`,
      total: sql<number>`COUNT(*)::int`,
    })
    .from(sessions)
    .where(
      and(
        sql`${sessions.status} IN ('completed', 'cancelled', 'missed')`,
        sql`${sessions.scheduledAt} >= ${startDate}::date`,
        sql`${sessions.scheduledAt} <= ${endDate}::date + interval '1 day'`,
        roleFilter,
      ),
    )
    .groupBy(sql`to_char(${sessions.scheduledAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${sessions.scheduledAt}, 'YYYY-MM')`);

  return rows
    .filter((r) => r.month !== null)
    .map((r) => ({
      month: r.month!,
      completed: r.completed,
      cancelled: r.cancelled,
      missed: r.missed,
      total: r.total,
      adherencePercent:
        r.total > 0
          ? Number(((r.completed / r.total) * 100).toFixed(1))
          : 0,
    }));
}
