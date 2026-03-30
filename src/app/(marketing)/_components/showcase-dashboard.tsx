"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, AlertTriangle } from "lucide-react";

/**
 * Static replica of health dashboard cards for landing page showcase.
 * Layout inspired by real EditorialHealthCards + individual analytics page.
 */
export function ShowcaseDashboard() {
  const t = useTranslations("landing.showcase.dashboard");

  // Mock sparkline scores
  const sparkScores = [3.6, 3.8, 3.5, 4.0, 3.7, 4.1, 3.9, 4.2, 3.8, 4.0, 4.3, 4.1];
  const minS = Math.min(...sparkScores);
  const maxS = Math.max(...sparkScores);

  return (
    <div className="bg-card p-6 rounded-3xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/5 flex flex-col">
      <div className="space-y-3 mb-6">
        {/* Health Score — with score prominently displayed + sparkline */}
        <div className="bg-card p-4 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground block mb-1">{t("healthTitle")}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-[family-name:var(--font-manrope)] font-extrabold text-foreground">{t("healthScore")}</span>
                <span className="text-muted-foreground text-sm">/5</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {t("healthTrend")}
            </span>
          </div>
          {/* Sparkline bars — identical to HealthScoreCard */}
          <div className="flex items-end gap-px h-10 w-full overflow-hidden mt-2">
            {sparkScores.map((score, i) => {
              const height = `${((score - minS) / (maxS - minS + 0.3)) * 80 + 20}%`;
              const color = score >= 3.5 ? "bg-emerald-400/60" : score >= 2.5 ? "bg-amber-400/60" : "bg-red-400/60";
              const isLast = i === sparkScores.length - 1;
              return (
                <div
                  key={i}
                  className={`flex-1 min-w-[2px] max-w-2 rounded-t-sm transition-opacity hover:opacity-80 ${isLast ? "bg-emerald-500" : color}`}
                  style={{ height }}
                />
              );
            })}
          </div>
        </div>

        {/* Two-column row: Action Rate + Distribution */}
        <div className="grid grid-cols-2 gap-3">
          {/* Action Items */}
          <div className="bg-card p-3 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
            <span className="text-[10px] font-medium text-muted-foreground block mb-1">{t("actionTitle")}</span>
            <span className="text-xl font-bold text-foreground">{t("actionRate")}%</span>
            <div className="flex w-full h-2 rounded-full overflow-hidden mt-2">
              <div className="bg-emerald-500" style={{ width: "72%" }} />
              <div className="bg-amber-400" style={{ width: "18%" }} />
              <div className="bg-red-400" style={{ width: "10%" }} />
            </div>
          </div>

          {/* Distribution */}
          <div className="bg-card p-3 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
            <span className="text-[10px] font-medium text-muted-foreground block mb-1">{t("distributionTitle")}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-emerald-600">{t("distributionHealthy")}</span>
              <span className="text-muted-foreground text-[10px]">/</span>
              <span className="text-xl font-bold text-amber-500">{t("distributionAttention")}</span>
              <span className="text-muted-foreground text-[10px]">/</span>
              <span className="text-xl font-bold text-red-500">{t("distributionCritical")}</span>
            </div>
            <div className="flex gap-2 mt-2 text-[9px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{t("healthyLabel")}</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{t("attentionLabel")}</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{t("criticalLabel")}</span>
            </div>
          </div>
        </div>

        {/* Alert */}
        <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">{t("alertText")}</p>
        </div>
      </div>

      <div className="text-center mt-auto">
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
