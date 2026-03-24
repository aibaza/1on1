"use client";

import { useTranslations } from "next-intl";
import { Info, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { trendBadgeColor } from "@/lib/analytics/colors";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export interface SessionCompletionCardProps {
  completionRate: number;
  completedSessions: number;
  totalSessions: number;
  className?: string;
}

export function SessionCompletionCard({
  completionRate,
  completedSessions,
  totalSessions,
  className,
}: SessionCompletionCardProps) {
  const t = useTranslations("analytics.health");

  const missed = totalSessions - completedSessions;

  return (
    <div className={cn("bg-card p-6 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10 flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          {t("completion")}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
              {t("completionTooltip")}
            </TooltipContent>
          </Tooltip>
        </span>
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold",
          trendBadgeColor(completionRate >= 80 ? 1 : -1),
        )}>
          <TrendingUp className={cn("h-3 w-3", completionRate < 80 && "rotate-180")} />
          {completionRate}%
        </span>
      </div>

      {/* Spacer to push bar + legend to bottom */}
      <div className="flex-1" />

      {/* Segmented bar with numbers */}
      <div className="flex w-full h-6 rounded-md overflow-hidden mb-3">
        {completedSessions > 0 && (
          <div
            className="bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold"
            style={{ width: `${completionRate}%` }}
          >
            {completedSessions}
          </div>
        )}
        {missed > 0 && (
          <div
            className="bg-red-400 flex items-center justify-center text-white text-[10px] font-bold flex-1"
          >
            {missed}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-medium">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {t("completedLabel")}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          {t("missedLabel")}
        </span>
      </div>
    </div>
  );
}
