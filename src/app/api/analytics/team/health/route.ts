import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isAdmin } from "@/lib/auth/rbac";
import { sessions, meetingSeries, actionItems, users } from "@/lib/db/schema";
import { eq, and, or, sql, desc, gte, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Alert {
  type: "declining" | "critical_score" | "stale" | "low_action_rate";
  severity: "high" | "medium";
  userId: string;
  personName: string;
  avatarUrl: string | null;
  detail: string;
}

interface MemberSummary {
  userId: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  role: string;
  avgScore: number | null;
  trend: number;
  lastSessionDate: string | null;
  totalSessions: number;
  openActionItems: number;
  scoreHistory: { score: number; date: string }[];
}

interface TeamHealthResponse {
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
  };
  reportCount: number;
  kpis: {
    avgScore: number | null;
    scoreTrend: number;
    completionRate: number;
    actionItemRate: number;
    activeSeries: number;
    staleSeries: number;
    totalSessions: number;
    completedSessions: number;
  };
  distribution: {
    healthy: number;
    attention: number;
    critical: number;
    noData: number;
  };
  alerts: Alert[];
  members: MemberSummary[];
  teamScoreHistory: { score: number; date: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PERIOD_DAYS = 90;
const ACTIVE_THRESHOLD_DAYS = 60;
const STALE_THRESHOLD_DAYS = 45;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function round2(v: number | null): number | null {
  if (v === null) return null;
  return Math.round(v * 100) / 100;
}

function avgOfScores(
  sessionList: Array<{ sessionScore: string | null }>,
): number | null {
  const scores = sessionList
    .map((s) => toNum(s.sessionScore))
    .filter((v): v is number => v !== null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ---------------------------------------------------------------------------
// GET /api/analytics/team/health?managerId=UUID
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { user } = session;
  const role = user.role as "admin" | "manager" | "member";

  // Members cannot access team health
  if (role === "member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const managerId = searchParams.get("managerId");

  if (!managerId) {
    return NextResponse.json(
      { error: "managerId query parameter is required" },
      { status: 400 },
    );
  }

  // Managers can only view their own team
  if (role === "manager" && managerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await withTenantContext(
      user.tenantId,
      user.id,
      async (tx) => {
        const now = new Date();
        const periodStart = daysAgo(PERIOD_DAYS);
        const prevPeriodStart = daysAgo(PERIOD_DAYS * 2);
        const activeThreshold = daysAgo(ACTIVE_THRESHOLD_DAYS);
        const staleThreshold = daysAgo(STALE_THRESHOLD_DAYS);

        // -------------------------------------------------------------
        // 1. Fetch manager user
        // -------------------------------------------------------------
        const [managerUser] = await tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarUrl,
            role: users.role,
            tenantId: users.tenantId,
          })
          .from(users)
          .where(
            and(
              eq(users.id, managerId),
              eq(users.tenantId, user.tenantId),
            ),
          )
          .limit(1);

        if (!managerUser) {
          return { error: "Manager not found", status: 404 } as const;
        }

        // -------------------------------------------------------------
        // 2. Get all series where this user is the manager
        // -------------------------------------------------------------
        const visibleSeries = await tx
          .select({
            id: meetingSeries.id,
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
            status: meetingSeries.status,
            nextSessionAt: meetingSeries.nextSessionAt,
          })
          .from(meetingSeries)
          .where(
            and(
              eq(meetingSeries.tenantId, user.tenantId),
              eq(meetingSeries.managerId, managerId),
            ),
          );

        const seriesIds = visibleSeries.map((s) => s.id);
        const reportIds = [...new Set(visibleSeries.map((s) => s.reportId))];

        // Early return for empty data
        if (seriesIds.length === 0) {
          return buildEmptyResponse(managerUser);
        }

        // -------------------------------------------------------------
        // 3. Fetch completed sessions in current + previous period
        // -------------------------------------------------------------
        const allSessions = await tx
          .select({
            id: sessions.id,
            seriesId: sessions.seriesId,
            status: sessions.status,
            sessionScore: sessions.sessionScore,
            completedAt: sessions.completedAt,
            scheduledAt: sessions.scheduledAt,
          })
          .from(sessions)
          .where(
            and(
              inArray(sessions.seriesId, seriesIds),
              gte(sessions.scheduledAt, prevPeriodStart),
            ),
          );

        const currentPeriodSessions = allSessions.filter(
          (s) => s.scheduledAt >= periodStart,
        );
        const prevPeriodSessions = allSessions.filter(
          (s) => s.scheduledAt >= prevPeriodStart && s.scheduledAt < periodStart,
        );

        const completedCurrent = currentPeriodSessions.filter(
          (s) => s.status === "completed",
        );
        const completedPrev = prevPeriodSessions.filter(
          (s) => s.status === "completed",
        );

        // -------------------------------------------------------------
        // 4. KPIs
        // -------------------------------------------------------------
        const avgScoreCurrent = avgOfScores(completedCurrent);
        const avgScorePrev = avgOfScores(completedPrev);
        const scoreTrend =
          avgScoreCurrent !== null && avgScorePrev !== null
            ? round2(avgScoreCurrent - avgScorePrev)!
            : 0;

        const countableStatuses = ["completed", "cancelled", "missed"] as const;
        const countableCurrent = currentPeriodSessions.filter((s) =>
          (countableStatuses as readonly string[]).includes(s.status),
        );
        const completionRate =
          countableCurrent.length > 0
            ? Math.round((completedCurrent.length / countableCurrent.length) * 100)
            : 0;

        // Action item rate
        const allActionItems =
          seriesIds.length > 0
            ? await tx
                .select({
                  id: actionItems.id,
                  status: actionItems.status,
                  assigneeId: actionItems.assigneeId,
                })
                .from(actionItems)
                .innerJoin(sessions, eq(actionItems.sessionId, sessions.id))
                .where(
                  and(
                    inArray(sessions.seriesId, seriesIds),
                    sql`${actionItems.status} != 'cancelled'`,
                  ),
                )
            : [];

        const completedActions = allActionItems.filter(
          (a) => a.status === "completed",
        );
        const actionItemRate =
          allActionItems.length > 0
            ? Math.round((completedActions.length / allActionItems.length) * 100)
            : 0;

        // Active / stale series
        const seriesLastCompleted = new Map<string, Date>();
        for (const s of allSessions) {
          if (s.status === "completed" && s.completedAt) {
            const prev = seriesLastCompleted.get(s.seriesId);
            if (!prev || s.completedAt > prev) {
              seriesLastCompleted.set(s.seriesId, s.completedAt);
            }
          }
        }

        // Check sessions older than the double-period window
        const olderCompletedSessions = await tx
          .select({
            seriesId: sessions.seriesId,
            completedAt: sessions.completedAt,
          })
          .from(sessions)
          .where(
            and(
              inArray(sessions.seriesId, seriesIds),
              eq(sessions.status, "completed"),
              sql`${sessions.scheduledAt} < ${prevPeriodStart}`,
            ),
          )
          .orderBy(desc(sessions.completedAt));

        for (const s of olderCompletedSessions) {
          if (s.completedAt) {
            const prev = seriesLastCompleted.get(s.seriesId);
            if (!prev || s.completedAt > prev) {
              seriesLastCompleted.set(s.seriesId, s.completedAt);
            }
          }
        }

        let activeSeries = 0;
        let staleSeries = 0;
        for (const vs of visibleSeries) {
          const lastCompleted = seriesLastCompleted.get(vs.id);
          if (lastCompleted && lastCompleted >= activeThreshold) {
            activeSeries++;
          } else if (
            vs.status !== "archived" &&
            (!lastCompleted || lastCompleted < staleThreshold)
          ) {
            staleSeries++;
          }
        }

        const kpis = {
          avgScore: round2(avgScoreCurrent),
          scoreTrend,
          completionRate,
          actionItemRate,
          activeSeries,
          staleSeries,
          totalSessions: countableCurrent.length,
          completedSessions: completedCurrent.length,
        };

        // -------------------------------------------------------------
        // 5. Per-person data
        // -------------------------------------------------------------
        const reportUsers =
          reportIds.length > 0
            ? await tx
                .select({
                  id: users.id,
                  firstName: users.firstName,
                  lastName: users.lastName,
                  jobTitle: users.jobTitle,
                  avatarUrl: users.avatarUrl,
                  role: users.role,
                })
                .from(users)
                .where(inArray(users.id, reportIds))
            : [];

        const userMap = new Map(reportUsers.map((u) => [u.id, u]));

        // Series -> reportId mapping
        const seriesToReport = new Map(
          visibleSeries.map((s) => [s.id, s.reportId]),
        );

        // Fetch ALL completed sessions for score history + totals
        const allCompletedForPeople =
          reportIds.length > 0
            ? await tx
                .select({
                  id: sessions.id,
                  seriesId: sessions.seriesId,
                  sessionScore: sessions.sessionScore,
                  completedAt: sessions.completedAt,
                })
                .from(sessions)
                .where(
                  and(
                    inArray(sessions.seriesId, seriesIds),
                    eq(sessions.status, "completed"),
                  ),
                )
                .orderBy(desc(sessions.completedAt))
            : [];

        // Map: reportId -> completed sessions (newest first)
        const personSessionsMap = new Map<
          string,
          typeof allCompletedForPeople
        >();
        for (const cs of allCompletedForPeople) {
          const reportId = seriesToReport.get(cs.seriesId);
          if (!reportId) continue;
          const list = personSessionsMap.get(reportId) ?? [];
          list.push(cs);
          personSessionsMap.set(reportId, list);
        }

        // Open action items per person
        const openActionItems =
          reportIds.length > 0
            ? await tx
                .select({
                  assigneeId: actionItems.assigneeId,
                  cnt: sql<number>`count(*)::int`,
                })
                .from(actionItems)
                .where(
                  and(
                    inArray(actionItems.assigneeId, reportIds),
                    or(
                      eq(actionItems.status, "open"),
                      eq(actionItems.status, "in_progress"),
                    ),
                  ),
                )
                .groupBy(actionItems.assigneeId)
            : [];
        const openActionMap = new Map(
          openActionItems.map((a) => [a.assigneeId, a.cnt]),
        );

        // Per-person action item rates for alerts
        const personActionTotals =
          reportIds.length > 0
            ? await tx
                .select({
                  assigneeId: actionItems.assigneeId,
                  total: sql<number>`count(*)::int`,
                  completed:
                    sql<number>`count(*) filter (where ${actionItems.status} = 'completed')::int`,
                })
                .from(actionItems)
                .where(
                  and(
                    inArray(actionItems.assigneeId, reportIds),
                    sql`${actionItems.status} != 'cancelled'`,
                  ),
                )
                .groupBy(actionItems.assigneeId)
            : [];
        const personActionMap = new Map(
          personActionTotals.map((a) => [
            a.assigneeId,
            { total: a.total, completed: a.completed },
          ]),
        );

        // Distribution + members + alerts
        let healthy = 0;
        let attention = 0;
        let critical = 0;
        let noData = 0;
        const alerts: Alert[] = [];
        const members: MemberSummary[] = [];

        for (const reportId of reportIds) {
          const u = userMap.get(reportId);
          if (!u) continue;

          const personSessions = personSessionsMap.get(reportId) ?? [];

          // Distribution: avg score over last 60 days
          const recentSessions = personSessions.filter(
            (s) => s.completedAt && s.completedAt >= activeThreshold,
          );
          const recentScores = recentSessions
            .map((s) => toNum(s.sessionScore))
            .filter((v): v is number => v !== null);

          if (recentScores.length === 0) {
            noData++;
          } else {
            const avg =
              recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
            if (avg >= 3.5) healthy++;
            else if (avg >= 2.5) attention++;
            else critical++;
          }

          // Person summary
          const currentScores = personSessions
            .filter((s) => s.completedAt && s.completedAt >= periodStart)
            .map((s) => toNum(s.sessionScore))
            .filter((v): v is number => v !== null);
          const prevScores = personSessions
            .filter(
              (s) =>
                s.completedAt &&
                s.completedAt >= prevPeriodStart &&
                s.completedAt < periodStart,
            )
            .map((s) => toNum(s.sessionScore))
            .filter((v): v is number => v !== null);

          const personAvg =
            currentScores.length > 0
              ? currentScores.reduce((a, b) => a + b, 0) / currentScores.length
              : null;
          const personPrevAvg =
            prevScores.length > 0
              ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length
              : null;
          const personTrend =
            personAvg !== null && personPrevAvg !== null
              ? personAvg - personPrevAvg
              : 0;

          const scoreHistory = personSessions
            .slice(0, 6)
            .map((s) => ({
              score: toNum(s.sessionScore) ?? 0,
              date: s.completedAt?.toISOString() ?? "",
            }))
            .reverse();

          const lastSession =
            personSessions.length > 0 ? personSessions[0] : null;

          members.push({
            userId: reportId,
            firstName: u.firstName,
            lastName: u.lastName,
            jobTitle: u.jobTitle,
            avatarUrl: u.avatarUrl,
            role: u.role,
            avgScore: round2(personAvg),
            trend: round2(personTrend) ?? 0,
            lastSessionDate: lastSession?.completedAt?.toISOString() ?? null,
            totalSessions: personSessions.length,
            openActionItems: openActionMap.get(reportId) ?? 0,
            scoreHistory,
          });

          // Alerts — declining
          if (personSessions.length >= 3) {
            const last3Scores = personSessions
              .slice(0, 3)
              .map((s) => toNum(s.sessionScore))
              .filter((v): v is number => v !== null);
            if (
              last3Scores.length === 3 &&
              last3Scores[0]! < last3Scores[1]! &&
              last3Scores[1]! < last3Scores[2]!
            ) {
              alerts.push({
                type: "declining",
                severity: "high",
                userId: reportId,
                personName: `${u.firstName} ${u.lastName}`,
                avatarUrl: u.avatarUrl,
                detail: `Score declined over last 3 sessions: ${[...last3Scores].reverse().join(" → ")}`,
              });
            }
          }

          // Alerts — critical score
          if (personSessions.length > 0) {
            const latestScore = toNum(personSessions[0]!.sessionScore);
            if (latestScore !== null && latestScore < 2.5) {
              alerts.push({
                type: "critical_score",
                severity: "high",
                userId: reportId,
                personName: `${u.firstName} ${u.lastName}`,
                avatarUrl: u.avatarUrl,
                detail: `Latest session score: ${latestScore}`,
              });
            }
          }

          // Alerts — stale
          if (lastSession?.completedAt) {
            if (lastSession.completedAt < staleThreshold) {
              const daysSince = Math.floor(
                (now.getTime() - lastSession.completedAt.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              alerts.push({
                type: "stale",
                severity: "medium",
                userId: reportId,
                personName: `${u.firstName} ${u.lastName}`,
                avatarUrl: u.avatarUrl,
                detail: `No session in ${daysSince} days`,
              });
            }
          } else if (personSessions.length === 0) {
            alerts.push({
              type: "stale",
              severity: "medium",
              userId: reportId,
              personName: `${u.firstName} ${u.lastName}`,
              avatarUrl: u.avatarUrl,
              detail: "No completed sessions",
            });
          }

          // Alerts — low action rate
          const actionData = personActionMap.get(reportId);
          if (actionData && actionData.total > 5) {
            const rate = actionData.completed / actionData.total;
            if (rate < 0.3) {
              alerts.push({
                type: "low_action_rate",
                severity: "medium",
                userId: reportId,
                personName: `${u.firstName} ${u.lastName}`,
                avatarUrl: u.avatarUrl,
                detail: `Action item completion: ${Math.round(rate * 100)}% (${actionData.completed}/${actionData.total})`,
              });
            }
          }
        }

        const distribution = { healthy, attention, critical, noData };

        // Sort alerts: high first, then medium, limit 7
        alerts.sort((a, b) => {
          const sevOrder = { high: 0, medium: 1 };
          return sevOrder[a.severity] - sevOrder[b.severity];
        });
        alerts.splice(7);

        // -------------------------------------------------------------
        // 6. Team score history (aggregate)
        // -------------------------------------------------------------
        // Take last 10 completed sessions across all reports, sorted by date.
        // For each point, compute the running average across all reports at that time.
        const recentTeamSessions = allCompletedForPeople
          .filter((s) => s.completedAt && toNum(s.sessionScore) !== null)
          .slice(0, 10);

        const teamScoreHistory: { score: number; date: string }[] = [];

        if (recentTeamSessions.length > 0) {
          // Walk through sessions newest-first, compute running avg at each point
          // We reverse at the end so chart goes left-to-right chronologically
          const sessionsChronological = [...recentTeamSessions].reverse();

          for (const s of sessionsChronological) {
            const reportId = seriesToReport.get(s.seriesId);
            if (!reportId) continue;

            // Compute team avg at this point in time:
            // For each report, their latest score at or before this session's date
            const pointDate = s.completedAt!;
            const scoresAtPoint: number[] = [];

            for (const rid of reportIds) {
              const pSessions = personSessionsMap.get(rid) ?? [];
              // Find latest completed session at or before pointDate (list is newest-first)
              const latestAtPoint = pSessions.find(
                (ps) => ps.completedAt && ps.completedAt <= pointDate,
              );
              if (latestAtPoint) {
                const score = toNum(latestAtPoint.sessionScore);
                if (score !== null) scoresAtPoint.push(score);
              }
            }

            if (scoresAtPoint.length > 0) {
              const avg =
                scoresAtPoint.reduce((a, b) => a + b, 0) /
                scoresAtPoint.length;
              teamScoreHistory.push({
                score: round2(avg)!,
                date: pointDate.toISOString(),
              });
            }
          }
        }

        // -------------------------------------------------------------
        // Build response
        // -------------------------------------------------------------
        const response: TeamHealthResponse = {
          manager: {
            id: managerUser.id,
            firstName: managerUser.firstName,
            lastName: managerUser.lastName,
            avatarUrl: managerUser.avatarUrl,
            role: managerUser.role,
          },
          reportCount: reportIds.length,
          kpis,
          distribution,
          alerts,
          members,
          teamScoreHistory,
        };

        return response;
      },
    );

    // Handle error from inside transaction
    if (result && typeof result === "object" && "error" in result && "status" in result) {
      const errResult = result as { error: string; status: number };
      return NextResponse.json(
        { error: errResult.error },
        { status: errResult.status },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[analytics/team/health] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function buildEmptyResponse(
  managerUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
  },
): TeamHealthResponse {
  return {
    manager: {
      id: managerUser.id,
      firstName: managerUser.firstName,
      lastName: managerUser.lastName,
      avatarUrl: managerUser.avatarUrl,
      role: managerUser.role,
    },
    reportCount: 0,
    kpis: {
      avgScore: null,
      scoreTrend: 0,
      completionRate: 0,
      actionItemRate: 0,
      activeSeries: 0,
      staleSeries: 0,
      totalSessions: 0,
      completedSessions: 0,
    },
    distribution: { healthy: 0, attention: 0, critical: 0, noData: 0 },
    alerts: [],
    members: [],
    teamScoreHistory: [],
  };
}
