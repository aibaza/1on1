import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, and, sql } from "drizzle-orm";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users, meetingSeries, sessions, actionItems, teams, teamMembers } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users } from "lucide-react";
import { getTranslations, getFormatter } from "next-intl/server";

interface ReportSummary {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  sessionCount: number;
  latestScore: number | null;
}

interface TeamSummary {
  id: string;
  name: string;
  memberCount: number;
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const t = await getTranslations("analytics");
  const format = await getFormatter();

  const { user } = session;

  // Members can only see their own analytics
  if (user.role === "member") {
    redirect(`/analytics/individual/${user.id}`);
  }

  const { reports, teamsList, aggregates } = await withTenantContext(
    user.tenantId,
    user.id,
    async (tx) => {
      // Managers see their direct reports, admins see all users with sessions
      const managerCondition =
        user.role === "manager"
          ? and(
              eq(meetingSeries.managerId, user.id),
              eq(users.isActive, true),
            )
          : eq(users.isActive, true);

      // Get unique report users with session counts
      const reportRows = await tx
        .select({
          userId: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
          jobTitle: users.jobTitle,
          sessionCount: sql<number>`COUNT(DISTINCT ${sessions.id})::int`,
        })
        .from(meetingSeries)
        .innerJoin(users, eq(meetingSeries.reportId, users.id))
        .leftJoin(
          sessions,
          and(
            eq(sessions.seriesId, meetingSeries.id),
            eq(sessions.status, "completed"),
          ),
        )
        .where(managerCondition)
        .groupBy(
          users.id,
          users.firstName,
          users.lastName,
          users.avatarUrl,
          users.jobTitle,
        );

      // Get latest score per report user via DISTINCT ON
      const latestScoreRows = await tx
        .select({
          reportId: sql<string>`DISTINCT ON (ms.report_id) ms.report_id`,
          score: sessions.sessionScore,
        })
        .from(sessions)
        .innerJoin(
          sql`meeting_series ms`,
          sql`${sessions.seriesId} = ms.id`,
        )
        .where(
          and(
            eq(sessions.status, "completed"),
            sql`${sessions.sessionScore} IS NOT NULL`,
          ),
        )
        .orderBy(sql`ms.report_id`, sql`${sessions.completedAt} DESC`);

      const latestScoreMap = new Map<string, number>();
      for (const row of latestScoreRows) {
        if (row.score !== null) {
          latestScoreMap.set(row.reportId, Number(row.score));
        }
      }

      // Deduplicate by userId (a user may appear in multiple series)
      const seen = new Map<string, ReportSummary>();
      for (const row of reportRows) {
        const existing = seen.get(row.userId);
        if (!existing || row.sessionCount > existing.sessionCount) {
          seen.set(row.userId, {
            userId: row.userId,
            firstName: row.firstName,
            lastName: row.lastName,
            avatarUrl: row.avatarUrl,
            jobTitle: row.jobTitle,
            sessionCount: row.sessionCount,
            latestScore: latestScoreMap.get(row.userId) ?? null,
          });
        }
      }

      const reportsList = Array.from(seen.values()).sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        ),
      );

      // Fetch teams the user can see analytics for
      // Managers: teams they manage or lead; Admins: all teams
      const teamCondition =
        user.role === "admin" ? undefined : eq(teams.managerId, user.id);

      const teamRows = await tx
        .select({
          id: teams.id,
          name: teams.name,
          memberCount: sql<number>`COUNT(${teamMembers.id})::int`,
        })
        .from(teams)
        .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
        .where(teamCondition)
        .groupBy(teams.id, teams.name)
        .orderBy(teams.name);

      // Aggregate company-wide metrics (scoped to what the user can see)
      const seriesConditionForAgg =
        user.role === "manager"
          ? eq(meetingSeries.managerId, user.id)
          : undefined;

