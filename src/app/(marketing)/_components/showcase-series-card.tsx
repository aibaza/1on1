"use client";

import { useTranslations } from "next-intl";
import { CalendarDays, ListTodo, Play, UserCog } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StarRating } from "@/components/ui/star-rating";

/**
 * Static replica of EditorialSeriesCard for landing page hero.
 * Uses real Avatar, StarRating components and identical Tailwind classes.
 */
export function ShowcaseSeriesCard() {
  const t = useTranslations("landing.heroCard");

  // Mock sparkline data — 12 sessions of scores (matching AreaChart from real card)
  const sparkData = [3.4, 3.6, 3.8, 3.5, 3.9, 4.0, 3.7, 4.1, 4.0, 4.3, 4.1, 4.2];
  const maxScore = Math.max(...sparkData);
  const minScore = Math.min(...sparkData);

  return (
    <div className="group relative bg-card rounded-2xl p-6 flex flex-col overflow-hidden border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-[var(--color-success)]">
      {/* Header — identical to EditorialSeriesCard */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-[var(--editorial-primary-container)] text-white text-sm font-bold">
                AP
              </AvatarFallback>
            </Avatar>
            <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-card bg-primary">
              <UserCog className="h-2.5 w-2.5 text-white" />
            </span>
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-foreground truncate">{t("name")}</h4>
            <StarRating score={4.2} size="sm" />
          </div>
        </div>

        {/* Agenda button */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-accent transition-all cursor-pointer">
          <ListTodo className="h-3.5 w-3.5" />
          <span>{t("agendaLabel")}</span>
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-white text-[9px] font-bold px-1">
            3
          </span>
        </button>
      </div>

      {/* AI Sentiment summary — identical to real card */}
      <div className="mb-3 flex-1">
        <p className="text-xs text-muted-foreground font-medium leading-relaxed line-clamp-2 flex items-start gap-1.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-success)]" />
          {t("sentimentBlurb")}
        </p>
      </div>

      {/* In-progress status */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <span className="font-medium">{t("sessionLabel")}</span>
      </div>

      {/* Sparkline — SVG area chart matching AreaChart from real card */}
      <div className="relative h-[50px] -mx-6 mb-0" style={{ background: "linear-gradient(to bottom, transparent, rgba(15, 23, 42, 0.03))" }}>
        <svg viewBox="0 0 240 50" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="heroSparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1, #29407d)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--chart-1, #29407d)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path
            d={`M${sparkData.map((s, i) => {
              const x = (i / (sparkData.length - 1)) * 240;
              const y = 50 - ((s - minScore) / (maxScore - minScore + 0.5)) * 44 - 3;
              return `${x},${y}`;
            }).join(" L")} L240,50 L0,50 Z`}
            fill="url(#heroSparkGrad)"
          />
          {/* Line */}
          <polyline
            points={sparkData.map((s, i) => {
              const x = (i / (sparkData.length - 1)) * 240;
              const y = 50 - ((s - minScore) / (maxScore - minScore + 0.5)) * 44 - 3;
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="var(--chart-1, #29407d)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Last point dot */}
          <circle
            cx={240}
            cy={50 - ((sparkData[sparkData.length - 1] - minScore) / (maxScore - minScore + 0.5)) * 44 - 3}
            r="3"
            fill="var(--chart-1, #29407d)"
          />
        </svg>
      </div>

      {/* Footer — identical to real card */}
      <div className="flex items-end justify-between pt-4 border-t border-[var(--editorial-outline-variant,var(--border))]/50">
        <div className="flex flex-col gap-0.5 cursor-default">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)]">
            <CalendarDays className="h-3 w-3" />
            <span>{t("nextSession")}</span>
          </div>
          <span className="text-[10px] text-muted-foreground/50">{t("scheduleText")}</span>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-primary hover:bg-primary/5 transition-all cursor-pointer active:scale-95">
          <Play className="h-3.5 w-3.5" />
          {t("startButton")}
        </button>
      </div>
    </div>
  );
}
