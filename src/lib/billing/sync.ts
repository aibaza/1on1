import { eq } from "drizzle-orm";
import {
  subscriptions,
  invoices,
  plans,
  tenants,
} from "@/lib/db/schema";
import type { adminDb } from "@/lib/db";

type AdminDb = typeof adminDb;

/**
 * Map a Paddle subscription status to our local enum.
 * Paddle uses: active, canceled, past_due, paused, trialing.
 * Our enum: trialing, active, past_due, unpaid, canceled, paused.
 */
function mapSubscriptionStatus(
  paddleStatus: string
): "trialing" | "active" | "past_due" | "unpaid" | "canceled" | "paused" {
  const mapping: Record<string, "trialing" | "active" | "past_due" | "unpaid" | "canceled" | "paused"> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    paused: "paused",
  };
  return mapping[paddleStatus] ?? "active";
}

/**
 * Determine billing cycle from a Paddle subscription's billing period or items.
 */
function determineBillingCycle(
  paddleSubscription: Record<string, unknown>
): "monthly" | "yearly" | null {
  // Check items for interval info
  const items = paddleSubscription.items as Array<{
    price?: { billingCycle?: { interval?: string; frequency?: number } };
  }> | undefined;

  if (items?.[0]?.price?.billingCycle) {
    const cycle = items[0].price.billingCycle;
    if (cycle.interval === "year" || (cycle.interval === "month" && cycle.frequency === 12)) {
      return "yearly";
    }
    return "monthly";
  }
  return null;
}

/**
 * Sync a Paddle subscription event to the local database.
 * Upserts subscription record and updates the tenant plan.
 */
export async function syncSubscription(
  paddleSubscription: Record<string, unknown>,
  db: AdminDb
) {
  const paddleSubId = paddleSubscription.id as string;
  const paddleCustomerId = paddleSubscription.customerId as string;
  const status = mapSubscriptionStatus(paddleSubscription.status as string);
  const billingCycle = determineBillingCycle(paddleSubscription);

  // Resolve tenant by paddleCustomerId
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.paddleCustomerId, paddleCustomerId))
    .limit(1);

  if (!tenant) {
    console.error(
      `[billing/sync] No tenant found for Paddle customer ${paddleCustomerId}`
    );
    return;
  }

  // Resolve plan from Paddle price ID
  const items = paddleSubscription.items as Array<{
    price?: { id?: string };
  }> | undefined;
  const priceId = items?.[0]?.price?.id;

  let planId: string | null = null;
  let planSlug: string | null = null;

  if (priceId) {
    const [matchedPlan] = await db
      .select({ id: plans.id, slug: plans.slug })
      .from(plans)
      .where(eq(plans.paddlePriceIdMonthly, priceId))
      .limit(1);

    if (matchedPlan) {
      planId = matchedPlan.id;
      planSlug = matchedPlan.slug;
    } else {
      const [matchedYearly] = await db
        .select({ id: plans.id, slug: plans.slug })
        .from(plans)
        .where(eq(plans.paddlePriceIdYearly, priceId))
        .limit(1);

      if (matchedYearly) {
        planId = matchedYearly.id;
        planSlug = matchedYearly.slug;
      }
    }
  }

  // Parse period dates
  const currentPeriodStart = paddleSubscription.currentBillingPeriod
    ? new Date(
        (paddleSubscription.currentBillingPeriod as { startsAt?: string })
          .startsAt ?? ""
      )
    : null;
  const currentPeriodEnd = paddleSubscription.currentBillingPeriod
    ? new Date(
        (paddleSubscription.currentBillingPeriod as { endsAt?: string })
          .endsAt ?? ""
      )
    : null;

  // Calculate MRR in cents
  const totalAmountStr =
    (paddleSubscription.recurringTransactionDetails as { totals?: { total?: string } })
      ?.totals?.total;
  const totalAmount = totalAmountStr ? parseInt(totalAmountStr, 10) : 0;
  const mrrCents = billingCycle === "yearly" ? Math.round(totalAmount / 12) : totalAmount;

  // Upsert subscription
  const existing = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.paddleSubscriptionId, paddleSubId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(subscriptions)
      .set({
        status,
        billingCycle,
        planId,
        currentPeriodStart,
        currentPeriodEnd,
        canceledAt: paddleSubscription.canceledAt
          ? new Date(paddleSubscription.canceledAt as string)
          : null,
        cancelAtPeriodEnd:
          (paddleSubscription.scheduledChange as { action?: string })?.action === "cancel",
        mrrCents,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.paddleSubscriptionId, paddleSubId));
  } else {
    await db.insert(subscriptions).values({
      tenantId: tenant.id,
      paddleSubscriptionId: paddleSubId,
      paddleCustomerId,
      planId,
      status,
      billingCycle,
      currentPeriodStart,
      currentPeriodEnd,
      seats: 1,
      mrrCents,
    });
  }

  // Update tenant plan if we resolved a plan slug
  if (planSlug) {
    // Cast to valid plan enum — only update if it matches a known enum value
    const validPlans = ["free", "starter", "pro", "enterprise"] as const;
    type PlanEnum = (typeof validPlans)[number];
    if (validPlans.includes(planSlug as PlanEnum)) {
      await db
        .update(tenants)
        .set({
          plan: planSlug as PlanEnum,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenant.id));
    }
  }

  // If canceled, set tenant back to free
  if (status === "canceled") {
    await db
      .update(tenants)
      .set({ plan: "free", updatedAt: new Date() })
      .where(eq(tenants.id, tenant.id));
  }
}

