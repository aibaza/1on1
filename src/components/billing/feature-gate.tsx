"use client";

import { hasFeature } from "@/lib/billing/plans";
import type { PlanFeatures } from "@/lib/billing/plans";
import { UpgradePrompt } from "./upgrade-prompt";

interface FeatureGateProps {
  /** Current tenant plan name */
  plan: string;
  /** Feature key to check */
  feature: keyof PlanFeatures;
  /** How to handle gated content: hide, blur overlay, or show upgrade prompt */
  mode?: "hide" | "blur" | "upgrade";
  children: React.ReactNode;
}

/**
 * Client-side feature gate. Wraps children and conditionally renders
 * based on whether the tenant's plan includes the specified feature.
 *
 * - "hide": renders nothing when feature is unavailable
 * - "blur": renders children with blur overlay + upgrade CTA
 * - "upgrade": renders an upgrade prompt card instead of children
 */
export function FeatureGate({
  plan,
  feature,
  mode = "hide",
  children,
}: FeatureGateProps) {
  const allowed = hasFeature(plan, feature);

  if (allowed) {
    return <>{children}</>;
  }

  switch (mode) {
    case "hide":
      return null;

    case "blur":
      return (
        <div className="relative">
          <div className="pointer-events-none select-none blur-sm" aria-hidden>
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <UpgradePrompt feature={feature} compact />
          </div>
        </div>
      );

    case "upgrade":
      return <UpgradePrompt feature={feature} />;

    default:
      return null;
  }
}
