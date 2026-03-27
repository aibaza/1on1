import type { InferSelectModel } from "drizzle-orm";
import type { tenants } from "@/lib/db/schema";
import { getPlanFeatures } from "./plans";

export type Tenant = Pick<
  InferSelectModel<typeof tenants>,
  "plan" | "isFounder" | "founderDiscountPct" | "trialEndsAt"
>;

/**
 * Get the effective plan for a tenant, considering founder status.
 * Founders with any discount use their assigned plan directly.
 */
export function getEffectivePlan(tenant: Tenant): string {
  if (tenant.isFounder) return tenant.plan;
  return tenant.plan;
}

/**
 * Check if a tenant's trial has expired.
 * Returns false if no trial was started or tenant is a founder.
 */
export function isTrialExpired(tenant: Tenant): boolean {
  if (tenant.isFounder) return false;
  if (!tenant.trialEndsAt) return false;
  return new Date(tenant.trialEndsAt).getTime() < Date.now();
}

/**
 * Check if a tenant is in an active trial.
 */
export function isInTrial(tenant: Tenant): boolean {
  if (tenant.isFounder) return false;
  if (!tenant.trialEndsAt) return false;
  return new Date(tenant.trialEndsAt).getTime() >= Date.now();
}

/**
 * Get remaining trial days (0 if expired or no trial).
 */
export function trialDaysRemaining(tenant: Tenant): number {
  if (tenant.isFounder || !tenant.trialEndsAt) return 0;
  const ms = new Date(tenant.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Check if a tenant needs to pay (trial expired, not founder with 100%).
 * Founder with 100% discount never needs to pay.
 */
export function needsPayment(tenant: Tenant): boolean {
  if (tenant.isFounder && tenant.founderDiscountPct === 100) return false;
  if (tenant.plan === "free") return false;
  return isTrialExpired(tenant);
}

/**
 * Check if a tenant can access a specific feature based on their plan.
 * During trial, all features are unlocked regardless of plan.
 */
export function canAccessFeature(
  tenant: Tenant,
  feature: string
): boolean {
  if (tenant.isFounder) return true;
  if (isInTrial(tenant)) return true;
  const plan = getEffectivePlan(tenant);
  const features = getPlanFeatures(plan);
  return feature in features
    ? !!(features as Record<string, unknown>)[feature]
    : false;
}
