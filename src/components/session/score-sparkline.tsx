"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";

export interface ScoreSparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function ScoreSparkline({
  data,
  color = "var(--primary)",
  height = 40,
}: ScoreSparklineProps) {
  const chartData = useMemo(
    () => data.map((value, index) => ({ index, value })),
    [data]
  );

  if (data.length < 2) {
    return (
      <span className="text-sm text-muted-foreground" aria-label="Insufficient data for sparkline">
        &mdash;
      </span>
    );
  }

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const padding = (maxValue - minValue) * 0.1 || 0.5;

  return (
    <div style={{ width: "100%", height }} role="img" aria-label={`Score trend: ${data.join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis
            domain={[minValue - padding, maxValue + padding]}
            hide
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 3,
              fill: color,
              stroke: color,
            }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
