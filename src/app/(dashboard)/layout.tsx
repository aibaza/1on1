import { auth } from "@/lib/auth/config";
import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";
import { QueryProvider } from "@/providers/query-provider";
import { TopNav } from "@/components/layout/top-nav";
import { SideNav } from "@/components/layout/side-nav";
import { EditorialTopBar } from "@/components/layout/editorial-top-bar";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { TrialBanner } from "@/components/billing/trial-banner";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/search/command-palette";
import { ThemeColorProvider } from "@/components/theme-color-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDesignPreference } from "@/lib/design-preference.server";
import { isInTrial, isTrialExpired, trialDaysRemaining } from "@/lib/billing/subscription";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: validate session server-side even if proxy.ts should
  // have already redirected unauthenticated users (CVE-2025-29927 mitigation)
  const session = await auth();
  if (!session) redirect("/login");

  // Read tenant color theme, trial info + user avatar from DB
  let colorTheme = "neutral";
  let userAvatarUrl: string | null = null;
  let trialDays: number | null = null;
  let trialExpired = false;
  try {
    const [tenantData, userData] = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        return Promise.all([
          tx
            .select({
              settings: tenants.settings,
              plan: tenants.plan,
              trialEndsAt: tenants.trialEndsAt,
              isFounder: tenants.isFounder,
              founderDiscountPct: tenants.founderDiscountPct,
            })
            .from(tenants)
            .where(eq(tenants.id, session.user.tenantId))
            .limit(1)
            .then(r => r[0]),
          tx
            .select({ avatarUrl: users.avatarUrl })
            .from(users)
            .where(eq(users.id, session.user.id))
            .limit(1)
            .then(r => r[0]),
        ]);
      }
    );
    const settings = (tenantData?.settings ?? {}) as { colorTheme?: string };
    colorTheme = settings.colorTheme ?? "neutral";
    userAvatarUrl = userData?.avatarUrl ?? null;

    // Compute trial state server-side so client component stays pure
    if (tenantData) {
      const tenant = {
        plan: tenantData.plan,
        trialEndsAt: tenantData.trialEndsAt,
        isFounder: tenantData.isFounder,
        founderDiscountPct: tenantData.founderDiscountPct,
      };
      if (isInTrial(tenant) || isTrialExpired(tenant)) {
        trialDays = trialDaysRemaining(tenant);
        trialExpired = isTrialExpired(tenant);
      }
    }
  } catch {
    // Fall back to defaults if fetch fails
  }

  const designPref = await getDesignPreference();
  const isEditorial = designPref === "editorial";

  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <ThemeColorProvider colorTheme={colorTheme}>
          <TooltipProvider delayDuration={300}>
            {isEditorial ? (
              <div className="min-h-screen">
                <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:text-sm focus:font-bold">
                  Skip to content
                </a>
                <SideNav />
                <div className="md:ml-[var(--sidebar-width,256px)] transition-[margin] duration-300">
                  <EditorialTopBar avatarUrl={userAvatarUrl} />
                  <main id="main-content" className="pt-20 md:pt-24 pb-20 px-4 md:px-10">
                    <div className="max-w-7xl mx-auto">
                      <TrialBanner daysRemaining={trialDays} isExpired={trialExpired} />
                      <div className="animate-fade-in">{children}</div>
                    </div>
                  </main>
                </div>
              </div>
            ) : (
              <div className="min-h-screen flex flex-col">
                <ImpersonationBanner />
                <TopNav avatarUrl={userAvatarUrl} />
                <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
                  <div className="mx-auto max-w-7xl">
                    <TrialBanner daysRemaining={trialDays} isExpired={trialExpired} />
                    <div className="animate-fade-in">{children}</div>
                  </div>
                </main>
              </div>
            )}
          </TooltipProvider>
        </ThemeColorProvider>
        <CommandPalette />
        <Toaster />
      </QueryProvider>
    </SessionProvider>
  );
}
