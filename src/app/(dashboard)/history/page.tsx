import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isAdmin } from "@/lib/auth/rbac";
import {
  sessions,
  meetingSeries,
  users,
} from "@/lib/db/schema";
import { eq, and, or, desc, inArray } from "drizzle-orm";
import { HistoryPage } from "@/components/history/history-page";
import { EditorialHistoryPage } from "@/components/history/editorial-history-page";
import { getTranslations } from "next-intl/server";
import { getDesignPreference } from "@/lib/design-preference.server";

export default async function HistoryServerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations("history");
  const designPref = await getDesignPreference();
  const isEditorial = designPref === "editorial";

  const data = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      // Fetch all series the user participates in
      const userIsAdmin = isAdmin(session.user.role);

      let seriesFilter;
      if (userIsAdmin) {
        seriesFilter = eq(meetingSeries.tenantId, session.user.tenantId);
      } else {
        seriesFilter = and(
          eq(meetingSeries.tenantId, session.user.tenantId),
          or(
            eq(meetingSeries.managerId, session.user.id),
            eq(meetingSeries.reportId, session.user.id)
          )
        );
      }

      const userSeries = await tx
        .select({
          id: meetingSeries.id,
          managerId: meetingSeries.managerId,
          reportId: meetingSeries.reportId,
        })
        .from(meetingSeries)
        .where(seriesFilter!);

      // Fetch user names for reports in each series (for the filter dropdown)
      const reportIds = [...new Set(userSeries.map((s) => s.reportId))];
      const managerIds = [...new Set(userSeries.map((s) => s.managerId))];
      const allUserIds = [...new Set([...reportIds, ...managerIds])];

      const userRows = allUserIds.length > 0
        ? await tx
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
            })
            .from(users)
            .where(inArray(users.id, allUserIds))
        : [];
      const userMap = new Map(userRows.map((u) => [u.id, u]));

      const seriesOptions = userSeries.map((s) => {
        const report = userMap.get(s.reportId);
        const manager = userMap.get(s.managerId);
        return {
          id: s.id,
          reportName: report
            ? `${report.firstName} ${report.lastName}`
            : "Unknown",
          managerName: manager
            ? `${manager.firstName} ${manager.lastName}`
            : "Unknown",
        };
      });

      // Fetch initial session data (first page, no filters)
      const userSeriesIds = userSeries.map((s) => s.id);

      if (userSeriesIds.length === 0) {
        return {
          initialSessions: [],
          seriesScores: {} as Record<string, number[]>,
          hasMore: false,
          nextCursor: null as string | null,
          seriesOptions,
        };
      }

      const sessionRows = await tx
        .select({
          id: sessions.id,
          sessionNumber: sessions.sessionNumber,
          scheduledAt: sessions.scheduledAt,
          completedAt: sessions.completedAt,
          status: sessions.status,
          sessionScore: sessions.sessionScore,
          durationMinutes: sessions.durationMinutes,
          seriesId: sessions.seriesId,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.tenantId, session.user.tenantId),
            inArray(sessions.seriesId, userSeriesIds)
          )
        )
        .orderBy(desc(sessions.scheduledAt), desc(sessions.id))
        .limit(21);

      const hasMore = sessionRows.length > 20;
      const pagedSessions = hasMore ? sessionRows.slice(0, 20) : sessionRows;
      const nextCursor = hasMore
        ? pagedSessions[pagedSessions.length - 1].id
        : null;

      // Fetch sparkline scores per series
      const resultSeriesIds = [...new Set(pagedSessions.map((s) => s.seriesId))];
      const seriesScores: Record<string, number[]> = {};
      for (const sid of resultSeriesIds) {
        const scoreRows = await tx
          .select({
            sessionNumber: sessions.sessionNumber,
            sessionScore: sessions.sessionScore,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.seriesId, sid),
              eq(sessions.status, "completed")
            )
          )
          .orderBy(desc(sessions.sessionNumber))
          .limit(6);

        seriesScores[sid] = scoreRows
          .reverse()
          .filter((r) => r.sessionScore !== null)
          .map((r) => Number(r.sessionScore));
      }

      // Build enriched sessions
      const seriesMap = new Map(userSeries.map((s) => [s.id, s]));

      const enrichedSessions = pagedSessions.map((s) => {
        const seriesData = seriesMap.get(s.seriesId);
        const manager = seriesData ? userMap.get(seriesData.managerId) : null;
        const report = seriesData ? userMap.get(seriesData.reportId) : null;

        return {
          id: s.id,
          sessionNumber: s.sessionNumber,
          scheduledAt: s.scheduledAt.toISOString(),
          completedAt: s.completedAt?.toISOString() ?? null,
          status: s.status,
          sessionScore: s.sessionScore ? Number(s.sessionScore) : null,
          durationMinutes: s.durationMinutes,
          seriesId: s.seriesId,
          reportFirstName: report?.firstName ?? "",
          reportLastName: report?.lastName ?? "",
          managerFirstName: manager?.firstName ?? "",
          managerLastName: manager?.lastName ?? "",
        };
      });

      return {
        initialSessions: enrichedSessions,
        seriesScores,
        hasMore,
        nextCursor,
        seriesOptions,
      };
    }
  );

  if (isEditorial) {
    return (
      <EditorialHistoryPage
        initialSessions={data.initialSessions}
        initialSeriesScores={data.seriesScores}
        initialHasMore={data.hasMore}
        initialNextCursor={data.nextCursor}
        seriesOptions={data.seriesOptions}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <HistoryPage
        initialSessions={data.initialSessions}
        initialSeriesScores={data.seriesScores}
        initialHasMore={data.hasMore}
        initialNextCursor={data.nextCursor}
        seriesOptions={data.seriesOptions}
      />
    </div>
  );
}
