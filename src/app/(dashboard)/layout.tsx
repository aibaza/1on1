import { auth } from "@/lib/auth/config";
import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";
import { QueryProvider } from "@/providers/query-provider";
import { TopNav } from "@/components/layout/top-nav";
import { SideNav } from "@/components/layout/side-nav";
import { EditorialTopBar } from "@/components/layout/editorial-top-bar";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/search/command-palette";
import { ThemeColorProvider } from "@/components/theme-color-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDesignPreference } from "@/lib/design-preference.server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: validate session server-side even if proxy.ts should
  // have already redirected unauthenticated users (CVE-2025-29927 mitigation)
  const session = await auth();
  if (!session) redirect("/login");

  // Read tenant color theme for ThemeColorProvider
  let colorTheme = "neutral";
  try {
    const tenant = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [result] = await tx
          .select({ settings: tenants.settings })
          .from(tenants)
          .where(eq(tenants.id, session.user.tenantId))
          .limit(1);
        return result;
      }
    );
    const settings = (tenant?.settings ?? {}) as { colorTheme?: string };
    colorTheme = settings.colorTheme ?? "neutral";
  } catch {
    // Fall back to neutral if tenant fetch fails
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
                <div className="relative z-[60]">
                  <ImpersonationBanner />
                </div>
                <SideNav />
                <div className="ml-64">
                  <EditorialTopBar />
                  <main className="pt-24 pb-20 px-10">
                    <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
                  </main>
                </div>
              </div>
            ) : (
              <div className="min-h-screen flex flex-col">
                <ImpersonationBanner />
                <TopNav />
                <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
                  <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
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
