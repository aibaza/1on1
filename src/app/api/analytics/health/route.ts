import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import type { TransactionClient } from "@/lib/db/tenant-context";
import { isAdmin } from "@/lib/auth/rbac";
import {
  sessions,
  meetingSeries,
  actionItems,
  users,
  teams,
  teamMembers,
} from "@/lib/db/schema";
import { eq, and, or, sql, desc, gte, lt, inArray } from "drizzle-orm";

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

interface PersonSummary {
  userId: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  avgScore: number | null;
  trend: number;
  lastSessionDate: string | null;
  totalSessions: number;
  openActionItems: number;
  scoreHistory: number[];
}

interface TeamSummary {
  id: string;
  name: string;
  avgScore: number | null;
  trend: number;
  memberCount: number;
  alertCount: number;
  completionRate: number;
}

interface HealthResponse {
  role: "admin" | "manager" | "member";
  kpis: {
    avgScore: number | null;
    scoreTrend: number;
    completionRate: number;
    actionItemRate: number;
    activeSeries: number;
    staleSeries: number;
    totalSessions: number;
  };
  distribution: {
    healthy: number;
    attention: number;
    critical: number;
    noData: number;
  } | null;
  alerts: Alert[];
  teams: TeamSummary[];
  people: PersonSummary[];
  personal: {
    currentScore: number | null;
    trend: number;
    scoreHistory: number[];
    actionItemRate: number;
    totalSessions: number;
    nextSessionDate: string | null;
  } | null;
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

// ---------------------------------------------------------------------------
// GET /api/analytics/health
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { user } = session;
  const role = user.role as "admin" | "manager" | "member";

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

        // ---------------------------------------------------------------
        // 1. Get visible series IDs (role-scoped)
        // ---------------------------------------------------------------
        const seriesFilter =
          role === "admin"
            ? eq(meetingSeries.tenantId, user.tenantId)
            : role === "manager"
              ? and(
                  eq(meetingSeries.tenantId, user.tenantId),
                  eq(meetingSeries.managerId, user.id),
                )
              : and(
                  eq(meetingSeries.tenantId, user.tenantId),
                  eq(meetingSeries.reportId, user.id),
                );

        const visibleSeries = await tx
          .select({
            id: meetingSeries.id,
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
            status: meetingSeries.status,
            nextSessionAt: meetingSeries.nextSessionAt,
          })
          .from(meetingSeries)
          .where(seriesFilter);

        const seriesIds = visibleSeries.map((s) => s.id);

        // Early return for empty data
        if (seriesIds.length === 0) {
          return buildEmptyResponse(role);
        }

        // ---------------------------------------------------------------
        // 2. Fetch completed sessions in current + previous period
        // ---------------------------------------------------------------
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

        // ---------------------------------------------------------------
        // 3. KPIs
        // ---------------------------------------------------------------
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
            ? round2(completedCurrent.length / countableCurrent.length)!
            : 0;

