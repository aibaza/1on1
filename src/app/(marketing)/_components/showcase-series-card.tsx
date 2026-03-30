"use client";

import { useTranslations } from "next-intl";
import { CalendarDays, ListTodo, Play, Star, UserCog } from "lucide-react";

/**
 * Static replica of EditorialSeriesCard for landing page hero.
 * Uses exact same Tailwind classes as the real component.
 */
export function ShowcaseSeriesCard() {
  const t = useTranslations("landing.heroCard");

  // Mock sparkline data — 12 sessions of scores
  const sparkData = [3.4, 3.6, 3.8, 3.5, 3.9, 4.0, 3.7, 4.1, 4.0, 4.3, 4.1, 4.2];

  return (
    <div className="group relative bg-card rounded-2xl p-6 flex flex-col overflow-hidden border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-l-4 border-l-[var(--color-success)]">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-[var(--editorial-primary-container)] flex items-center justify-center text-white text-sm font-bold">
              AP
            </div>
            <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-card bg-primary">
              <UserCog className="h-2.5 w-2.5 text-white" />
            </span>
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-foreground truncate">{t("name")}</h4>
            {/* Star rating — 4.2/5 */}
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />
              ))}
              <Star className="h-3 w-3 text-amber-400" style={{ clipPath: "inset(0 80% 0 0)" }} />
              <Star className="h-3 w-3 text-muted-foreground/30" style={{ clipPath: "inset(0 0 0 20%)" }} />
            </div>
          </div>
        </div>
        {/* Agenda button */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground">
          <ListTodo className="h-3.5 w-3.5" />
          <span>{t("agendaLabel")}</span>
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-white text-[9px] font-bold px-1">
            3
          </span>
        </button>
      </div>

      {/* AI Sentiment summary */}
      <div className="mb-3 flex-1">
        <p className="text-xs text-muted-foreground font-medium leading-relaxed line-clamp-2 flex items-start gap-1.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-success)]" />
          {t("sentimentBlurb")}
        </p>
      </div>

      {/* In-progress status */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-2">
        <span className="font-medium">{t("sessionLabel")}</span>
      </div>

      {/* Sparkline — CSS bars matching HealthScoreCard style */}
      <div className="relative h-[50px] -mx-6 mb-0" style={{ background: "linear-gradient(to bottom, transparent, rgba(15, 23, 42, 0.03))" }}>
        <div className="flex items-end gap-px h-full px-6 pb-1">
          {sparkData.map((score, i) => {
            const height = `${((score - 2.5) / 2.5) * 100}%`;
            const color = score >= 3.5 ? "bg-emerald-400/60" : score >= 2.5 ? "bg-amber-400/60" : "bg-red-400/60";
            const isLast = i === sparkData.length - 1;
            return (
              <div
                key={i}
                className={`flex-1 min-w-[2px] max-w-2 rounded-t-sm ${color} ${isLast ? "!bg-emerald-500" : ""}`}
                style={{ height }}
              />
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between pt-4 border-t border-[var(--editorial-outline-variant,var(--border))]/50">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)]">
            <CalendarDays className="h-3 w-3" />
            <span>{t("nextSession")}</span>
          </div>
          <span className="text-[10px] text-muted-foreground/50">{t("scheduleText")}</span>
        </div>
        <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-primary">
          <Play className="h-3.5 w-3.5" />
          {t("startButton")}
        </span>
      </div>
    </div>
  );
}
