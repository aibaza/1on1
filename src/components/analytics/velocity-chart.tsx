"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface VelocityChartProps {
  data: Array<{ month: string; avgDays: number; count: number }>;
  loading?: boolean;
}

export function VelocityChart({ data, loading }: VelocityChartProps) {
  if (loading) {
    return <Skeleton className="h-[300px] w-full rounded-lg" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No action item velocity data available for this period.
      </div>
    );
  }

  const maxDays = Math.max(...data.map((d) => d.avgDays));

  return (
    <div className="h-[200px] md:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
        >
          <defs>
            <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--primary)"
                stopOpacity={0.8}
              />
              <stop
                offset="100%"
                stopColor="var(--primary)"
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
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
              return d.toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              });
            }}
          />
          <YAxis
            domain={[0, Math.ceil(maxDays * 1.2) || 14]}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            width={36}
            tickFormatter={(val: number) => `${val}d`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const point = payload[0].payload as {
                month: string;
                avgDays: number;
                count: number;
              };
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                  <p className="font-medium">{point.month}</p>
                  <p className="text-muted-foreground">
                    Avg: {point.avgDays} days
                  </p>
                  <p className="text-muted-foreground">
                    {point.count} {point.count === 1 ? "item" : "items"} completed
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={7}
            stroke="hsl(142, 76%, 36%)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{
              value: "7d target",
              position: "insideTopRight",
              className: "text-xs fill-muted-foreground",
            }}
          />
          <Area
            type="monotone"
            dataKey="avgDays"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#velocityGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
