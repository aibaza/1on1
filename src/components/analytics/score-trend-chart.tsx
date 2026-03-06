"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatter, useTranslations } from "next-intl";

interface ScoreTrendChartProps {
  data: Array<{ date: string; score: number }>;
  loading?: boolean;
}

export function ScoreTrendChart({ data, loading }: ScoreTrendChartProps) {
  const format = useFormatter();
  const t = useTranslations("analytics.chart");

  if (loading) {
    return <Skeleton className="h-[300px] w-full rounded-lg" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        {t("noScoreData")}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="h-[200px] md:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted/30"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickFormatter={(val: string) =>
                format.dateTime(new Date(val), {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              domain={[1, 5]}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              width={32}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const point = payload[0].payload as {
                  date: string;
                  score: number;
                };
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                    <p className="font-medium">
                      {format.dateTime(new Date(point.date), {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-muted-foreground">
                      {t("score", {
                        value: format.number(point.score, {
                          maximumFractionDigits: 2,
                        }),
                      })}
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--primary)" }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {data.length < 3 && (
        <p className="text-center text-xs text-muted-foreground">
          {t("moreData")}
        </p>
      )}
    </div>
  );
}
