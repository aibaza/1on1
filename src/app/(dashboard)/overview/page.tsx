import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants } from "@/lib/db/schema";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { OverdueItems } from "@/components/dashboard/overdue-items";
import { RecentSessions } from "@/components/dashboard/recent-sessions";
import { UpcomingSeriesCards } from "@/components/dashboard/upcoming-series-cards";
import {
  getOverdueActionItems,
  getQuickStats,
  getRecentSessions,
  getStatsTrends,
} from "@/lib/queries/dashboard";
import { getSeriesCardData } from "@/lib/queries/series";
import { getTranslations } from "next-intl/server";
import { getDesignPreference } from "@/lib/design-preference.server";
import { EditorialDashboard } from "./editorial-dashboard";

export default async function OverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { user } = session;

  const t = await getTranslations("dashboard");

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
        getOverdueActionItems(tx, user.id, user.role),
        getQuickStats(tx, user.id, user.role),
        getRecentSessions(tx, user.id, user.role),
        getStatsTrends(tx, user.id, user.role),
      ]);
      return { upcoming, overdue, stats, recent, trends };
    }),
  ]);

  const designPref = await getDesignPreference();

  if (designPref === "editorial") {
    return (
      <>
        {!user.emailVerified && <EmailVerificationBanner />}
        <EditorialDashboard
          user={{ name: user.name, role: user.role }}
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

  return (
    <div>
      {!user.emailVerified && <EmailVerificationBanner />}

      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {user.name ? t("welcome", { name: user.name }) : t("welcomeFallback")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tenant?.name ?? t("welcomeFallback")} &middot;{" "}
          <span className="capitalize">{user.role}</span>
        </p>
      </div>

      {/* 1. Quick Stats */}
      <section className="mb-8">
        <QuickStats stats={dashboardData.stats} trends={dashboardData.trends} />
      </section>

      {/* 2. Upcoming Sessions */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-medium">{t("upcomingSessions")}</h2>
        <UpcomingSeriesCards
          series={dashboardData.upcoming}
          currentUserId={user.id}
        />
      </section>

      {/* 3. Overdue Items (only if any exist) */}
      {dashboardData.overdue.length > 0 && (
        <section className="mb-8">
          <OverdueItems groups={dashboardData.overdue} />
        </section>
      )}

      {/* 4. Recent Sessions */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-medium">{t("recentSessions")}</h2>
        <RecentSessions sessions={dashboardData.recent} />
      </section>
    </div>
  );
}
