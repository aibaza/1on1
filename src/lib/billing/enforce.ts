import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { getEffectivePlan, needsPayment, canAccessFeature } from "./subscription";
import { getLimit } from "./plans";
import type { PlanFeatures } from "./plans";

/**
 * Fetch tenant billing fields needed for plan checks.
 * Returns null if tenant not found.
 */
async function fetchTenantBilling(tenantId: string) {
  const [tenant] = await adminDb
    .select({
      plan: tenants.plan,
      isFounder: tenants.isFounder,
      founderDiscountPct: tenants.founderDiscountPct,
      trialEndsAt: tenants.trialEndsAt,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  return tenant ?? null;
}

/**
 * Check if tenant's plan is active (not expired trial). Returns 402 response or null.
 */
export async function requireActivePlan(
  tenantId: string
): Promise<NextResponse | null> {
  const tenant = await fetchTenantBilling(tenantId);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (needsPayment(tenant)) {
    return NextResponse.json(
      { error: "Subscription required", code: "PAYMENT_REQUIRED" },
      { status: 402 }
    );
  }
  return null;
}

/**
 * Check seat limit before adding a new user/invite. Returns 402 response with details or null.
 */
export async function checkSeatLimit(
  tenantId: string
): Promise<NextResponse | null> {
  const tenant = await fetchTenantBilling(tenantId);
  if (!tenant) return null;

  const plan = getEffectivePlan(tenant);
  const limit = getLimit(plan, "seats");
  if (limit === -1) return null; // unlimited

  const [result] = await adminDb
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)));

  if (result.value >= limit) {
    return NextResponse.json(
      {
        error: "Seat limit reached",
        code: "SEAT_LIMIT",
        limit,
        used: result.value,
      },
      { status: 402 }
    );
  }
  return null;
}

/**
 * Check if a specific feature is available on the tenant's plan.
 * Returns 402 response or null.
 */
export async function requireFeature(
  tenantId: string,
  feature: keyof PlanFeatures
): Promise<NextResponse | null> {
  const tenant = await fetchTenantBilling(tenantId);
  if (!tenant) return null;

  if (!canAccessFeature(tenant, feature)) {
    return NextResponse.json(
      {
        error: "Feature not available on current plan",
        code: "UPGRADE_REQUIRED",
        feature,
      },
      { status: 402 }
    );
  }
  return null;
}
