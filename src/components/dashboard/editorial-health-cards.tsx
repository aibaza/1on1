"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Heart,
  Target,
  AlertTriangle,
  Activity,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  scoreDotColor,
  scoreTextColor,
  DISTRIBUTION_COLORS,
  LEGEND_DOT_COLORS,
} from "@/lib/analytics/colors";

interface HealthResponse {
  kpis: {
    avgScore: number | null;
    scoreTrend: number;
    completionRate: number;
    actionItemRate: number;
    activeSeries: number;
    staleSeries: number;
    totalSessions: number;
    completedSessions: number;
  };
  distribution: {
    healthy: number;
    attention: number;
    critical: number;
    noData: number;
  } | null;
  alerts: Array<{
    type: string;
    severity: string;
    personName: string;
    detail: string;
  }>;
}

interface EditorialHealthCardsProps {
  userLevel: string;
  userId: string;
}

export function EditorialHealthCards({ userLevel, userId }: EditorialHealthCardsProps) {
  const t = useTranslations("dashboard.healthCards");

  // Build the API URL based on level
  const apiUrl =
    userLevel === "admin"
      ? "/api/analytics/health"
      : userLevel === "manager"
        ? `/api/analytics/team/health?managerId=${encodeURIComponent(userId)}`
        : `/api/analytics/individual?userId=${encodeURIComponent(userId)}`;

  const { data, isLoading } = useQuery<HealthResponse>({
    queryKey: ["dashboard-health", userLevel, userId],
    queryFn: async () => {
      const res = await fetch(apiUrl);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 bg-card rounded-xl border border-border/50 animate-pulse" />
        ))}
      </section>
    );
  }

  if (!data?.kpis) return null;

  const { kpis, distribution, alerts } = data;
  const totalDist = distribution
    ? distribution.healthy + distribution.attention + distribution.critical + distribution.noData
    : 0;

  const scopeLabel =
    userLevel === "admin" ? t("orgScope") : userLevel === "manager" ? t("teamScope") : t("personalScope");

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {scopeLabel}
        </h3>
        <Link
          href="/analytics"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
        >
          {t("viewAnalytics")} <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Health Score */}
        <div className="bg-card p-5 rounded-xl border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", "bg-emerald-500/10")}>
              <Heart className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("healthScore")}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tabular-nums", scoreTextColor(kpis.avgScore))}>
              {kpis.avgScore !== null ? kpis.avgScore.toFixed(1) : "—"}
            </span>
            <span className="text-sm text-muted-foreground">/5</span>
          </div>
          {kpis.scoreTrend !== 0 && (
            <p className={cn("text-xs font-semibold mt-1", kpis.scoreTrend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              {kpis.scoreTrend > 0 ? "+" : ""}{kpis.scoreTrend.toFixed(1)} {t("fromLastPeriod")}
            </p>
          )}
        </div>

        {/* Card 2: Actions */}
        <div className="bg-card p-5 rounded-xl border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("actionRate")}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums text-foreground">
              {kpis.actionItemRate}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("completionRate")}
          </p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${kpis.actionItemRate}%` }}
            />
          </div>
        </div>

        {/* Card 3: Health Distribution */}
        {distribution && totalDist > 0 ? (
          <div className="bg-card p-5 rounded-xl border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
                <Activity className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t("distribution")}
              </span>
            </div>
            <div className="flex h-6 w-full rounded-md overflow-hidden mb-3">
              {distribution.healthy > 0 && (
                <div
                  className={cn(DISTRIBUTION_COLORS.healthy, "flex items-center justify-center text-white text-[10px] font-bold")}
                  style={{ width: `${(distribution.healthy / totalDist) * 100}%` }}
                >
                  {distribution.healthy}
                </div>
              )}
              {distribution.attention > 0 && (
                <div
                  className={cn(DISTRIBUTION_COLORS.attention, "flex items-center justify-center text-white text-[10px] font-bold")}
                  style={{ width: `${(distribution.attention / totalDist) * 100}%` }}
                >
                  {distribution.attention}
                </div>
              )}
              {distribution.critical > 0 && (
                <div
                  className={cn(DISTRIBUTION_COLORS.critical, "flex items-center justify-center text-white text-[10px] font-bold")}
                  style={{ width: `${(distribution.critical / totalDist) * 100}%` }}
                >
                  {distribution.critical}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1">
                <span className={cn("w-2 h-2 rounded-full", LEGEND_DOT_COLORS.healthy)} />
                {distribution.healthy}
              </span>
              <span className="flex items-center gap-1">
                <span className={cn("w-2 h-2 rounded-full", LEGEND_DOT_COLORS.attention)} />
                {distribution.attention}
              </span>
              <span className="flex items-center gap-1">
                <span className={cn("w-2 h-2 rounded-full", LEGEND_DOT_COLORS.critical)} />
                {distribution.critical}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-card p-5 rounded-xl border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t("sessions")}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-foreground">
                {kpis.completionRate}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.completedSessions}/{kpis.totalSessions} {t("completed")}
            </p>
          </div>
        )}

        {/* Card 4: Urgent Signals */}
        <div className="bg-card p-5 rounded-xl border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", alerts.length > 0 ? "bg-red-500/10" : "bg-emerald-500/10")}>
              <AlertTriangle className={cn("h-4 w-4", alerts.length > 0 ? "text-red-500" : "text-emerald-500")} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("signals")}
            </span>
          </div>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.slice(0, 2).map((alert, i) => (
                <div key={i} className="text-xs">
                  <p className="font-semibold text-foreground truncate">{alert.personName}</p>
                  <p className="text-muted-foreground truncate">{alert.detail}</p>
                </div>
              ))}
              {alerts.length > 2 && (
                <p className="text-[10px] text-muted-foreground font-medium">
                  +{alerts.length - 2} {t("more")}
                </p>
              )}
            </div>
          ) : (
            <div>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {t("allClear")}
              </span>
              <p className="text-xs text-muted-foreground mt-1">{t("noSignals")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
