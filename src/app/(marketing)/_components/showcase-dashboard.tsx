"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, AlertTriangle } from "lucide-react";

/**
 * Static replica of EditorialHealthCards for landing page showcase.
 * Uses exact same Tailwind classes as HealthScoreCard, ActionItemsCard,
 * HealthDistributionCard from the real analytics components.
 */
export function ShowcaseDashboard() {
  const t = useTranslations("landing.showcase.dashboard");

  // Mock sparkline scores for health card
  const sparkScores = [3.6, 3.8, 3.5, 4.0, 3.7, 4.1, 3.9, 4.2, 3.8, 4.0, 4.3, 4.1];

  return (
    <div className="bg-card p-6 rounded-3xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/5">
      <div className="space-y-4 mb-6">
        {/* Health Score Card — replica of health-score-card.tsx */}
        <div className="bg-card p-4 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">{t("healthTitle")}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {t("healthTrend")}
            </span>
          </div>
          <div className="mb-3">
            <span className="text-3xl font-[family-name:var(--font-manrope)] font-extrabold text-foreground">{t("healthScore")}</span>
            <span className="text-muted-foreground text-sm">/5</span>
          </div>
          {/* Sparkline bars — matching HealthScoreCard */}
          <div className="flex items-end gap-px h-10 w-full overflow-hidden">
            {sparkScores.map((score, i) => {
              const height = `${((score - 2) / 3) * 100}%`;
              const color = score >= 3.5 ? "bg-emerald-400/60" : score >= 2.5 ? "bg-amber-400/60" : "bg-red-400/60";
              const isLast = i === sparkScores.length - 1;
              return (
                <div
                  key={i}
                  className={`flex-1 min-w-[2px] max-w-2 rounded-t-sm ${isLast ? "bg-emerald-500" : color}`}
                  style={{ height }}
                />
              );
            })}
          </div>
        </div>

        {/* Action Items Card — replica of action-items-card.tsx */}
        <div className="bg-card p-4 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">{t("actionTitle")}</span>
            <span className="text-xs font-semibold text-foreground">{t("actionRate")}%</span>
          </div>
          {/* Segmented bar — matching ActionItemsCard */}
          <div className="flex w-full h-5 rounded-md overflow-hidden mb-2">
            <div className="bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold" style={{ width: "72%" }}>72%</div>
            <div className="bg-amber-400 flex items-center justify-center text-white text-[10px] font-bold" style={{ width: "18%" }} />
            <div className="bg-red-400 flex items-center justify-center text-white text-[10px] font-bold" style={{ width: "10%" }} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />72%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />18%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />10%</span>
          </div>
        </div>

        {/* Distribution Card — replica of health-distribution-card.tsx */}
        <div className="bg-card p-4 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
          <span className="text-xs font-medium text-muted-foreground mb-3 block">{t("distributionTitle")}</span>
          <div className="flex w-full h-5 rounded-md overflow-hidden mb-2">
            <div className="bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold" style={{ width: "62.5%" }}>5</div>
            <div className="bg-amber-400 flex items-center justify-center text-white text-[10px] font-bold" style={{ width: "25%" }}>2</div>
            <div className="bg-red-500 flex items-center justify-center text-white text-[10px] font-bold" style={{ width: "12.5%" }}>1</div>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{t("healthyLabel")}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{t("attentionLabel")}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{t("criticalLabel")}</span>
          </div>
        </div>

        {/* Alert */}
        <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">{t("alertText")}</p>
        </div>
      </div>

      <div className="text-center">
        <h3 className="font-[family-name:var(--font-manrope)] text-2xl font-bold mb-3">
          {t("title")}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t("description")}
        </p>
      </div>
    </div>
  );
}
