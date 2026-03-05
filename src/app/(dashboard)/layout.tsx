import { auth } from "@/lib/auth/config";
import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";
import { QueryProvider } from "@/providers/query-provider";
import { TopNav } from "@/components/layout/top-nav";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/search/command-palette";
import { ThemeColorProvider } from "@/components/theme-color-provider";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <ThemeColorProvider colorTheme={colorTheme}>
          <div className="min-h-screen flex flex-col">
            <TopNav />
            <main className="flex-1 p-6">
              <div className="mx-auto max-w-7xl">{children}</div>
            </main>
          </div>
        </ThemeColorProvider>
        <CommandPalette />
        <Toaster />
      </QueryProvider>
    </SessionProvider>
  );
}
