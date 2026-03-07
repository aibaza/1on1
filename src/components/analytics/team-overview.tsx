"use client";

import { useTranslations, useFormatter } from "next-intl";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import type { TeamAverage } from "@/lib/analytics/queries";

function BackgroundSparkline({ data, id }: { data: number[]; id: string }) {
  const chartData = useMemo(() => data.map((value, index) => ({ index, value })), [data]);
  if (data.length < 2) return null;
  const min = Math.max(0, Math.min(...data) - 0.3);
  const max = Math.min(5, Math.max(...data) + 0.3);
  const gradientId = `teamSparkGrad-${id}`;
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[30%] opacity-[0.20] dark:opacity-[0.35]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[min, max]} hide />
          <Area type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TeamOverviewProps {
  data: TeamAverage[];
  loading?: boolean;
  anonymize?: boolean;
  memberCount?: number;
}

function capitalizeCategory(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function scoreColor(score: number): string {
  if (score >= 4.0) return "var(--color-success)";
  if (score >= 3.0) return "var(--color-warning)";
  return "var(--color-danger)";
}

export function TeamOverview({ data, loading, anonymize, memberCount }: TeamOverviewProps) {
  const t = useTranslations("analytics");
  const format = useFormatter();
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-2 w-full animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    const message =
      anonymize
        ? t("chart.anonymizedNote")
        : t("chart.noData");
    return (
      <div className="flex h-[120px] items-center justify-center text-center text-sm text-muted-foreground">
        {message}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => {
        const pct = (item.avgScore / 5) * 100;
        const color = scoreColor(item.avgScore);
        const limited = item.memberCount < 3;

        return (
          <Card key={item.category} className="relative overflow-hidden">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">
                {capitalizeCategory(item.category)}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {format.number(item.avgScore, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
              </p>
              {/* Score bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              {/* Member count / limited data footnote */}
              <p className="mt-1.5 text-xs text-muted-foreground">
                {limited
                  ? t("chart.limitedData", { count: item.memberCount })
                  : t("chart.contributors", { count: item.memberCount })}
              </p>
            </CardContent>
            <BackgroundSparkline data={item.history} id={item.category} />
          </Card>
        );
      })}
    </div>
  );
}
