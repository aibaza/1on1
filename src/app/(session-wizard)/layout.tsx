import { auth } from "@/lib/auth/config";
import { SessionProvider } from "next-auth/react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeColorProvider } from "@/components/theme-color-provider";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants } from "@/lib/db/schema";
import { Toaster } from "@/components/ui/sonner";

export default async function WizardLayout({
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
    // Fall back to neutral
  }

  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <ThemeColorProvider colorTheme={colorTheme}>
          <div className="flex min-h-screen flex-col bg-[var(--background)]">{children}</div>
        </ThemeColorProvider>
        <Toaster />
      </QueryProvider>
    </SessionProvider>
  );
}