/**
 * Sync a Paddle transaction event to the local invoices table.
 * Upserts invoice record based on paddleTransactionId.
 */
export async function syncTransaction(
  paddleTransaction: Record<string, unknown>,
  status: "paid" | "past_due",
  db: AdminDb
) {
  const paddleTransactionId = paddleTransaction.id as string;
  const paddleCustomerId = paddleTransaction.customerId as string;
  const subscriptionId = paddleTransaction.subscriptionId as string | undefined;

  // Resolve tenant
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.paddleCustomerId, paddleCustomerId))
    .limit(1);

  if (!tenant) {
    console.error(
      `[billing/sync] No tenant found for Paddle customer ${paddleCustomerId}`
    );
    return;
  }

  // Resolve local subscription ID if present
  let localSubId: string | null = null;
  if (subscriptionId) {
    const [sub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.paddleSubscriptionId, subscriptionId))
      .limit(1);
    if (sub) localSubId = sub.id;
  }

  // Extract amounts from details
  const details = paddleTransaction.details as {
    totals?: {
      subtotal?: string;
      tax?: string;
      total?: string;
    };
  } | undefined;

  const subtotalCents = details?.totals?.subtotal
    ? parseInt(details.totals.subtotal, 10)
    : 0;
  const taxCents = details?.totals?.tax
    ? parseInt(details.totals.tax, 10)
    : 0;
  const totalCents = details?.totals?.total
    ? parseInt(details.totals.total, 10)
    : 0;

  const currency =
    (paddleTransaction.currencyCode as string)?.toLowerCase() ?? "eur";

  // Parse billing period
  const billingPeriod = paddleTransaction.billingPeriod as {
    startsAt?: string;
    endsAt?: string;
  } | undefined;

  // Upsert invoice
  const existing = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.paddleTransactionId, paddleTransactionId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(invoices)
      .set({
        status,
        subtotalCents,
        taxCents,
        totalCents,
        paidAt: status === "paid" ? new Date() : null,
      })
      .where(eq(invoices.paddleTransactionId, paddleTransactionId));
  } else {
    await db.insert(invoices).values({
      tenantId: tenant.id,
      subscriptionId: localSubId,
      paddleTransactionId,
      status,
      currency,
      subtotalCents,
      taxCents,
      totalCents,
      periodStart: billingPeriod?.startsAt
        ? new Date(billingPeriod.startsAt)
        : null,
      periodEnd: billingPeriod?.endsAt
        ? new Date(billingPeriod.endsAt)
        : null,
      paidAt: status === "paid" ? new Date() : null,
    });
  }
}
