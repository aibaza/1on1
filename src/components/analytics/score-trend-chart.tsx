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

interface ScoreTrendChartProps {
  data: Array<{ date: string; score: number }>;
  loading?: boolean;
}

export function ScoreTrendChart({ data, loading }: ScoreTrendChartProps) {
  if (loading) {
    return <Skeleton className="h-[300px] w-full rounded-lg" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No score data available for this period.
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
              tickFormatter={(val: string) => {
                const d = new Date(val);
                return d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
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
                      {new Date(point.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-muted-foreground">
                      Score: {point.score.toFixed(2)}
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
          More data after 3+ sessions
        </p>
      )}
    </div>
  );
}
