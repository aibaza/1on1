import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants } from "@/lib/db/schema";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { UpcomingSessions } from "@/components/dashboard/upcoming-sessions";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { OverdueItems } from "@/components/dashboard/overdue-items";
import { RecentSessions } from "@/components/dashboard/recent-sessions";
import {
  getUpcomingSessions,
  getOverdueActionItems,
  getQuickStats,
  getRecentSessions,
} from "@/lib/queries/dashboard";

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
      const [upcoming, overdue, stats, recent] = await Promise.all([
        getUpcomingSessions(tx, user.id, user.role, user.tenantId),
        getOverdueActionItems(tx, user.id, user.role),
        getQuickStats(tx, user.id, user.role),
        getRecentSessions(tx, user.id, user.role),
      ]);
      return { upcoming, overdue, stats, recent };
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {!user.emailVerified && <EmailVerificationBanner />}

      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tenant?.name ?? "Your organization"} &middot;{" "}
          <span className="capitalize">{user.role}</span>
        </p>
      </div>

      {/* 1. Upcoming Sessions (primary section) */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-medium">Upcoming Sessions</h2>
        <UpcomingSessions sessions={dashboardData.upcoming} />
      </section>

      {/* 2. Quick Stats */}
      <section className="mb-8">
        <QuickStats stats={dashboardData.stats} />
      </section>

      {/* 3. Overdue Items (only if any exist) */}
      {dashboardData.overdue.length > 0 && (
        <section className="mb-8">
          <OverdueItems groups={dashboardData.overdue} />
        </section>
      )}

      {/* 4. Recent Sessions */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-medium">Recent Sessions</h2>
        <RecentSessions sessions={dashboardData.recent} />
      </section>
    </div>
  );
}
