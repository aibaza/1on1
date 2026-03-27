import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { adminDb } from "@/lib/db";
import { tenants } from "@/lib/db/schema/tenants";
import { subscriptions, invoices, billingEvents } from "@/lib/db/schema/billing";
import { eq, desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { CustomerDetail } from "@/components/admin/customer-detail";
import { FounderControls } from "@/components/admin/founder-controls";

interface Props {
  params: Promise<{ tenantId: string }>;
}

export default async function AdminBillingDetailPage({ params }: Props) {
  const { tenantId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!isSuperAdmin(session.user.email)) {
    redirect("/overview");
  }

  const t = await getTranslations("billing.admin");

  // Fetch tenant, subscription, invoices, and billing events
  const [tenant] = await adminDb
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    redirect("/admin/billing");
  }

  const [subscription] = await adminDb
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tenantId))
    .limit(1);

  const tenantInvoices = await adminDb
    .select()
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId))
    .orderBy(desc(invoices.createdAt));

  const tenantEvents = await adminDb
    .select()
    .from(billingEvents)
    .where(eq(billingEvents.tenantId, tenantId))
    .orderBy(desc(billingEvents.createdAt));

  const tenantData = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    orgType: tenant.orgType,
    isFounder: tenant.isFounder,
    founderDiscountPct: tenant.founderDiscountPct,
    paddleCustomerId: tenant.paddleCustomerId,
    billingEmail: tenant.billingEmail,
    createdAt: tenant.createdAt.toISOString(),
  };

  const subscriptionData = subscription
    ? {
        id: subscription.id,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        seats: subscription.seats,
        mrrCents: subscription.mrrCents,
        paddleSubscriptionId: subscription.paddleSubscriptionId,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        trialStart: subscription.trialStart?.toISOString() ?? null,
        trialEnd: subscription.trialEnd?.toISOString() ?? null,
        canceledAt: subscription.canceledAt?.toISOString() ?? null,
        createdAt: subscription.createdAt.toISOString(),
      }
    : null;

  const invoiceData = tenantInvoices.map((inv) => ({
    id: inv.id,
    status: inv.status as "draft" | "open" | "paid" | "past_due" | "canceled",
    currency: inv.currency,
    totalCents: inv.totalCents,
    subtotalCents: inv.subtotalCents,
    taxCents: inv.taxCents,
    invoicePdfUrl: inv.invoicePdfUrl,
    periodStart: inv.periodStart?.toISOString() ?? null,
    periodEnd: inv.periodEnd?.toISOString() ?? null,
    paidAt: inv.paidAt?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
  }));

  const eventData = tenantEvents.map((evt) => ({
    id: evt.id,
    eventType: evt.eventType,
    metadata: evt.metadata as Record<string, unknown>,
    createdAt: evt.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-headline">
            {tenant.name}
          </h1>
          <p className="text-muted-foreground text-base font-medium mt-2">
            {tenant.slug} &middot; {tenant.plan}
          </p>
        </div>
      </div>

      <div className="grid gap-8">
        <CustomerDetail
          tenant={tenantData}
          subscription={subscriptionData}
          invoices={invoiceData}
          events={eventData}
        />

        <FounderControls
          tenantId={tenant.id}
          isFounder={tenant.isFounder}
          founderDiscountPct={tenant.founderDiscountPct}
          plan={tenant.plan}
        />
      </div>
    </div>
  );
}
