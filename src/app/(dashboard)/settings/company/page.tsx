import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CompanySettingsForm } from "./company-settings-form";
import { getTranslations } from "next-intl/server";

export default async function CompanySettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  const t = await getTranslations("settings");

  if (session.user.role !== "admin") {
    redirect("/overview");
  }

  const tenant = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      const [result] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, session.user.tenantId))
        .limit(1);
      return result;
    }
  );

  if (!tenant) {
    redirect("/overview");
  }

  const settings = (tenant.settings ?? {}) as {
    timezone?: string;
    defaultCadence?: string;
    defaultDurationMinutes?: number;
    preferredLanguage?: string;
    colorTheme?: string;
    companyContext?: string;
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <CompanySettingsForm
        initialData={{
          name: tenant.name,
          slug: tenant.slug,
          orgType: tenant.orgType,
          settings,
        }}
      />
    </div>
  );
}
