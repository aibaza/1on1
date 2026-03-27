"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

type CellValue = boolean | string;

type FeatureKey =
  | "managers"
  | "reportsPerManager"
  | "templates"
  | "aiSummaries"
  | "analytics"
  | "customBranding"
  | "apiAccess"
  | "prioritySupport";

interface FeatureRow {
  key: FeatureKey;
  free: CellValue;
  pro: CellValue;
  enterprise: CellValue;
}

const features: FeatureRow[] = [
  { key: "managers", free: "1", pro: "unlimited", enterprise: "unlimited" },
  { key: "reportsPerManager", free: "3", pro: "unlimited", enterprise: "unlimited" },
  { key: "templates", free: "3", pro: "unlimited", enterprise: "unlimited" },
  { key: "aiSummaries", free: false, pro: true, enterprise: true },
  { key: "analytics", free: "basic", pro: "full", enterprise: "full" },
  { key: "customBranding", free: false, pro: false, enterprise: true },
  { key: "apiAccess", free: false, pro: false, enterprise: true },
  { key: "prioritySupport", free: false, pro: false, enterprise: true },
];

function CellContent({ value, t }: { value: CellValue; t: ReturnType<typeof useTranslations<"billing.pricing">> }) {
  if (value === true) {
    return <Check className="mx-auto h-5 w-5 text-[var(--color-success)]" />;
  }
  if (value === false) {
    return <X className="mx-auto h-5 w-5 text-muted-foreground/30" />;
  }
  // String values like "1", "3", "unlimited", "basic", "full"
  const labelMap: Record<string, string> = {
    unlimited: t("unlimited"),
    basic: t("basic"),
    full: t("full"),
  };
  const display = labelMap[value] ?? value;
  return <span className="text-sm font-medium text-foreground">{display}</span>;
}

export function FeatureComparison() {
  const t = useTranslations("billing.pricing");

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-center">
        <thead>
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
              {t("compareFeatures")}
            </th>
            <th className="px-6 py-4 text-sm font-bold text-foreground">
              {t("plans.free.name")}
            </th>
            <th className="px-6 py-4 text-sm font-bold text-primary">
              {t("plans.pro.name")}
            </th>
            <th className="px-6 py-4 text-sm font-bold text-foreground">
              {t("plans.enterprise.name")}
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((row) => (
            <tr
              key={row.key}
              className="border-t border-border/50 transition-colors hover:bg-muted/30"
            >
              <td className="px-6 py-4 text-left text-sm text-foreground">
                {t(`features.${row.key}` as const)}
              </td>
              <td className="px-6 py-4">
                <CellContent value={row.free} t={t} />
              </td>
              <td className="px-6 py-4 bg-primary/[0.02]">
                <CellContent value={row.pro} t={t} />
              </td>
              <td className="px-6 py-4">
                <CellContent value={row.enterprise} t={t} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
