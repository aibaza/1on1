import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { meetingSeries, sessions, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { canManageSeries } from "@/lib/auth/rbac";
import { SeriesList } from "@/components/series/series-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function SessionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const seriesData = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      // Fetch all series with report info
      const seriesList = await tx
        .select({
          id: meetingSeries.id,
          managerId: meetingSeries.managerId,
          reportId: meetingSeries.reportId,
          cadence: meetingSeries.cadence,
          status: meetingSeries.status,
          nextSessionAt: meetingSeries.nextSessionAt,
        })
        .from(meetingSeries)
        .innerJoin(users, eq(meetingSeries.reportId, users.id))
        .where(eq(meetingSeries.tenantId, session.user.tenantId))
        .orderBy(
          sql`CASE WHEN ${meetingSeries.nextSessionAt} IS NULL THEN 1 ELSE 0 END`,
          meetingSeries.nextSessionAt
        );

      // Fetch report info for all series
      const reportIds = [...new Set(seriesList.map((s) => s.reportId))];
      const reportUsers =
        reportIds.length > 0
          ? await tx
              .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                avatarUrl: users.avatarUrl,
              })
              .from(users)
              .where(sql`${users.id} IN ${reportIds}`)
          : [];

      const reportMap = new Map(reportUsers.map((u) => [u.id, u]));

      // Fetch latest session for each series
      const seriesIds = seriesList.map((s) => s.id);
      const latestSessions =
        seriesIds.length > 0
          ? await tx
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
              )
          : [];

      const latestMap = new Map(latestSessions.map((s) => [s.seriesId, s]));

      return seriesList.map((s) => {
        const report = reportMap.get(s.reportId);
        const latest = latestMap.get(s.id);
        return {
          id: s.id,
          managerId: s.managerId,
          cadence: s.cadence,
          status: s.status,
          nextSessionAt: s.nextSessionAt?.toISOString() ?? null,
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
        };
      });
    }
  );

  const showCreateButton = canManageSeries(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">
            Manage your 1:1 meeting series and sessions.
          </p>
        </div>
        {showCreateButton && (
          <Button asChild>
            <Link href="/sessions/new">
              <Plus className="mr-2 h-4 w-4" />
              New Series
            </Link>
          </Button>
        )}
      </div>

      <SeriesList
        initialSeries={seriesData}
        currentUserId={session.user.id}
      />
    </div>
  );
}
