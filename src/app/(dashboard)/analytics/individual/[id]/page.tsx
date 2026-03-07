import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { eq, and, sql } from "drizzle-orm";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users, meetingSeries, sessions } from "@/lib/db/schema";
import {
  getScoreTrend,
  getCategoryAverages,
  getActionItemVelocity,
  getMeetingAdherence,
  getSessionHistoryTable,
} from "@/lib/analytics/queries";
import { periodToDateRange } from "@/lib/analytics/period";
import { IndividualAnalyticsClient } from "./client";

export default async function IndividualAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: targetUserId } = await params;
  const { user } = session;

  // Authorization
  if (user.role === "member" && user.id !== targetUserId) {
    redirect(`/analytics/individual/${user.id}`);
  }

  const data = await withTenantContext(
    user.tenantId,
    user.id,
    async (tx) => {
      // Verify target user exists
      const [targetUser] = await tx
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          jobTitle: users.jobTitle,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (!targetUser) return null;

      // For managers: verify target is a direct report
      if (user.role === "manager" && user.id !== targetUserId) {
        const series = await tx
          .select({ id: meetingSeries.id })
          .from(meetingSeries)
          .where(
            and(
              eq(meetingSeries.managerId, user.id),
              eq(meetingSeries.reportId, targetUserId),
            ),
          )
          .limit(1);

        if (series.length === 0) return null;
      }

      // Default period: last 3 months
      const range = periodToDateRange("3mo");
      const startDate = range.startDate.toISOString().split("T")[0]!;
      const endDate = range.endDate.toISOString().split("T")[0]!;

      // Use "member" role to scope velocity/adherence to this specific user
      const effectiveRole = targetUserId === user.id ? user.role : "member";

      const [scoreTrend, categoryAverages, sessionList, velocity, adherence, historyTable] = await Promise.all([
        getScoreTrend(tx, targetUserId, startDate, endDate),
        getCategoryAverages(tx, targetUserId, startDate, endDate),
        tx
          .select({
            id: sessions.id,
            date: sql<string>`to_char(${sessions.completedAt}, 'YYYY-MM-DD')`,
            number: sessions.sessionNumber,
          })
          .from(sessions)
          .where(
            and(
              eq(sessions.status, "completed"),
              sql`${sessions.seriesId} IN (
                SELECT id FROM meeting_series WHERE report_id = ${targetUserId}
              )`,
            ),
          )
          .orderBy(sessions.completedAt),
        getActionItemVelocity(tx, targetUserId, effectiveRole, startDate, endDate),
        getMeetingAdherence(tx, targetUserId, effectiveRole, startDate, endDate),
        getSessionHistoryTable(tx, targetUserId),
      ]);

      return {
        targetUser,
        scoreTrend,
        categoryAverages,
        sessions: sessionList.filter((s) => s.date !== null),
        velocity,
        adherence,
        historyTable,
      };
    },
  );

  if (!data) notFound();

  return (
    <IndividualAnalyticsClient
      targetUser={data.targetUser}
      initialScoreTrend={data.scoreTrend}
      initialCategoryAverages={data.categoryAverages}
      initialSessions={data.sessions}
      initialVelocity={data.velocity}
      initialAdherence={data.adherence}
      initialHistoryTable={data.historyTable}
      targetUserId={targetUserId}
    />
  );
}
