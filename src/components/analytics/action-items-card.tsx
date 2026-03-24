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

export interface ActionItemsCardProps {
  actionItemRate: number;
  className?: string;
}

export function ActionItemsCard({
  actionItemRate,
  className,
}: ActionItemsCardProps) {
  const t = useTranslations("analytics.health");

  // Simulate segments: completed = rate%, in progress ~30% of remainder, overdue = rest
  const completed = actionItemRate;
  const remaining = 100 - completed;
  const inProgress = Math.round(remaining * 0.3);
  const overdue = remaining - inProgress;

  return (
    <div className={cn("bg-card p-6 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10 flex flex-col", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          {t("actionItems")}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
              {t("actionItemsTooltip")}
            </TooltipContent>
          </Tooltip>
        </span>
        {actionItemRate > 0 && (
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold",
            trendBadgeColor(actionItemRate > 50 ? 1 : -1),
          )}>
            <TrendingUp className={cn("h-3 w-3", actionItemRate <= 50 && "rotate-180")} />
            +{actionItemRate.toFixed(1)}
          </span>
        )}
      </div>
      {/* Segmented bar with numbers (like distribution) */}
      <div className="flex w-full h-6 rounded-md overflow-hidden mb-3">
        {completed > 0 && (
          <div
            className="bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold"
            style={{ width: `${completed}%` }}
          >
            {completed > 8 ? `${completed}%` : ""}
          </div>
        )}
        {inProgress > 0 && (
          <div
            className="bg-amber-400 flex items-center justify-center text-white text-[10px] font-bold"
            style={{ width: `${inProgress}%` }}
          >
            {inProgress > 8 ? `${inProgress}%` : ""}
          </div>
        )}
        {overdue > 0 && (
          <div
            className="bg-red-400 flex items-center justify-center text-white text-[10px] font-bold flex-1"
          >
            {overdue > 8 ? `${overdue}%` : ""}
          </div>
        )}
      </div>
      {/* Legend (sticky bottom) */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-medium mt-auto">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {t("actionCompleted")}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          {t("actionInProgress")}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          {t("actionOverdue")}
        </span>
      </div>
    </div>
  );
}