        // Action item rate (from visible series, excluding cancelled)
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
            ? round2(completedActions.length / allActionItems.length)!
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
        // Also check sessions older than the double-period window
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
              lt(sessions.scheduledAt, prevPeriodStart),
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
          totalSessions: completedCurrent.length,
        };

        // ---------------------------------------------------------------
        // 4. Per-person data (admin/manager)
        // ---------------------------------------------------------------
        let distribution: HealthResponse["distribution"] = null;
        const alerts: Alert[] = [];
        const people: PersonSummary[] = [];
        const teamSummaries: TeamSummary[] = [];

        if (role === "admin" || role === "manager") {
          // Unique report user IDs from visible series
          const reportIds = [
            ...new Set(visibleSeries.map((s) => s.reportId)),
          ];

          // Fetch user info
          const reportUsers =
            reportIds.length > 0
              ? await tx
                  .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    jobTitle: users.jobTitle,
                    avatarUrl: users.avatarUrl,
                  })
                  .from(users)
                  .where(inArray(users.id, reportIds))
              : [];

          const userMap = new Map(reportUsers.map((u) => [u.id, u]));

          // Build per-person session data
          // Map: reportId -> their series IDs
          const personSeriesMap = new Map<string, string[]>();
          for (const vs of visibleSeries) {
            const list = personSeriesMap.get(vs.reportId) ?? [];
            list.push(vs.id);
            personSeriesMap.set(vs.reportId, list);
          }

          // Fetch ALL completed sessions for people (for totalSessions + scoreHistory)
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
                  .innerJoin(
                    meetingSeries,
                    eq(sessions.seriesId, meetingSeries.id),
                  )
                  .where(
                    and(
                      inArray(sessions.seriesId, seriesIds),
                      eq(sessions.status, "completed"),
                    ),
                  )
                  .orderBy(desc(sessions.completedAt))
              : [];

          // Map: reportId -> completed sessions (ordered newest first)
          const personSessionsMap = new Map<
            string,
            typeof allCompletedForPeople
          >();
          // Need series -> reportId mapping
          const seriesToReport = new Map(
            visibleSeries.map((s) => [s.id, s.reportId]),
          );
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

          // Distribution
          let healthy = 0;
          let attention = 0;
          let critical = 0;
          let noData = 0;

          for (const reportId of reportIds) {
            const u = userMap.get(reportId);
            if (!u) continue;

            const personSessions = personSessionsMap.get(reportId) ?? [];
            const recentSessions = personSessions.filter(
              (s) => s.completedAt && s.completedAt >= activeThreshold,
            );

            // Distribution: avg score over last 60 days
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

            // People summary
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
                ? currentScores.reduce((a, b) => a + b, 0) /
                  currentScores.length
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
              .map((s) => toNum(s.sessionScore) ?? 0)
              .reverse();

            const lastSession =
              personSessions.length > 0 ? personSessions[0] : null;

            people.push({
              userId: reportId,
              firstName: u.firstName,
              lastName: u.lastName,
              jobTitle: u.jobTitle,
              avatarUrl: u.avatarUrl,
              avgScore: round2(personAvg),
              trend: round2(personTrend) ?? 0,
              lastSessionDate: lastSession?.completedAt?.toISOString() ?? null,
              totalSessions: personSessions.length,
              openActionItems: openActionMap.get(reportId) ?? 0,
              scoreHistory,
            });

            // Alerts
            // Declining: last 3 scores each lower than previous
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
                  detail: `Score declined over last 3 sessions: ${last3Scores.reverse().join(" → ")}`,
                });
              }
            }

            // Critical score
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

            // Stale
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
              // No sessions at all
              alerts.push({
                type: "stale",
                severity: "medium",
                userId: reportId,
                personName: `${u.firstName} ${u.lastName}`,
                avatarUrl: u.avatarUrl,
                detail: "No completed sessions",
              });
            }

            // Low action rate
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

          distribution = { healthy, attention, critical, noData };

          // Sort alerts: high first, then medium, limit 7
          alerts.sort((a, b) => {
            const sevOrder = { high: 0, medium: 1 };
            return sevOrder[a.severity] - sevOrder[b.severity];
          });
          alerts.splice(7);

          // ---------------------------------------------------------------
          // 5. Team summaries (admin only)
          // ---------------------------------------------------------------
          if (isAdmin(role)) {
            const allTeams = await tx
              .select({
                id: teams.id,
                name: teams.name,
              })
              .from(teams)
              .where(eq(teams.tenantId, user.tenantId));

            if (allTeams.length > 0) {
              const teamIds = allTeams.map((t) => t.id);
              const allTeamMembers = await tx
                .select({
                  teamId: teamMembers.teamId,
                  userId: teamMembers.userId,
                })
                .from(teamMembers)
                .where(inArray(teamMembers.teamId, teamIds));

              const teamMemberMap = new Map<
                string,
                string[]
              >();
              for (const tm of allTeamMembers) {
                const list = teamMemberMap.get(tm.teamId) ?? [];
                list.push(tm.userId);
                teamMemberMap.set(tm.teamId, list);
              }

              // Precompute: per-person avg scores for current and prev period
              const personCurrentAvg = new Map<string, number>();
              const personPrevAvg = new Map<string, number>();
              for (const p of people) {
                if (p.avgScore !== null) personCurrentAvg.set(p.userId, p.avgScore);
                // Reconstruct prev avg from trend
                if (p.avgScore !== null && p.trend !== 0) {
                  personPrevAvg.set(p.userId, p.avgScore - p.trend);
                }
              }

              // Build alerts set for counting
              const alertsByUser = new Map<string, number>();
              for (const a of alerts) {
                alertsByUser.set(
                  a.userId,
                  (alertsByUser.get(a.userId) ?? 0) + 1,
                );
              }

              for (const team of allTeams) {
                const memberIds = teamMemberMap.get(team.id) ?? [];
                if (memberIds.length === 0) {
                  teamSummaries.push({
                    id: team.id,
                    name: team.name,
                    avgScore: null,
                    trend: 0,
                    memberCount: 0,
                    alertCount: 0,
                    completionRate: 0,
                  });
                  continue;
                }

                const memberScores = memberIds
                  .map((id) => personCurrentAvg.get(id))
                  .filter((v): v is number => v !== undefined);
                const memberPrevScores = memberIds
                  .map((id) => personPrevAvg.get(id))
                  .filter((v): v is number => v !== undefined);

                const teamAvg =
                  memberScores.length > 0
                    ? memberScores.reduce((a, b) => a + b, 0) /
                      memberScores.length
                    : null;
                const teamPrevAvg =
                  memberPrevScores.length > 0
                    ? memberPrevScores.reduce((a, b) => a + b, 0) /
                      memberPrevScores.length
                    : null;
                const teamTrend =
                  teamAvg !== null && teamPrevAvg !== null
                    ? teamAvg - teamPrevAvg
                    : 0;

                const teamAlertCount = memberIds.reduce(
                  (sum, id) => sum + (alertsByUser.get(id) ?? 0),
                  0,
                );

                // Team completion rate: sessions from series where reportId is a team member
                const teamSeriesIds = visibleSeries
                  .filter((s) => memberIds.includes(s.reportId))
                  .map((s) => s.id);
                const teamCurrentSessions = currentPeriodSessions.filter((s) =>
                  teamSeriesIds.includes(s.seriesId),
                );
                const teamCompleted = teamCurrentSessions.filter(
                  (s) => s.status === "completed",
                );
                const teamCountable = teamCurrentSessions.filter((s) =>
                  (countableStatuses as readonly string[]).includes(s.status),
                );
                const teamCompletionRate =
                  teamCountable.length > 0
                    ? teamCompleted.length / teamCountable.length
                    : 0;

                teamSummaries.push({
                  id: team.id,
                  name: team.name,
                  avgScore: round2(teamAvg),
                  trend: round2(teamTrend) ?? 0,
                  memberCount: memberIds.length,
                  alertCount: teamAlertCount,
                  completionRate: round2(teamCompletionRate) ?? 0,
                });
              }
            }
          }
        }

        // ---------------------------------------------------------------
        // 6. Personal stats (member only)
        // ---------------------------------------------------------------
        let personal: HealthResponse["personal"] = null;
        if (role === "member") {
          const memberSessions = await tx
            .select({
              id: sessions.id,
              sessionScore: sessions.sessionScore,
              completedAt: sessions.completedAt,
              scheduledAt: sessions.scheduledAt,
              status: sessions.status,
            })
            .from(sessions)
            .where(
              and(
                inArray(sessions.seriesId, seriesIds),
                eq(sessions.status, "completed"),
              ),
            )
            .orderBy(desc(sessions.completedAt));

          const currentScores = memberSessions
            .filter((s) => s.completedAt && s.completedAt >= periodStart)
            .map((s) => toNum(s.sessionScore))
            .filter((v): v is number => v !== null);
          const prevScores = memberSessions
            .filter(
              (s) =>
                s.completedAt &&
                s.completedAt >= prevPeriodStart &&
                s.completedAt < periodStart,
            )
            .map((s) => toNum(s.sessionScore))
            .filter((v): v is number => v !== null);

          const currentAvg =
            currentScores.length > 0
              ? currentScores.reduce((a, b) => a + b, 0) / currentScores.length
              : null;
          const prevAvg =
            prevScores.length > 0
              ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length
              : null;
          const trend =
            currentAvg !== null && prevAvg !== null ? currentAvg - prevAvg : 0;

          const latestScore =
            memberSessions.length > 0
              ? toNum(memberSessions[0]!.sessionScore)
              : null;

          const scoreHistory = memberSessions
            .slice(0, 10)
            .map((s) => toNum(s.sessionScore) ?? 0)
            .reverse();

          // Action item rate for this member
          const memberActions = await tx
            .select({
              total: sql<number>`count(*)::int`,
              completed:
                sql<number>`count(*) filter (where ${actionItems.status} = 'completed')::int`,
            })
            .from(actionItems)
            .where(
              and(
                eq(actionItems.assigneeId, user.id),
                sql`${actionItems.status} != 'cancelled'`,
              ),
            );

          const memberActionTotal = memberActions[0]?.total ?? 0;
          const memberActionCompleted = memberActions[0]?.completed ?? 0;
          const memberActionRate =
            memberActionTotal > 0
              ? memberActionCompleted / memberActionTotal
              : 0;

          // Next session date
          const nextSession = await tx
            .select({ scheduledAt: sessions.scheduledAt })
            .from(sessions)
            .where(
              and(
                inArray(sessions.seriesId, seriesIds),
                eq(sessions.status, "scheduled"),
                gte(sessions.scheduledAt, now),
              ),
            )
            .orderBy(sessions.scheduledAt)
            .limit(1);

          personal = {
            currentScore: round2(latestScore),
            trend: round2(trend) ?? 0,
            scoreHistory,
            actionItemRate: round2(memberActionRate) ?? 0,
            totalSessions: memberSessions.length,
            nextSessionDate:
              nextSession[0]?.scheduledAt?.toISOString() ?? null,
          };
        }

        // ---------------------------------------------------------------
        // Build response
        // ---------------------------------------------------------------
        const response: HealthResponse = {
          role,
          kpis,
          distribution,
          alerts,
          teams: teamSummaries,
          people,
          personal,
        };

        return response;
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[analytics/health] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function avgOfScores(
  sessionList: Array<{ sessionScore: string | null }>,
): number | null {
  const scores = sessionList
    .map((s) => toNum(s.sessionScore))
    .filter((v): v is number => v !== null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function buildEmptyResponse(
  role: "admin" | "manager" | "member",
): HealthResponse {
  return {
    role,
    kpis: {
      avgScore: null,
      scoreTrend: 0,
      completionRate: 0,
      actionItemRate: 0,
      activeSeries: 0,
      staleSeries: 0,
      totalSessions: 0,
    },
    distribution:
      role === "admin" || role === "manager"
        ? { healthy: 0, attention: 0, critical: 0, noData: 0 }
        : null,
    alerts: [],
    teams: [],
    people: [],
    personal:
      role === "member"
        ? {
            currentScore: null,
            trend: 0,
            scoreHistory: [],
            actionItemRate: 0,
            totalSessions: 0,
            nextSessionDate: null,
          }
        : null,
  };
}
