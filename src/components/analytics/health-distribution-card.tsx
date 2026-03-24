"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISTRIBUTION_COLORS, LEGEND_DOT_COLORS } from "@/lib/analytics/colors";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export interface HealthDistributionCardProps {
  distribution: {
    healthy: number;
    attention: number;
    critical: number;
    noData: number;
  };
  className?: string;
}

export function HealthDistributionCard({
  distribution,
  className,
}: HealthDistributionCardProps) {
  const t = useTranslations("analytics.health");

  const visible = distribution.healthy + distribution.attention + distribution.critical;
  if (visible === 0) return null;

  return (
    <div className={cn("bg-card p-6 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10 flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          {t("healthDistribution")}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
              {t("healthDistributionTooltip")}
            </TooltipContent>
          </Tooltip>
        </span>
      </div>

      {/* Spacer to push bar + legend to bottom */}
      <div className="flex-1" />

      {/* Bar */}
      <div className="flex w-full h-6 rounded-md overflow-hidden mb-3">
        {distribution.healthy > 0 && (
          <div
            className={cn(DISTRIBUTION_COLORS.healthy, "flex items-center justify-center text-white text-[10px] font-bold")}
            style={{ width: `${(distribution.healthy / visible) * 100}%` }}
          >
            {distribution.healthy}
          </div>
        )}
        {distribution.attention > 0 && (
          <div
            className={cn(DISTRIBUTION_COLORS.attention, "flex items-center justify-center text-white text-[10px] font-bold")}
            style={{ width: `${(distribution.attention / visible) * 100}%` }}
          >
            {distribution.attention}
          </div>
        )}
        {distribution.critical > 0 && (
          <div
            className={cn(DISTRIBUTION_COLORS.critical, "flex items-center justify-center text-white text-[10px] font-bold")}
            style={{ width: `${(distribution.critical / visible) * 100}%` }}
          >
            {distribution.critical}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-medium">
        <span className="flex items-center gap-1">
          <span className={cn("w-2 h-2 rounded-full", LEGEND_DOT_COLORS.healthy)} />
          {t("healthy")}
        </span>
        <span className="flex items-center gap-1">
          <span className={cn("w-2 h-2 rounded-full", LEGEND_DOT_COLORS.attention)} />
          {t("attention")}
        </span>
        <span className="flex items-center gap-1">
          <span className={cn("w-2 h-2 rounded-full", LEGEND_DOT_COLORS.critical)} />
          {t("critical")}
        </span>
      </div>
    </div>
  );
}
