"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type FeatureKey =
  | "managers"
  | "reportsPerManager"
  | "templates"
  | "aiSummaries"
  | "analytics"
  | "customBranding"
  | "apiAccess"
  | "prioritySupport";

export interface PlanFeature {
  key: FeatureKey;
  value: boolean | string;
}

interface PlanCardProps {
  slug: "free" | "pro" | "business";
  monthlyPrice: number;
  yearlyPrice: number;
  isYearly: boolean;
  features: PlanFeature[];
  popular?: boolean;
}

export function PlanCard({
  slug,
  monthlyPrice,
  yearlyPrice,
  isYearly,
  features,
  popular = false,
}: PlanCardProps) {
  const t = useTranslations("billing.pricing");

  const price = isYearly ? yearlyPrice : monthlyPrice;
  const isFree = slug === "free";

  const ctaLabel = isFree
    ? t("getStarted")
    : slug === "business"
      ? t("contactSales")
      : t("startTrial");

  const ctaHref = isFree
    ? "/register"
    : slug === "business"
      ? "/register?plan=business"
      : `/register?plan=${slug}`;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-8 transition-all",
        popular
          ? "border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02]"
          : "border-border shadow-sm hover:shadow-md"
      )}
    >
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1">
          {t("mostPopular")}
        </Badge>
      )}

      {/* Plan name and description */}
      <div className="mb-6">
        <h3 className="font-headline text-xl font-bold text-foreground">
          {t(`plans.${slug}.name`)}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(`plans.${slug}.description`)}
        </p>
      </div>

      {/* Price */}
      <div className="mb-8">
        <div className="flex items-baseline gap-1">
          {isFree ? (
            <span className="font-headline text-5xl font-extrabold tracking-tight text-foreground">
              {t("free")}
            </span>
          ) : (
            <>
              <span className="font-headline text-5xl font-extrabold tracking-tight text-foreground">
                &euro;{price}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("perUserMonth")}
              </span>
            </>
          )}
        </div>
        {!isFree && isYearly && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("billedAnnually")}
          </p>
        )}
      </div>

      {/* CTA */}
      <Link
        href={ctaHref}
        className={cn(
          "mb-8 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all group",
          popular
            ? "text-white shadow-md hover:shadow-lg active:scale-95"
            : "border border-border text-foreground hover:bg-accent active:scale-95"
        )}
        style={
          popular
            ? {
                background:
                  "linear-gradient(135deg, var(--primary, #29407d) 0%, var(--editorial-primary-container, #425797) 100%)",
              }
            : undefined
        }
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* Features */}
      <ul className="flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature.key} className="flex items-center gap-3 text-sm">
            {feature.value === false ? (
              <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            ) : (
              <Check className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
            )}
            <span
              className={cn(
                feature.value === false
                  ? "text-muted-foreground/60"
                  : "text-foreground"
              )}
            >
              {t(`features.${feature.key}` as const)}
              {typeof feature.value === "string" && (
                <span className="ml-1 text-muted-foreground">
                  ({feature.value})
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
