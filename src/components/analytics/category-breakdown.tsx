"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

interface CategoryBreakdownProps {
  data: Array<{ category: string; avgScore: number; sampleCount: number; history: number[] }>;
}

function capitalizeCategory(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function scoreColor(score: number): string {
  if (score >= 4.0) return "var(--color-success)";
  if (score >= 3.0) return "var(--color-warning)";
  return "var(--color-danger)";
}

function BackgroundSparkline({ data, id }: { data: number[]; id: string }) {
  const chartData = useMemo(() => data.map((value, index) => ({ index, value })), [data]);
  if (data.length < 2) return null;
  const min = Math.max(0, Math.min(...data) - 0.3);
  const max = Math.min(5, Math.max(...data) + 0.3);
  const gradientId = `catSparkGrad-${id}`;
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

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const t = useTranslations("analytics");
  const format = useFormatter();

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        {t("chart.noData")}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => {
        const pct = (item.avgScore / 5) * 100;
        const color = scoreColor(item.avgScore);
        const limited = item.sampleCount < 3;
        const catId = item.category.replace(/\s+/g, "-").toLowerCase();

        return (
          <Card key={item.category} className="relative overflow-hidden">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">
                {capitalizeCategory(item.category)}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {format.number(item.avgScore, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {limited
                  ? t("chart.limited")
                  : t("chart.samples", { count: item.sampleCount })}
              </p>
            </CardContent>
            <BackgroundSparkline data={item.history} id={catId} />
          </Card>
        );
      })}
    </div>
  );
}
