import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CompanySettingsForm } from "./company-settings-form";
import { EditorialSettingsForm } from "./editorial-settings-form";
import { getTranslations } from "next-intl/server";
import { getDesignPreference } from "@/lib/design-preference.server";

export default async function CompanySettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  const t = await getTranslations("settings");

  if (session.user.level !== "admin") {
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

  const designPref = await getDesignPreference();
  const isEditorial = designPref === "editorial";

  const formData = {
    name: tenant.name,
    slug: tenant.slug,
    orgType: tenant.orgType,
    settings,
  };

  if (isEditorial) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-headline">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-base font-medium mt-2 max-w-xl leading-relaxed">
              {t("description")}
            </p>
          </div>
        </div>
        <EditorialSettingsForm initialData={formData} />
      </div>
    );
  }

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
      <CompanySettingsForm initialData={formData} />
    </div>
  );
}
