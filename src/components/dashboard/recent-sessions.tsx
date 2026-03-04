"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecentSession } from "@/lib/queries/dashboard";

interface RecentSessionsProps {
  sessions: RecentSession[];
}

function scoreBadgeVariant(score: number): string {
  if (score >= 4) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (score >= 3) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

function formatCompletedDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <FileText className="mx-auto mb-3 size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">No completed sessions yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Complete your first session to see recent activity
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sessions.map((s) => (
        <Link
          key={s.id}
          href={`/sessions/${s.seriesId}/history/${s.id}`}
          className="flex items-center gap-3 rounded-md border px-4 py-3 transition-colors hover:bg-muted/50"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {s.reportName}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {formatCompletedDate(s.completedAt)}
              </span>
            </div>
            {s.aiSummarySnippet && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {s.aiSummarySnippet}
              </p>
            )}
          </div>
          {s.sessionScore !== null && (
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0 tabular-nums",
                scoreBadgeVariant(s.sessionScore)
              )}
            >
              {s.sessionScore.toFixed(1)}
            </Badge>
          )}
        </Link>
      ))}
    </div>
  );
}
