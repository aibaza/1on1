"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Crown, Users, Calendar, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InvoiceTable } from "./invoice-table";
import { PlanSelector } from "./plan-selector";

interface SubscriptionData {
  status: string;
  billingCycle: string | null;
  currentPeriodEnd: string | null;
  seats: number;
  cancelAtPeriodEnd: boolean;
}

interface PlanOption {
  slug: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  paddlePriceIdMonthly: string | null;
  paddlePriceIdYearly: string | null;
  features: string[];
}

interface InvoiceData {
  id: string;
  status: "draft" | "open" | "paid" | "past_due" | "canceled";
  currency: string;
  totalCents: number;
  invoicePdfUrl: string | null;
  createdAt: string;
}

interface BillingSettingsClientProps {
  tenantId: string;
  currentPlan: string;
  planDisplayName: string;
  isFounder: boolean;
  founderDiscountPct: number;
  subscription: SubscriptionData | null;
  usedSeats: number;
  seatLimit: number;
  plans: PlanOption[];
  invoices: InvoiceData[];
  customerEmail: string;
  priceFormatted: string;
}

function SubscriptionStatusBadge({
  status,
  t,
}: {
  status: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const variant =
    status === "active"
      ? "default"
      : status === "trialing"
        ? "secondary"
        : status === "past_due" || status === "unpaid"
          ? "destructive"
          : "outline";

  const labelMap: Record<string, string> = {
    active: t("active"),
    trialing: t("trialing"),
    past_due: t("pastDue"),
    unpaid: t("unpaid"),
    canceled: t("canceled"),
    paused: t("paused"),
    free: t("free"),
  };

  return <Badge variant={variant}>{labelMap[status] ?? status}</Badge>;
}

export function BillingSettingsClient({
  tenantId,
  currentPlan,
  planDisplayName,
  isFounder,
  founderDiscountPct,
  subscription,
  usedSeats,
  seatLimit,
  plans,
  invoices,
  customerEmail,
  priceFormatted,
}: BillingSettingsClientProps) {
  const t = useTranslations("billing.settings");
  const [planSelectorOpen, setPlanSelectorOpen] = useState(false);

  const effectiveStatus = subscription?.status ?? "free";
  const billingCycle = subscription?.billingCycle;
  const nextRenewal = subscription?.currentPeriodEnd;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="h-5 w-5" />
              {t("currentPlan")}
            </CardTitle>
            <SubscriptionStatusBadge status={effectiveStatus} t={t} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold font-headline">
                {planDisplayName}
              </p>
              {priceFormatted && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {priceFormatted}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isFounder && (
                <Badge
                  variant="secondary"
                  className="gap-1"
                >
                  <Crown className="h-3 w-3" />
                  {t("founder")}
                  {founderDiscountPct > 0 && (
                    <span className="ml-0.5">
                      {t("founderDiscount", { percent: founderDiscountPct })}
                    </span>
                  )}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Seats */}
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t("seats")}</p>
              <p className="text-sm text-muted-foreground">
                {seatLimit === -1
                  ? t("seatsUnlimited", { used: usedSeats })
                  : t("seatsUsed", { used: usedSeats, limit: seatLimit })}
              </p>
            </div>
          </div>

          {/* Billing Cycle */}
          {billingCycle && (
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t("billingCycle")}</p>
                <p className="text-sm text-muted-foreground">
                  {billingCycle === "yearly" ? t("yearly") : t("monthly")}
                  {nextRenewal && (
                    <>
                      {" \u2022 "}
                      {t("nextRenewal")}:{" "}
                      {new Date(nextRenewal).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => setPlanSelectorOpen(true)}>
              {t("changePlan")}
            </Button>
            {subscription?.status === "active" && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/billing/portal", {
                      method: "POST",
                    });
                    const data = await res.json();
                    if (data.url) {
                      window.open(data.url, "_blank");
                    }
                  } catch {
                    // Portal not available — silently ignore
                  }
                }}
              >
                {t("manageSubscription")}
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Canceled info */}
          {subscription?.cancelAtPeriodEnd && (
            <p className="text-sm text-destructive mt-2">
              {t("canceledInfo")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t("invoices")}</h2>
        <InvoiceTable invoices={invoices} />
      </div>

      {/* Plan Selector Modal */}
      <PlanSelector
        open={planSelectorOpen}
        onOpenChange={setPlanSelectorOpen}
        currentPlan={currentPlan}
        plans={plans}
        customerEmail={customerEmail}
        tenantId={tenantId}
        seats={subscription?.seats ?? 1}
      />
    </div>
  );
}
