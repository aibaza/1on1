"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatter, useTranslations } from "next-intl";

interface AdherenceChartProps {
  data: Array<{
    month: string;
    completed: number;
    cancelled: number;
    missed: number;
    adherencePercent: number;
  }>;
  loading?: boolean;
}

const STATUS_COLORS = {
  completed: "var(--color-success)",
  cancelled: "var(--color-warning)",
  missed: "var(--color-danger)",
} as const;

export function AdherenceChart({ data, loading }: AdherenceChartProps) {
  const format = useFormatter();
  const t = useTranslations("analytics.chart");

  if (loading) {
    return <Skeleton className="h-[300px] w-full rounded-lg" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        {t("noAdherenceData")}
      </div>
    );
  }

  const legendLabels: Record<string, string> = {
    completed: t("completed"),
    cancelled: t("cancelled"),
    missed: t("missed"),
  };

  return (
    <div className="h-[200px] md:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted/30"
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            tickFormatter={(val: string) => {
              const [year, month] = val.split("-");
              const d = new Date(parseInt(year!), parseInt(month!) - 1);
              return format.dateTime(d, {
                month: "short",
                year: "2-digit",
              });
            }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const point = payload[0].payload as {
                month: string;
                completed: number;
                cancelled: number;
                missed: number;
                adherencePercent: number;
              };
              const [year, month] = point.month.split("-");
              const d = new Date(parseInt(year!), parseInt(month!) - 1);
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                  <p className="font-medium">
                    {format.dateTime(d, { month: "long", year: "numeric" })}
                  </p>
                  <p style={{ color: "var(--color-success)" }}>
                    {t("completed")}: {format.number(point.completed)}
                  </p>
                  <p style={{ color: "var(--color-warning)" }}>
                    {t("cancelled")}: {format.number(point.cancelled)}
                  </p>
                  <p style={{ color: "var(--color-danger)" }}>
                    {t("missed")}: {format.number(point.missed)}
                  </p>
                  <p className="mt-1 font-medium text-muted-foreground">
                    {t("adherencePercent", { value: format.number(point.adherencePercent) })}
                  </p>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value: string) => legendLabels[value] ?? value}
          />
          <Bar
            dataKey="completed"
            stackId="status"
            fill={STATUS_COLORS.completed}
            isAnimationActive={false}
          />
          <Bar
            dataKey="cancelled"
            stackId="status"
            fill={STATUS_COLORS.cancelled}
            isAnimationActive={false}
          />
          <Bar
            dataKey="missed"
            stackId="status"
            fill={STATUS_COLORS.missed}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
