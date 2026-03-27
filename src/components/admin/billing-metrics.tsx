"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface BillingMetricsProps {
  mrr: string;
  arr: string;
  activeCount: number;
  trialingCount: number;
  pastDueCount: number;
  founderCount: number;
}

function MetricCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string | number;
  variant?: "default" | "danger";
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-bold font-headline tracking-tight",
          variant === "danger" && Number(value) > 0
            ? "text-destructive"
            : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function BillingMetrics({
  mrr,
  arr,
  activeCount,
  trialingCount,
  pastDueCount,
  founderCount,
}: BillingMetricsProps) {
  const t = useTranslations("billing.admin.metrics");

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <MetricCard label={t("mrr")} value={mrr} />
      <MetricCard label={t("arr")} value={arr} />
      <MetricCard label={t("activeCustomers")} value={activeCount} />
      <MetricCard label={t("trialingCustomers")} value={trialingCount} />
      <MetricCard
        label={t("pastDue")}
        value={pastDueCount}
        variant="danger"
      />
      <MetricCard label={t("founders")} value={founderCount} />
    </div>
  );
}
