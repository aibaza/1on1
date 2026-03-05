import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CompanySettingsForm } from "./company-settings-form";

export default async function CompanySettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

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
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Organization Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organization details and meeting defaults
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
