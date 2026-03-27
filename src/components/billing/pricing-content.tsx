"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PricingToggle } from "./pricing-toggle";
import { PlanCard, type PlanFeature } from "./plan-card";
import { FeatureComparison } from "./feature-comparison";
import { PricingFaq } from "./pricing-faq";

const FREE_FEATURES: PlanFeature[] = [
  { key: "managers", value: "1" },
  { key: "reportsPerManager", value: "3" },
  { key: "templates", value: "3" },
  { key: "aiSummaries", value: false as const },
  { key: "analytics", value: "Basic" },
  { key: "customBranding", value: false as const },
  { key: "apiAccess", value: false as const },
  { key: "prioritySupport", value: false as const },
];

const PRO_FEATURES: PlanFeature[] = [
  { key: "managers", value: "Unlimited" },
  { key: "reportsPerManager", value: "Unlimited" },
  { key: "templates", value: "Unlimited" },
  { key: "aiSummaries", value: true as const },
  { key: "analytics", value: "Full" },
  { key: "customBranding", value: false as const },
  { key: "apiAccess", value: false as const },
  { key: "prioritySupport", value: false as const },
];

const ENTERPRISE_FEATURES: PlanFeature[] = [
  { key: "managers", value: "Unlimited" },
  { key: "reportsPerManager", value: "Unlimited" },
  { key: "templates", value: "Unlimited" },
  { key: "aiSummaries", value: true as const },
  { key: "analytics", value: "Full" },
  { key: "customBranding", value: true as const },
  { key: "apiAccess", value: true as const },
  { key: "prioritySupport", value: true as const },
];

export function PricingContent() {
  const t = useTranslations("billing.pricing");
  const [isYearly, setIsYearly] = useState(false);

  return (
    <main>
      {/* Hero */}
      <section className="px-6 pt-16 pb-12 text-center md:pt-24 md:pb-16">
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
          {t("subtitle")}
        </p>

        {/* Toggle */}
        <div className="mt-10">
          <PricingToggle isYearly={isYearly} onToggle={setIsYearly} />
        </div>
      </section>

      {/* Plan Cards */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-8 md:grid-cols-3 md:items-start">
          <PlanCard
            slug="free"
            monthlyPrice={0}
            yearlyPrice={0}
            isYearly={isYearly}
            features={FREE_FEATURES}
          />
          <PlanCard
            slug="pro"
            monthlyPrice={2}
            yearlyPrice={1.67}
            isYearly={isYearly}
            features={PRO_FEATURES}
            popular
          />
          <PlanCard
            slug="enterprise"
            monthlyPrice={5}
            yearlyPrice={4}
            isYearly={isYearly}
            features={ENTERPRISE_FEATURES}
          />
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-2xl border border-border/50 bg-card p-2">
          <FeatureComparison />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <PricingFaq />
      </section>
    </main>
  );
}
