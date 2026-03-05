"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

interface CategoryBreakdownProps {
  data: Array<{ category: string; avgScore: number; sampleCount: number }>;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function capitalizeCategory(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No completed sessions with scored answers in this period.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: capitalizeCategory(d.category),
    limited: d.sampleCount < 3,
  }));

  return (
    <div className="h-[200px] md:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 12, bottom: 8, left: 80 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted/30"
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 5]}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            width={75}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as (typeof chartData)[number];
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                  <p className="font-medium">{d.label}</p>
                  <p className="text-muted-foreground">
                    Avg: {d.avgScore.toFixed(2)}
                  </p>
                  <p className="text-muted-foreground">
                    {d.sampleCount} {d.sampleCount === 1 ? "sample" : "samples"}
                    {d.limited && " (limited data)"}
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="avgScore"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={entry.category}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                opacity={entry.limited ? 0.5 : 1}
                strokeDasharray={entry.limited ? "4 2" : undefined}
                stroke={entry.limited ? CHART_COLORS[index % CHART_COLORS.length] : undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