      // Completed sessions count (and avg score)
      const sessionAggRows = await tx
        .select({
          completedCount: sql<number>`COUNT(CASE WHEN ${sessions.status} = 'completed' THEN 1 END)::int`,
          avgScore: sql<string | null>`AVG(CASE WHEN ${sessions.status} = 'completed' AND ${sessions.sessionScore} IS NOT NULL THEN ${sessions.sessionScore}::numeric END)`,
        })
        .from(sessions)
        .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
        .where(
          and(
            eq(sessions.tenantId, user.tenantId),
            seriesConditionForAgg,
          ),
        );

      const sessionsCompletedCount = sessionAggRows[0]?.completedCount ?? 0;
      const avgScoreRaw = sessionAggRows[0]?.avgScore ?? null;
      const avgScore = avgScoreRaw !== null ? parseFloat(avgScoreRaw) : null;

      // Action item completion rate
      const actionItemAggRows = await tx
        .select({
          total: sql<number>`COUNT(*)::int`,
          completed: sql<number>`COUNT(CASE WHEN ${actionItems.status} = 'completed' THEN 1 END)::int`,
        })
        .from(actionItems)
        .innerJoin(sessions, eq(actionItems.sessionId, sessions.id))
        .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
        .where(
          and(
            eq(actionItems.tenantId, user.tenantId),
            seriesConditionForAgg,
          ),
        );

      const aiTotal = actionItemAggRows[0]?.total ?? 0;
      const aiCompleted = actionItemAggRows[0]?.completed ?? 0;
      const actionItemRate = aiTotal > 0 ? Math.round((aiCompleted / aiTotal) * 100) : null;

      return {
        reports: reportsList,
        teamsList: teamRows as TeamSummary[],
        aggregates: { sessionsCompletedCount, avgScore, actionItemRate },
      };
    },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Aggregate stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Sessions Completed */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("aggregate.sessionsCompleted")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {aggregates.sessionsCompletedCount > 0
                ? aggregates.sessionsCompletedCount
                : t("aggregate.noData")}
            </p>
          </CardContent>
        </Card>

        {/* Avg Score */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("aggregate.avgScore")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {aggregates.avgScore !== null
                ? format.number(aggregates.avgScore, { maximumFractionDigits: 1, minimumFractionDigits: 1 })
                : t("aggregate.noData")}
            </p>
            {aggregates.avgScore !== null && (
              <p className="text-xs text-muted-foreground">out of 5</p>
            )}
          </CardContent>
        </Card>

        {/* Action Item Rate */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("aggregate.actionItemRate")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {aggregates.actionItemRate !== null
                ? `${aggregates.actionItemRate}%`
                : t("aggregate.noData")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team analytics section */}
      {teamsList.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium">{t("teamsSection")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teamsList.map((team) => (
              <Link key={team.id} href={`/analytics/team/${team.id}`}>
                <Card className="transition-all duration-200 hover:bg-accent/30 hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {team.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("memberCount", { count: team.memberCount })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Individual reports section */}
      <div>
        {teamsList.length > 0 && (
          <h2 className="mb-3 text-lg font-medium">{t("individualsSection")}</h2>
        )}
        {reports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {t("empty")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => {
              const initials = `${report.firstName[0]}${report.lastName[0]}`;
              return (
                <Link
                  key={report.userId}
                  href={`/analytics/individual/${report.userId}`}
                >
                  <Card className="transition-all duration-200 hover:bg-accent/30 hover:shadow-md">
                    <CardContent className="flex items-center gap-4 p-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={report.avatarUrl ?? undefined}
                          alt={`${report.firstName} ${report.lastName}`}
                        />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {report.firstName} {report.lastName}
                        </p>
                        {report.jobTitle && (
                          <p className="truncate text-xs text-muted-foreground">
                            {report.jobTitle}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {report.latestScore !== null && (
                          <Badge variant="secondary" className="text-xs">
                            {format.number(report.latestScore, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {t("sessionCount", { count: report.sessionCount })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
