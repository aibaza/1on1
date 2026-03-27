"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlanFeatures } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  /** Which feature triggered the gate */
  feature: keyof PlanFeatures;
  /** Compact mode for overlay usage (no card wrapper) */
  compact?: boolean;
}

/**
 * Displays an upgrade prompt when a feature is not available on the current plan.
 */
export function UpgradePrompt({ feature, compact }: UpgradePromptProps) {
  const t = useTranslations("billing.gate");

  // Determine which plan is needed based on feature
  const needsPlan = getRequiredPlan(feature);
  const description =
    needsPlan === "business"
      ? t("featureRequiresBusiness")
      : t("featureRequiresPro");

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg bg-background/80 p-4 backdrop-blur-sm">
        <Lock className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">
          {description}
        </p>
        <Button asChild size="sm">
          <Link href="/pricing">{t("upgrade")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "mx-auto max-w-sm border-dashed text-center"
      )}
    >
      <CardHeader className="pb-3">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <CardTitle className="text-base">{t("upgradeRequired")}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/pricing">{t("upgrade")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Maps feature keys to the minimum plan that includes them.
 * Used to show the right plan name in the upgrade prompt.
 */
function getRequiredPlan(feature: keyof PlanFeatures): "starter" | "business" {
  switch (feature) {
    case "branding":
    case "api":
      return "business";
    default:
      return "starter";
  }
}
