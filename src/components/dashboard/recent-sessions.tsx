"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecentSession } from "@/lib/queries/dashboard";
import { useTranslations, useFormatter } from "next-intl";

interface RecentSessionsProps {
  sessions: RecentSession[];
}

function scoreBadgeVariant(score: number): string {
  if (score >= 4) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (score >= 3) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  const t = useTranslations("dashboard.recent");
  const format = useFormatter();

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <FileText className="mx-auto mb-3 size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">{t("noSessions")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("noSessionsDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sessions.map((s) => (
        <Link
          key={s.id}
          href={`/sessions/${s.id}/summary`}
          className="flex items-center gap-3 rounded-md border px-4 py-3 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {s.reportName}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {format.dateTime(new Date(s.completedAt), { month: "short", day: "numeric" })}
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
              {format.number(s.sessionScore, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
            </Badge>
          )}
        </Link>
      ))}
    </div>
  );
}
