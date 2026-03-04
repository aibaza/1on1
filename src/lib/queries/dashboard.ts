import {
  eq,
  and,
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
  aiNudges,
  actionItems,
  questionnaireTemplates,
} from "@/lib/db/schema";
import type { NudgeData } from "@/components/dashboard/nudge-card";

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
  nudges: NudgeData[];
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

export interface RecentSession {
  id: string;
  seriesId: string;
  reportName: string;
  completedAt: string;
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
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const reportUser = alias(users, "reportUser");
  const managerUser = alias(users, "managerUser");

  // Build role-specific WHERE conditions
  const roleFilter =
    role === "member"
      ? eq(meetingSeries.reportId, userId)
      : role === "admin"
        ? undefined
        : eq(meetingSeries.managerId, userId); // manager

  const conditions = [
    eq(sessions.tenantId, tenantId),
    gte(sessions.scheduledAt, todayStart),
    lte(sessions.scheduledAt, in7Days),
    inArray(sessions.status, ["scheduled", "in_progress"]),
    ...(roleFilter ? [roleFilter] : []),
  ];

  const rows = await tx
    .select({
      sessionId: sessions.id,
      seriesId: sessions.seriesId,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
      templateName: questionnaireTemplates.name,
      reportFirstName: reportUser.firstName,
      reportLastName: reportUser.lastName,
      managerFirstName: managerUser.firstName,
      managerLastName: managerUser.lastName,
    })
    .from(sessions)
    .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
    .innerJoin(reportUser, eq(meetingSeries.reportId, reportUser.id))
    .innerJoin(managerUser, eq(meetingSeries.managerId, managerUser.id))
    .leftJoin(
      questionnaireTemplates,
      eq(sessions.templateId, questionnaireTemplates.id)
    )
    .where(and(...conditions))
    .orderBy(asc(sessions.scheduledAt));

  if (rows.length === 0) return [];

  // Batch-fetch nudges for all relevant series (not N+1)
  const seriesIds = [...new Set(rows.map((r) => r.seriesId))];

  const nudgeRows = await tx
    .select({
      id: aiNudges.id,
      content: aiNudges.content,
      reason: aiNudges.reason,
      priority: aiNudges.priority,
      seriesId: aiNudges.seriesId,
      targetSessionAt: aiNudges.targetSessionAt,
      reportFirstName: reportUser.firstName,
      reportLastName: reportUser.lastName,
    })
    .from(aiNudges)
    .innerJoin(meetingSeries, eq(aiNudges.seriesId, meetingSeries.id))
    .innerJoin(reportUser, eq(meetingSeries.reportId, reportUser.id))
    .where(
      and(
        eq(aiNudges.isDismissed, false),
        eq(aiNudges.tenantId, tenantId),
        inArray(aiNudges.seriesId, seriesIds)
      )
    )
    .orderBy(
      sql`CASE ${aiNudges.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`
    );

  // Group nudges by seriesId
  const nudgesBySeries = new Map<string, NudgeData[]>();
  for (const n of nudgeRows) {
    const list = nudgesBySeries.get(n.seriesId) ?? [];
    list.push({
      id: n.id,
      content: n.content,
      reason: n.reason,
      priority: n.priority ?? "medium",
      seriesId: n.seriesId,
      reportName: `${n.reportFirstName} ${n.reportLastName}`,
      targetSessionAt: n.targetSessionAt?.toISOString() ?? null,
    });
    nudgesBySeries.set(n.seriesId, list);
  }

  return rows.map((r) => {
    const scheduled = r.scheduledAt;
    const isToday =
      scheduled >= todayStart && scheduled <= todayEnd;
    const displayName =
      role === "member"
        ? `${r.managerFirstName} ${r.managerLastName}`
        : `${r.reportFirstName} ${r.reportLastName}`;

    return {
      sessionId: r.sessionId,
      seriesId: r.seriesId,
      reportName: displayName,
      scheduledAt: scheduled.toISOString(),
      status: r.status,
      templateName: r.templateName,
      nudges: nudgesBySeries.get(r.seriesId) ?? [],
      isToday,
      ...(r.status === "in_progress" ? { activeSessionId: r.sessionId } : {}),
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

  const roleFilter =
    role === "member"
      ? eq(actionItems.assigneeId, userId)
      : role === "admin"
        ? undefined
        : eq(meetingSeries.managerId, userId);

  const conditions = [
    inArray(actionItems.status, ["open", "in_progress"]),
    lt(actionItems.dueDate, now.toISOString().slice(0, 10)),
    ...(roleFilter ? [roleFilter] : []),
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
        ? undefined
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
        ? undefined
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
// 4. Manager Nudges (standalone, no date filter)
// ---------------------------------------------------------------------------

export async function getManagerNudges(
  tx: TransactionClient,
  userId: string,
  tenantId: string
): Promise<NudgeData[]> {
  const reportUser = alias(users, "reportUser");

  const rows = await tx
    .select({
      id: aiNudges.id,
      content: aiNudges.content,
      reason: aiNudges.reason,
      priority: aiNudges.priority,
      seriesId: aiNudges.seriesId,
      targetSessionAt: aiNudges.targetSessionAt,
      reportFirstName: reportUser.firstName,
      reportLastName: reportUser.lastName,
    })
    .from(aiNudges)
    .innerJoin(meetingSeries, eq(aiNudges.seriesId, meetingSeries.id))
    .innerJoin(reportUser, eq(meetingSeries.reportId, reportUser.id))
    .where(
      and(
        eq(aiNudges.isDismissed, false),
        eq(aiNudges.tenantId, tenantId),
        eq(meetingSeries.managerId, userId)
      )
    )
    .orderBy(
      sql`CASE ${aiNudges.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`,
      sql`${aiNudges.targetSessionAt} NULLS LAST`
    );

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    reason: r.reason,
    priority: r.priority ?? "medium",
    seriesId: r.seriesId,
    reportName: `${r.reportFirstName} ${r.reportLastName}`,
    targetSessionAt: r.targetSessionAt?.toISOString() ?? null,
  }));
}

// ---------------------------------------------------------------------------
// 5. Recent Sessions
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
        ? undefined
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
      sessionScore: r.sessionScore ? parseFloat(r.sessionScore) : null,
      aiSummarySnippet,
    };
  });
}
