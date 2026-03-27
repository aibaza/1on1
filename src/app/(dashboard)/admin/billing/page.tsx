import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { adminDb } from "@/lib/db";
import { tenants } from "@/lib/db/schema/tenants";
import { subscriptions } from "@/lib/db/schema/billing";
import { eq } from "drizzle-orm";
import { computeMRR, formatCentsToEuro } from "@/lib/billing/metrics";
import { getTranslations } from "next-intl/server";
import { BillingMetrics } from "@/components/admin/billing-metrics";
import { CustomerList } from "@/components/admin/customer-list";

export default async function AdminBillingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!isSuperAdmin(session.user.email)) {
    redirect("/overview");
  }

  const t = await getTranslations("billing.admin");

  // Fetch all tenants with their subscriptions (cross-tenant, no RLS)
  const allTenants = await adminDb.select().from(tenants);
  const allSubscriptions = await adminDb.select().from(subscriptions);

  // Build a map of tenantId -> subscription
  const subsByTenant = new Map(
    allSubscriptions.map((s) => [s.tenantId, s])
  );

  // Compute metrics
  const mrr = computeMRR(allSubscriptions);
  const activeCount = allSubscriptions.filter(
    (s) => s.status === "active"
  ).length;
  const trialingCount = allSubscriptions.filter(
    (s) => s.status === "trialing"
  ).length;
  const pastDueCount = allSubscriptions.filter(
    (s) => s.status === "past_due"
  ).length;
  const founderCount = allTenants.filter((t) => t.isFounder).length;

  // Build customer rows for the table
  const customers = allTenants.map((tenant) => {
    const sub = subsByTenant.get(tenant.id);
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      isFounder: tenant.isFounder,
      founderDiscountPct: tenant.founderDiscountPct,
      createdAt: tenant.createdAt.toISOString(),
      subscriptionStatus: sub?.status ?? null,
      mrrCents: sub?.mrrCents ?? 0,
      seats: sub?.seats ?? 0,
      billingCycle: sub?.billingCycle ?? null,
    };
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-headline">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-base font-medium mt-2 max-w-xl leading-relaxed">
            Platform-level billing overview
          </p>
        </div>
      </div>

      <BillingMetrics
        mrr={formatCentsToEuro(mrr)}
        arr={formatCentsToEuro(mrr * 12)}
        activeCount={activeCount}
        trialingCount={trialingCount}
        pastDueCount={pastDueCount}
        founderCount={founderCount}
      />

      <div className="mt-8">
        <CustomerList customers={customers} />
      </div>
    </div>
  );
}
