import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import {
  tenants,
  subscriptions,
  invoices,
  plans as plansTable,
  users,
} from "@/lib/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getPlanFeatures } from "@/lib/billing/plans";
import { BillingSettingsClient } from "@/components/billing/billing-settings-client";

export default async function BillingSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.level !== "admin") {
    redirect("/overview");
  }

  const t = await getTranslations("billing.settings");
  const st = await getTranslations("settings");

  const data = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      // Fetch tenant
      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, session.user.tenantId))
        .limit(1);

      if (!tenant) return null;

      // Fetch subscription
      const [subscription] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, session.user.tenantId))
        .limit(1);

      // Fetch invoices (most recent first)
      const invoiceList = await tx
        .select({
          id: invoices.id,
          status: invoices.status,
          currency: invoices.currency,
          totalCents: invoices.totalCents,
          invoicePdfUrl: invoices.invoicePdfUrl,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .where(eq(invoices.tenantId, session.user.tenantId))
        .orderBy(desc(invoices.createdAt))
        .limit(50);

      // Fetch available plans
      const availablePlans = await tx
        .select()
        .from(plansTable)
        .where(eq(plansTable.isActive, true))
        .orderBy(plansTable.sortOrder);

      // Count active users (seats used)
      const [userCount] = await tx
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.tenantId, session.user.tenantId),
            eq(users.isActive, true)
          )
        );

      return {
        tenant,
        subscription: subscription ?? null,
        invoices: invoiceList,
        plans: availablePlans,
        usedSeats: userCount?.count ?? 0,
      };
    }
  );

  if (!data) {
    redirect("/overview");
  }

  const { tenant, subscription, invoices: invoiceList, plans: dbPlans, usedSeats } = data;
  const features = getPlanFeatures(tenant.plan);

  // Build plan options for the selector
  const planOptions = dbPlans.map((p) => {
    const pf = getPlanFeatures(p.slug);
    const featureLabels: string[] = [];
    if (pf.seats === -1) featureLabels.push("Unlimited seats");
    else if (pf.seats > 0) featureLabels.push(`Up to ${pf.seats} seats`);
    if (pf.ai) featureLabels.push("AI insights");
    if (pf.analytics === "full") featureLabels.push("Full analytics");
    if (pf.branding) featureLabels.push("Custom branding");
    if (pf.api) featureLabels.push("API access");

    return {
      slug: p.slug,
      name: p.name,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      paddlePriceIdMonthly: p.paddlePriceIdMonthly,
      paddlePriceIdYearly: p.paddlePriceIdYearly,
      features: featureLabels,
    };
  });

  // Format price display
  let priceFormatted = "";
  if (subscription?.billingCycle && subscription.billingCycle !== null) {
    const matchingPlan = dbPlans.find((p) => p.id === subscription.planId);
    if (matchingPlan) {
      const cents =
        subscription.billingCycle === "yearly"
          ? matchingPlan.priceYearly
          : matchingPlan.priceMonthly;
      const symbol = matchingPlan.currency === "eur" ? "\u20AC" : "$";
      priceFormatted = `${symbol}${(cents / 100).toFixed(2)}${
        subscription.billingCycle === "yearly" ? t("perYear") : t("perMonth")
      }`;
    }
  }

  // Find current plan display name
  const currentDbPlan = dbPlans.find((p) => p.slug === tenant.plan);
  const planDisplayName = currentDbPlan?.name ?? tenant.plan;

  const content = (
    <BillingSettingsClient
      tenantId={tenant.id}
      currentPlan={tenant.plan}
      planDisplayName={planDisplayName}
      isFounder={tenant.isFounder}
      founderDiscountPct={tenant.founderDiscountPct}
      subscription={
        subscription
          ? {
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
              seats: subscription.seats,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            }
          : null
      }
      usedSeats={usedSeats}
      seatLimit={features.seats}
      plans={planOptions}
      invoices={invoiceList.map((inv) => ({
        ...inv,
        createdAt: inv.createdAt.toISOString(),
      }))}
      customerEmail={tenant.billingEmail ?? session.user.email ?? ""}
      priceFormatted={priceFormatted}
    />
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <nav className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
            <span>{st("title")}</span>
            <span className="text-xs">&rsaquo;</span>
            <span className="text-foreground font-medium">{t("title")}</span>
          </nav>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-headline">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-base font-medium mt-2 max-w-xl leading-relaxed">
            {t("description")}
          </p>
        </div>
      </div>
      {content}
    </div>
  );
}
