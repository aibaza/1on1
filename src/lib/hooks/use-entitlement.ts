"use client";

import { getPlanFeatures, getLimit, hasFeature } from "@/lib/billing/plans";
import type { PlanFeatures } from "@/lib/billing/plans";

/**
 * Client-side hook to check feature entitlements for a given plan.
 * Takes the plan name as a parameter (from tenant context / session).
 */
export function useEntitlement(plan: string) {
  const features = getPlanFeatures(plan);

  return {
    plan,
    features,
    hasFeature: (feature: keyof PlanFeatures) => hasFeature(plan, feature),
    getLimit: (feature: "seats" | "managers" | "templates") =>
      getLimit(plan, feature),
  };
}
