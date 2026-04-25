import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants } from "@/lib/db/schema";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import {
  getOverdueActionItems,
  getQuickStats,
  getRecentSessions,
  getStatsTrends,
} from "@/lib/queries/dashboard";
import { getSeriesCardData } from "@/lib/queries/series";
import { EditorialDashboard } from "./editorial-dashboard";

export default async function OverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { user } = session;

  const [tenant, dashboardData] = await Promise.all([
    adminDb.query.tenants.findFirst({
      where: eq(tenants.id, user.tenantId),
      columns: { name: true },
    }),
    withTenantContext(user.tenantId, user.id, async (tx) => {
      const [upcoming, overdue, stats, recent, trends] = await Promise.all([
        getSeriesCardData(tx, user.tenantId, {
          upcomingOnly: true,
          limit: 3,
          myOnly: true,
          userId: user.id,
        }),
        getOverdueActionItems(tx, user.id, user.level),
        getQuickStats(tx, user.id, user.level),
        getRecentSessions(tx, user.id, user.level),
        getStatsTrends(tx, user.id, user.level),
      ]);
      return { upcoming, overdue, stats, recent, trends };
    }),
  ]);

  return (
    <>
      {!user.emailVerified && <EmailVerificationBanner />}
      <EditorialDashboard
        user={{ id: user.id, name: user.name, level: user.level }}
        tenantName={tenant?.name ?? null}
        stats={dashboardData.stats}
        trends={dashboardData.trends}
        upcoming={dashboardData.upcoming}
        overdue={dashboardData.overdue}
        recent={dashboardData.recent}
      />
    </>
  );
}
