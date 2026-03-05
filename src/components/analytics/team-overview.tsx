"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { TeamAverage } from "@/lib/analytics/queries";

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
        ? "Anonymized averages require at least 2 contributors per category to protect privacy."
        : "No completed sessions with scored answers in this period.";
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
          <Card key={item.category}>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">
                {capitalizeCategory(item.category)}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {item.avgScore.toFixed(1)}
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
                  ? `Limited data (${item.memberCount} contributor${item.memberCount === 1 ? "" : "s"})`
                  : `${item.memberCount} contributors`}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
