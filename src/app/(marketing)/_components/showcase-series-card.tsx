"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, ListTodo, Play, UserCog } from "lucide-react";
import { AreaChart, Area, YAxis, ResponsiveContainer } from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StarRating } from "@/components/ui/star-rating";

/**
 * Landing page hero card — identical to EditorialSeriesCard
 * with Recharts AreaChart sparkline and multi-layer question overlays.
 * Uses real Avatar, StarRating, and exact same Tailwind/Recharts patterns.
 */
export function ShowcaseSeriesCard() {
  const t = useTranslations("landing.heroCard");

  // Mock data matching real EditorialSeriesCard props shape
  const assessmentHistory = [3.4, 3.6, 3.8, 3.5, 3.9, 4.0, 3.7, 4.1, 4.0, 4.3, 4.1, 4.2];
  const questionHistories = [
    { questionText: "Work-life balance", scoreWeight: 1.0, values: [3.2, 3.5, 3.7, 3.3, 3.8, 3.9, 3.5, 4.0, 3.8, 4.1, 3.9, 4.0] },
    { questionText: "Career growth", scoreWeight: 0.8, values: [3.6, 3.8, 4.0, 3.7, 4.1, 4.2, 3.9, 4.3, 4.2, 4.5, 4.3, 4.4] },
  ];

  // Sparkline computation — identical to real EditorialSeriesCard
  const { chartData, sparkDomain } = useMemo(() => {
    const hist = assessmentHistory;
    const qh = questionHistories;
    const len = Math.max(hist.length, ...qh.map((q) => q.values.length));
    const allValues = [...hist, ...qh.flatMap((q) => q.values)];
    const minVal = Math.max(0, Math.min(...allValues) - 0.5);
    const maxVal = Math.min(5, Math.max(...allValues) + 0.5);
    const data = Array.from({ length: len }, (_, i) => {
      const point: Record<string, number | undefined> = { index: i };
      if (i < hist.length) point.main = hist[i];
      qh.forEach((q, qi) => { if (i < q.values.length) point[`q${qi}`] = q.values[i]; });
      return point;
    });
    return { chartData: data, sparkDomain: [minVal, maxVal] as [number, number] };
  }, []);

  // Colors for question overlays (matching hashSeriesColor output)
  const qColors = ["#6366f1", "#14b8a6"];

  return (
    <div className="group relative bg-card rounded-2xl p-6 flex flex-col overflow-hidden border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-[var(--color-success)]">
      {/* Header — identical to EditorialSeriesCard */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-[var(--editorial-primary-container)] text-white text-xs font-bold">
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

      {/* AI Summary blurb with sentiment dot — identical */}
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

      {/* Sparkline — Recharts AreaChart, identical to real EditorialSeriesCard */}
      <div className="relative h-[50px] -mx-6 mb-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, rgba(15, 23, 42, 0.03))" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="heroSparkGrad-main" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              {questionHistories.map((_, qi) => (
                <linearGradient key={`qg-${qi}`} id={`heroSparkGrad-q${qi}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={qColors[qi]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={qColors[qi]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <YAxis domain={sparkDomain} hide />
            {questionHistories.map((q, qi) => {
              const opacity = ((q.scoreWeight - 0.5) / 1.5) * 0.18 + 0.02;
              return (
                <Area key={`q${qi}`} type="monotone" dataKey={`q${qi}`} stroke={qColors[qi]} strokeWidth={1.5}
                  fill={`url(#heroSparkGrad-q${qi})`} opacity={opacity} isAnimationActive={false} connectNulls />
              );
            })}
            <Area type="monotone" dataKey="main" stroke="var(--chart-1)" strokeWidth={2}
              fill="url(#heroSparkGrad-main)" opacity={0.35} isAnimationActive={false} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
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
