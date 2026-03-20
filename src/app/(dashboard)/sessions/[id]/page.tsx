import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isSeriesParticipant } from "@/lib/auth/rbac";
import { meetingSeries, sessions, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { SeriesDetail } from "@/components/series/series-detail";

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const seriesData = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      const seriesRows = await tx
        .select()
        .from(meetingSeries)
        .where(
          and(
            eq(meetingSeries.id, id),
            eq(meetingSeries.tenantId, session.user.tenantId)
          )
        )
        .limit(1);

      if (seriesRows.length === 0) return null;
      const series = seriesRows[0];

      // Authorization: admin can see all, others must be participant
      if (
        session.user.role !== "admin" &&
        !isSeriesParticipant(session.user.id, series)
      ) {
        return null;
      }

      const [managerRows, reportRows, sessionHistory] = await Promise.all([
        tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(eq(users.id, series.managerId))
          .limit(1),
        tx
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(eq(users.id, series.reportId))
          .limit(1),
        tx
          .select({
            id: sessions.id,
            sessionNumber: sessions.sessionNumber,
            scheduledAt: sessions.scheduledAt,
            completedAt: sessions.completedAt,
            status: sessions.status,
            sessionScore: sessions.sessionScore,
            durationMinutes: sessions.durationMinutes,
            aiSummary: sessions.aiSummary,
          })
          .from(sessions)
          .where(eq(sessions.seriesId, id))
          .orderBy(desc(sessions.sessionNumber)),
      ]);

      return {
        id: series.id,
        cadence: series.cadence,
        cadenceCustomDays: series.cadenceCustomDays,
        defaultDurationMinutes: series.defaultDurationMinutes,
        defaultTemplateId: series.defaultTemplateId,
        preferredDay: series.preferredDay,
        preferredTime: series.preferredTime,
        status: series.status,
        nextSessionAt: series.nextSessionAt?.toISOString() ?? null,
        createdAt: series.createdAt.toISOString(),
        updatedAt: series.updatedAt.toISOString(),
        manager: managerRows[0] ?? null,
        report: reportRows[0] ?? null,
        sessions: sessionHistory.map((s) => {
          let aiSnippet: string | null = null;
          let sentiment: string | null = null;
          if (s.aiSummary && typeof s.aiSummary === "object") {
            const summary = s.aiSummary as { keyTakeaways?: string[]; overallSentiment?: string };
            if (summary.keyTakeaways?.[0]) {
              aiSnippet = summary.keyTakeaways[0];
            }
            if (summary.overallSentiment) {
              sentiment = summary.overallSentiment;
            }
          }
          return {
            id: s.id,
            sessionNumber: s.sessionNumber,
            scheduledAt: s.scheduledAt.toISOString(),
            completedAt: s.completedAt?.toISOString() ?? null,
            status: s.status,
            sessionScore: s.sessionScore,
            durationMinutes: s.durationMinutes,
            aiSnippet,
            sentiment,
          };
        }),
      };
    }
  );

  if (!seriesData) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <SeriesDetail series={seriesData} currentUserId={session.user.id} />
    </div>
  );
}
