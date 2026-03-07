import { auth } from "@/lib/auth/config";
import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeColorProvider } from "@/components/theme-color-provider";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Fullscreen layout — auth-required, no TopNav or padding.
 * Used for full-page editors like the AI template editor.
 */
export default async function FullscreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

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
    // Non-critical — fall back to neutral theme
  }

  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <ThemeColorProvider colorTheme={colorTheme}>
          {children}
          <Toaster />
        </ThemeColorProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
