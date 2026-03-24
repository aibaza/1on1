"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { sparkBarColor, trendBadgeColor } from "@/lib/analytics/colors";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { TrendingUp } from "lucide-react";

interface SparkEntry {
  score: number;
  date: string;
  personName: string;
}

interface ScoreHistorySource {
  score: number;
  date: string;
}

interface PersonWithHistory {
  firstName?: string;
  lastName?: string;
  scoreHistory: ScoreHistorySource[];
}

export interface HealthScoreCardProps {
  avgScore: number | null;
  scoreTrend: number;
  /** Admin/manager: pass people/members array. Member: pass personal scoreHistory. */
  people?: PersonWithHistory[];
  personalScoreHistory?: ScoreHistorySource[];
  className?: string;
}

export function HealthScoreCard({
  avgScore,
  scoreTrend,
  people,
  personalScoreHistory,
  className,
}: HealthScoreCardProps) {
  const t = useTranslations("analytics.health");
  const format = useFormatter();

  const sparkEntries = useMemo<SparkEntry[]>(() => {
    const MAX_BARS = 30;
    const raw: { score: number; isoDate: string; personName: string }[] = [];

    if (personalScoreHistory) {
      for (const h of personalScoreHistory) {
        if (h.score > 0 && h.date) raw.push({ score: h.score, isoDate: h.date, personName: "" });
      }
    } else if (people) {
      for (const p of people) {
        const name = p.firstName ? `${p.firstName} ${p.lastName ?? ""}`.trim() : "";
        for (const h of p.scoreHistory) {
          if (h.score > 0 && h.date) raw.push({ score: h.score, isoDate: h.date, personName: name });
        }
      }
    }

    raw.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
    return raw.slice(-MAX_BARS).map((r) => ({
      score: r.score,
      date: format.dateTime(new Date(r.isoDate), { month: "short", day: "numeric" }),
      personName: r.personName,
    }));
  }, [people, personalScoreHistory, format]);

  return (
    <div className={cn("bg-card p-6 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          {t("healthScore")}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
              {t("healthScoreTooltip")}
            </TooltipContent>
          </Tooltip>
        </span>
        {scoreTrend !== 0 && (
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold",
            trendBadgeColor(scoreTrend),
          )}>
            <TrendingUp className={cn("h-3 w-3", scoreTrend < 0 && "rotate-180")} />
            {scoreTrend > 0 ? "+" : ""}{scoreTrend.toFixed(1)}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-3xl font-headline font-extrabold text-foreground">
          {avgScore !== null ? avgScore.toFixed(1) : "—"}
        </span>
        <span className="text-muted-foreground text-sm">/5</span>
      </div>
      {sparkEntries.length > 0 && (
        <div className="flex items-end gap-px h-10 w-full overflow-hidden">
          {sparkEntries.map((e, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex-1 min-w-[2px] max-w-2 rounded-t-sm cursor-default hover:opacity-80 transition-opacity",
                    sparkBarColor(e.score),
                  )}
                  style={{ height: `${Math.max(8, (e.score / 5) * 100)}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {e.personName && <p className="font-bold">{e.personName}</p>}
                <p>{e.score.toFixed(1)}/5 &middot; {e.date}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}
