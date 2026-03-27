"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PricingToggle } from "./pricing-toggle";
import { usePaddleCheckout } from "./paddle-checkout";

interface PlanOption {
  slug: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  paddlePriceIdMonthly: string | null;
  paddlePriceIdYearly: string | null;
  features: string[];
}

interface PlanSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  plans: PlanOption[];
  customerEmail?: string;
  tenantId: string;
  seats?: number;
}

export function PlanSelector({
  open,
  onOpenChange,
  currentPlan,
  plans,
  customerEmail,
  tenantId,
  seats = 1,
}: PlanSelectorProps) {
  const t = useTranslations("billing.settings.planSelector");
  const pt = useTranslations("billing.pricing");
  const [isYearly, setIsYearly] = useState(false);

  const { openCheckout, isReady } = usePaddleCheckout({
    customerEmail,
    customData: { tenantId },
  });

  function handleSelect(plan: PlanOption) {
    const priceId = isYearly
      ? plan.paddlePriceIdYearly
      : plan.paddlePriceIdMonthly;

    if (!priceId) return;

    openCheckout(priceId, seats);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl font-bold">
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <PricingToggle isYearly={isYearly} onToggle={setIsYearly} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.slug === currentPlan;
            const price = isYearly ? plan.priceYearly : plan.priceMonthly;
            const isFree = plan.slug === "free";
            const priceId = isYearly
              ? plan.paddlePriceIdYearly
              : plan.paddlePriceIdMonthly;

            return (
              <div
                key={plan.slug}
                className={cn(
                  "relative flex flex-col rounded-xl border p-5 transition-all",
                  isCurrent
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                )}
              >
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline text-lg font-bold">
                      {plan.name}
                    </h3>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-xs">
                        {t("current")}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    {isFree ? (
                      <span className="font-headline text-3xl font-extrabold">
                        {pt("free")}
                      </span>
                    ) : (
                      <>
                        <span className="font-headline text-3xl font-extrabold">
                          &euro;{(price / 100).toFixed(0)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {isYearly
                            ? pt("perUserYear")
                            : pt("perUserMonth")}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="mb-4 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-success)]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isCurrent ? "outline" : "default"}
                  size="sm"
                  disabled={isCurrent || isFree || !isReady || !priceId}
                  onClick={() => handleSelect(plan)}
                  className="w-full"
                >
                  {isCurrent ? t("current") : t("select")}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
