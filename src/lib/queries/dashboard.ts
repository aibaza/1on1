import {
  eq,
  and,
  or,
  gte,
  lte,
  lt,
  sql,
  inArray,
  desc,
  asc,
  count,
  avg,
  countDistinct,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { TransactionClient } from "@/lib/db/tenant-context";
import {
  sessions,
  meetingSeries,
  users,
  actionItems,
  questionnaireTemplates,
} from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpcomingSession {
  sessionId: string;
  seriesId: string;
  reportName: string;
  scheduledAt: string;
  status: string;
  templateName: string | null;
  isToday: boolean;
  /** Present when there's an active in_progress session the user can resume */
  activeSessionId?: string;
}

export interface OverdueGroup {
  reportName: string;
  reportId: string;
  items: Array<{
    id: string;
    title: string;
    dueDate: string;
    daysOverdue: number;
  }>;
}

export interface QuickStats {
  totalReports: number;
  sessionsThisMonth: number;
  avgScore: number | null;
}

export interface StatsTrends {
  reportsHistory: number[];
  sessionsHistory: number[];
  scoresHistory: number[];
}

export interface RecentSession {
  id: string;
  seriesId: string;
  reportName: string;
  completedAt: string;
  sessionNumber: number;
  sessionScore: number | null;
  aiSummarySnippet: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfDay(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

function endOfDay(d: Date): Date {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

// ---------------------------------------------------------------------------
// 1. Upcoming Sessions (next 7 days)
// ---------------------------------------------------------------------------

export async function getUpcomingSessions(
  tx: TransactionClient,
  userId: string,
  role: string,
  tenantId: string
): Promise<UpcomingSession[]> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const reportUser = alias(users, "reportUser");
  const managerUser = alias(users, "managerUser");

  // Build role-specific WHERE conditions
  const roleFilter =
    role === "member"
      ? eq(meetingSeries.reportId, userId)
      : role === "admin"
        ? or(eq(meetingSeries.managerId, userId), eq(meetingSeries.reportId, userId))!
        : eq(meetingSeries.managerId, userId);

  // Query active series with a nextSessionAt, ordered by soonest, limit 3
  const seriesConditions = [
    eq(meetingSeries.tenantId, tenantId),
    eq(meetingSeries.status, "active"),
    sql`${meetingSeries.nextSessionAt} IS NOT NULL`,
    ...(roleFilter ? [roleFilter] : []),
  ];

  const rows = await tx
    .select({
      seriesId: meetingSeries.id,
      nextSessionAt: meetingSeries.nextSessionAt,
      templateId: meetingSeries.defaultTemplateId,
      reportFirstName: reportUser.firstName,
      reportLastName: reportUser.lastName,
      managerFirstName: managerUser.firstName,
      managerLastName: managerUser.lastName,
    })
    .from(meetingSeries)
    .innerJoin(reportUser, eq(meetingSeries.reportId, reportUser.id))
    .innerJoin(managerUser, eq(meetingSeries.managerId, managerUser.id))
    .where(and(...seriesConditions))
    .orderBy(asc(meetingSeries.nextSessionAt))
    .limit(3);

  if (rows.length === 0) return [];

  const seriesIds = rows.map((r) => r.seriesId);

  // Fetch in-progress sessions for these series
  const inProgressRows = await tx
    .select({
      id: sessions.id,
      seriesId: sessions.seriesId,
    })
    .from(sessions)
    .where(
      and(
        inArray(sessions.seriesId, seriesIds),
        eq(sessions.status, "in_progress")
      )
    );

  const inProgressBySeriesId = new Map(
    inProgressRows.map((r) => [r.seriesId, r.id])
  );

  // Fetch template names
  const templateIds = [
    ...new Set(rows.map((r) => r.templateId).filter(Boolean)),
  ] as string[];
  let templateMap = new Map<string, string>();
  if (templateIds.length > 0) {
    const tplRows = await tx
      .select({ id: questionnaireTemplates.id, name: questionnaireTemplates.name })
      .from(questionnaireTemplates)
      .where(inArray(questionnaireTemplates.id, templateIds));
    templateMap = new Map(tplRows.map((t) => [t.id, t.name]));
  }

  return rows.map((r) => {
    const scheduled = r.nextSessionAt!;
    const isToday = scheduled >= todayStart && scheduled <= todayEnd;
    const displayName =
      role === "member"
        ? `${r.managerFirstName} ${r.managerLastName}`
        : `${r.reportFirstName} ${r.reportLastName}`;
    const activeId = inProgressBySeriesId.get(r.seriesId);

    return {
      sessionId: r.seriesId,
      seriesId: r.seriesId,
      reportName: displayName,
      scheduledAt: scheduled.toISOString(),
      status: activeId ? "in_progress" : "scheduled",
      templateName: r.templateId ? (templateMap.get(r.templateId) ?? null) : null,
      isToday,
      ...(activeId ? { activeSessionId: activeId } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// 2. Overdue Action Items
// ---------------------------------------------------------------------------

export async function getOverdueActionItems(
  tx: TransactionClient,
  userId: string,
  role: string
): Promise<OverdueGroup[]> {
  const now = new Date();
  const reportUser = alias(users, "reportUser");

  // Show items where user is the assignee OR the manager of the series
  const conditions = [
    inArray(actionItems.status, ["open", "in_progress"]),
    lt(actionItems.dueDate, now.toISOString().slice(0, 10)),
    or(
      eq(actionItems.assigneeId, userId),
      eq(meetingSeries.managerId, userId)
    )!,
  ];

  const rows = await tx
    .select({
      id: actionItems.id,
      title: actionItems.title,
      dueDate: actionItems.dueDate,
      reportId: meetingSeries.reportId,
      reportFirstName: reportUser.firstName,
      reportLastName: reportUser.lastName,
    })
    .from(actionItems)
    .innerJoin(sessions, eq(actionItems.sessionId, sessions.id))
    .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
    .innerJoin(reportUser, eq(meetingSeries.reportId, reportUser.id))
    .where(and(...conditions))
    .orderBy(asc(actionItems.dueDate));

  // Group by report
  const groupMap = new Map<
    string,
    { reportName: string; reportId: string; items: OverdueGroup["items"] }
  >();

  for (const row of rows) {
    const reportName = `${row.reportFirstName} ${row.reportLastName}`;
    const reportId = row.reportId;
    const existing = groupMap.get(reportId) ?? {
      reportName,
      reportId,
      items: [],
    };

    const dueDate = row.dueDate!;
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    existing.items.push({
      id: row.id,
      title: row.title,
      dueDate,
      daysOverdue,
    });
    groupMap.set(reportId, existing);
  }

  return Array.from(groupMap.values());
}

// ---------------------------------------------------------------------------
// 3. Quick Stats
// ---------------------------------------------------------------------------

export async function getQuickStats(
  tx: TransactionClient,
  userId: string,
  role: string
): Promise<QuickStats> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Total reports
  const reportFilter =
    role === "member"
      ? eq(meetingSeries.reportId, userId)
      : role === "admin"
        ? or(eq(meetingSeries.managerId, userId), eq(meetingSeries.reportId, userId))!
        : eq(meetingSeries.managerId, userId);

  const reportConditions = [
    eq(meetingSeries.status, "active"),
    ...(reportFilter ? [reportFilter] : []),
  ];

  const [reportCountRow] = await tx
    .select({
      total: countDistinct(
        role === "member" ? meetingSeries.managerId : meetingSeries.reportId
      ),
    })
    .from(meetingSeries)
    .where(and(...reportConditions));

  // Sessions this month + average score
  const sessionRoleFilter =
    role === "member"
      ? eq(meetingSeries.reportId, userId)
      : role === "admin"
        ? or(eq(meetingSeries.managerId, userId), eq(meetingSeries.reportId, userId))!
        : eq(meetingSeries.managerId, userId);

  const sessionConditions = [
    eq(sessions.status, "completed"),
    gte(sessions.completedAt, monthStart),
    lte(sessions.completedAt, monthEnd),
    ...(sessionRoleFilter ? [sessionRoleFilter] : []),
  ];

  const [sessionStatsRow] = await tx
    .select({
      total: count(),
      avgScore: avg(sessions.sessionScore),
    })
    .from(sessions)
    .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
    .where(and(...sessionConditions));

  return {
    totalReports: Number(reportCountRow?.total ?? 0),
    sessionsThisMonth: Number(sessionStatsRow?.total ?? 0),
    avgScore: sessionStatsRow?.avgScore
      ? parseFloat(sessionStatsRow.avgScore)
      : null,
  };
}

// ---------------------------------------------------------------------------
// 3b. Stats Trends (last 6 months)
// ---------------------------------------------------------------------------

export async function getStatsTrends(
  tx: TransactionClient,
  userId: string,
  role: string
): Promise<StatsTrends> {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const roleFilter =
    role === "member"
      ? eq(meetingSeries.reportId, userId)
      : role === "admin"
        ? or(eq(meetingSeries.managerId, userId), eq(meetingSeries.reportId, userId))!
        : eq(meetingSeries.managerId, userId);

  // Monthly completed sessions + avg score
  const sessionConditions = [
    eq(sessions.status, "completed"),
    gte(sessions.completedAt, sixMonthsAgo),
    ...(roleFilter ? [roleFilter] : []),
  ];

  const monthlyStats = await tx
    .select({
      month: sql<string>`to_char(${sessions.completedAt}, 'YYYY-MM')`,
      sessionCount: count(),
      avgScore: avg(sessions.sessionScore),
    })
    .from(sessions)
    .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
    .where(and(...sessionConditions))
    .groupBy(sql`to_char(${sessions.completedAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${sessions.completedAt}, 'YYYY-MM')`);

  // Monthly active series count (series created before each month-end)
  const seriesConditions = [
    eq(meetingSeries.status, "active"),
    ...(roleFilter ? [roleFilter] : []),
  ];

  const monthlySeries = await tx
    .select({
      month: sql<string>`to_char(gs.month, 'YYYY-MM')`,
      seriesCount: count(meetingSeries.id),
    })
    .from(
      sql`generate_series(
        date_trunc('month', ${sixMonthsAgo}::timestamp),
        date_trunc('month', ${now}::timestamp),
        '1 month'::interval
      ) as gs(month)`
    )
    .leftJoin(
      meetingSeries,
      and(
        ...seriesConditions,
        lte(meetingSeries.createdAt, sql`gs.month + interval '1 month' - interval '1 day'`)
      )
    )
    .groupBy(sql`gs.month`)
    .orderBy(sql`gs.month`);

  // Build month keys for the last 6 months
  const monthKeys: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    monthKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  // Map query results to arrays aligned with monthKeys
  const sessionsByMonth = new Map(
    monthlyStats.map((r) => [r.month, r])
  );
  const seriesByMonth = new Map(
    monthlySeries.map((r) => [r.month, Number(r.seriesCount)])
  );

  const sessionsHistory = monthKeys.map(
    (m) => Number(sessionsByMonth.get(m)?.sessionCount ?? 0)
  );
  const scoresHistory: number[] = [];
  for (const m of monthKeys) {
    const row = sessionsByMonth.get(m);
    if (row?.avgScore) scoresHistory.push(parseFloat(row.avgScore));
  }
  const reportsHistory = monthKeys.map((m) => seriesByMonth.get(m) ?? 0);

  return { reportsHistory, sessionsHistory, scoresHistory };
}

// ---------------------------------------------------------------------------
// 4. Recent Sessions
// ---------------------------------------------------------------------------

export async function getRecentSessions(
  tx: TransactionClient,
  userId: string,
  role: string,
  limit = 5
): Promise<RecentSession[]> {
  const reportUser = alias(users, "reportUser");
  const managerUser = alias(users, "managerUser");

  const roleFilter =
    role === "member"
      ? eq(meetingSeries.reportId, userId)
      : role === "admin"
        ? or(eq(meetingSeries.managerId, userId), eq(meetingSeries.reportId, userId))!
        : eq(meetingSeries.managerId, userId);

  const conditions = [
    eq(sessions.status, "completed"),
    ...(roleFilter ? [roleFilter] : []),
  ];

  const rows = await tx
    .select({
      id: sessions.id,
      seriesId: sessions.seriesId,
      completedAt: sessions.completedAt,
      sessionNumber: sessions.sessionNumber,
      sessionScore: sessions.sessionScore,
      aiSummary: sessions.aiSummary,
      reportFirstName: reportUser.firstName,
      reportLastName: reportUser.lastName,
      managerFirstName: managerUser.firstName,
      managerLastName: managerUser.lastName,
    })
    .from(sessions)
    .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
    .innerJoin(reportUser, eq(meetingSeries.reportId, reportUser.id))
    .innerJoin(managerUser, eq(meetingSeries.managerId, managerUser.id))
    .where(and(...conditions))
    .orderBy(desc(sessions.completedAt))
    .limit(limit);

  return rows.map((r) => {
    // Extract first key takeaway as snippet
    let aiSummarySnippet: string | null = null;
    if (r.aiSummary && typeof r.aiSummary === "object") {
      const summary = r.aiSummary as { keyTakeaways?: string[] };
      if (summary.keyTakeaways?.[0]) {
        aiSummarySnippet = summary.keyTakeaways[0];
      }
    }

    const displayName =
      role === "member"
        ? `${r.managerFirstName} ${r.managerLastName}`
        : `${r.reportFirstName} ${r.reportLastName}`;

    return {
      id: r.id,
      seriesId: r.seriesId,
      reportName: displayName,
      completedAt: r.completedAt!.toISOString(),
      sessionNumber: r.sessionNumber,
      sessionScore: r.sessionScore ? parseFloat(r.sessionScore) : null,
      aiSummarySnippet,
    };
  });
}
