export type PlanFeatures = {
  seats: number; // -1 = unlimited
  managers: number; // -1 = unlimited
  templates: number; // -1 = unlimited
  ai: boolean;
  analytics: "basic" | "full";
  branding?: boolean;
  api?: boolean;
};

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  free: {
    seats: 4,
    managers: 1,
    templates: 3,
    ai: false,
    analytics: "basic",
  },
  starter: {
    seats: 10,
    managers: 3,
    templates: 10,
    ai: false,
    analytics: "full",
  },
  pro: {
    seats: 50,
    managers: -1,
    templates: -1,
    ai: false,
    analytics: "full",
  },
  enterprise: {
    seats: -1,
    managers: -1,
    templates: -1,
    ai: true,
    analytics: "full",
    branding: true,
    api: true,
  },
};

export function getPlanFeatures(plan: string): PlanFeatures {
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;
}

export function hasFeature(
  plan: string,
  feature: keyof PlanFeatures
): boolean {
  const features = getPlanFeatures(plan);
  const value = features[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return !!value;
}

export function getLimit(
  plan: string,
  feature: "seats" | "managers" | "templates"
): number {
  return getPlanFeatures(plan)[feature];
}
