"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Calendar, TrendingUp } from "lucide-react";
import type { QuickStats as QuickStatsData, StatsTrends } from "@/lib/queries/dashboard";
import { useTranslations, useFormatter } from "next-intl";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { useMemo } from "react";

interface QuickStatsProps {
  stats: QuickStatsData;
  trends?: StatsTrends;
}

function BackgroundSparkline({ data }: { data: number[] }) {
  const chartData = useMemo(
    () => data.map((value, index) => ({ index, value })),
    [data]
  );

  if (data.length < 2) return null;

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const padding = (maxValue - minValue) * 0.1 || 0.5;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 opacity-[0.08]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[minValue - padding, maxValue + padding]} hide />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#sparkGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function QuickStats({ stats, trends }: QuickStatsProps) {
  const t = useTranslations("dashboard.quickStats");
  const format = useFormatter();

  const items = [
    {
      label: t("directReports"),
      value: stats.totalReports.toString(),
      icon: Users,
      history: trends?.reportsHistory,
    },
    {
      label: t("sessionsThisMonth"),
      value: stats.sessionsThisMonth.toString(),
      icon: Calendar,
      history: trends?.sessionsHistory,
    },
    {
      label: t("averageScore"),
      value: stats.avgScore !== null ? format.number(stats.avgScore, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : t("na"),
      icon: TrendingUp,
      history: trends?.scoresHistory,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="relative overflow-hidden transition-shadow duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
            <item.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
          </CardContent>
          {item.history && <BackgroundSparkline data={item.history} />}
        </Card>
      ))}
    </div>
  );
}
