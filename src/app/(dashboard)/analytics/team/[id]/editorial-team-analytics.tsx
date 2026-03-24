"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useFormatter } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ChevronRight,
  Info,
} from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TeamHealthResponse {
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    level: string;
  };
  reportCount: number;
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
  };
  alerts: Array<{
    type: string;
    severity: string;
    userId: string;
    personName: string;
    avatarUrl: string | null;
    detail: string;
  }>;
  members: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
    avatarUrl: string | null;
    level: string;
    avgScore: number | null;
    trend: number;
    lastSessionDate: string | null;
    totalSessions: number;
    openActionItems: number;
    scoreHistory: { score: number; date: string }[];
  }>;
  teamScoreHistory: { score: number; date: string }[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function scoreDotColor(score: number | null): string {
  if (score === null) return "bg-muted-foreground";
  if (score >= 3.5)
    return "bg-[var(--editorial-tertiary,var(--color-success))]";
  if (score >= 2.5) return "bg-amber-400";
  return "bg-destructive";
}

function scoreTextColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 3.5)
    return "text-[var(--editorial-tertiary,var(--color-success))]";
  if (score >= 2.5) return "text-amber-600";
  return "text-destructive";
}

function trendIcon(trend: number) {
  if (trend > 0)
    return (
      <TrendingUp className="w-4 h-4 text-[var(--editorial-tertiary,var(--color-success))]" />
    );
  if (trend < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InfoTip({ tooltipKey, t }: { tooltipKey: string; t: any }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="max-w-xs text-xs leading-relaxed"
      >
        {t(tooltipKey)}
      </TooltipContent>
    </Tooltip>
  );
}

function alertTypeLabel(type: string): string {
  switch (type) {
    case "declining":
      return "decliningScore";
    case "critical_score":
      return "criticalScore";
    case "stale":
      return "staleSeries";
    case "low_action_rate":
      return "lowActionRate";
    default:
      return type;
  }
}

function alertTypeColor(type: string): string {
  switch (type) {
    case "declining":
    case "critical_score":
      return "text-destructive";
    case "stale":
      return "text-amber-600";
    case "low_action_rate":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
}

/* ------------------------------------------------------------------ */
/*  Mini sparkline                                                     */
/* ------------------------------------------------------------------ */

interface SparkEntry {
  score: number;
  date: string;
  personName: string;
}

function MiniSparkBars({ entries }: { entries: SparkEntry[] }) {
  if (entries.length === 0) return null;
  const max = 5;
  return (
    <div className="flex items-end gap-px h-10 w-full overflow-hidden">
      {entries.map((e, i) => (
        <Tooltip key={i}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex-1 min-w-[2px] max-w-2 rounded-t-sm cursor-default hover:opacity-80 transition-opacity",
                e.score >= 3.5
                  ? "bg-emerald-400/60"
                  : e.score >= 2.5
                    ? "bg-amber-400/60"
                    : "bg-red-400/60",
              )}
              style={{ height: `${Math.max(8, (e.score / max) * 100)}%` }}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-bold">{e.personName}</p>
            <p>
              {e.score.toFixed(1)}/5 &middot; {e.date}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface EditorialTeamAnalyticsProps {
  managerId: string;
}

export function EditorialTeamAnalytics({
  managerId,
}: EditorialTeamAnalyticsProps) {
  const t = useTranslations("analytics.health");
  const format = useFormatter();
  const router = useRouter();

  const { data, isLoading, error } = useQuery<TeamHealthResponse>({
    queryKey: ["team-analytics", managerId],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/team/health?managerId=${encodeURIComponent(managerId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch team analytics");
      return res.json();
    },
  });

  /* Loading */
  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 bg-muted rounded-lg w-48" />
        <div className="h-16 bg-muted rounded-lg w-96" />
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  /* Error / empty */
  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium text-muted-foreground">
          {t("noAnalyticsYet")}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("noAnalyticsYetDesc")}
        </p>
      </div>
    );
  }

  const managerName = `${data.manager.firstName} ${data.manager.lastName}`;
  const { kpis, distribution, alerts, members, teamScoreHistory } = data;
  const totalDistribution =
    distribution.healthy +
    distribution.attention +
    distribution.critical +
    distribution.noData;

  /* Sort members by lastSessionDate desc, nulls last */
  const sortedMembers = [...members].sort((a, b) => {
    if (!a.lastSessionDate && !b.lastSessionDate) return 0;
    if (!a.lastSessionDate) return 1;
    if (!b.lastSessionDate) return -1;
    return b.lastSessionDate.localeCompare(a.lastSessionDate);
  });

  /* Build sparkline entries from members' scoreHistory */
  const sparkEntries = useMemo<SparkEntry[]>(() => {
    const MAX_BARS = 30;
    const raw: { score: number; isoDate: string; personName: string }[] = [];
    for (const m of members) {
      const name = `${m.firstName} ${m.lastName}`;
      for (const h of m.scoreHistory) {
        if (h.date)
          raw.push({ score: h.score, isoDate: h.date, personName: name });
      }
    }
    raw.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
    return raw.slice(-MAX_BARS).map((r) => ({
      score: r.score,
      date: format.dateTime(new Date(r.isoDate), {
        month: "short",
        day: "numeric",
      }),
      personName: r.personName,
    }));
  }, [members, format]);

  return (
    <div>
      {/* ---- Breadcrumb & Header ---- */}
      <div className="mb-10">
        <Link
          href="/analytics"
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">{t("backToAnalytics")}</span>
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground mb-2 font-headline">
              {t("teamName", { name: managerName })}
            </h1>
            <p className="text-muted-foreground font-medium text-lg flex items-center gap-2">
              {t("directReportsCount", { count: data.reportCount })}
            </p>
          </div>
          <div className="flex items-center gap-4 bg-[var(--editorial-surface-container-low,var(--muted))] p-3 pr-6 rounded-xl">
            <img
              src={getAvatarUrl(
                managerName,
                data.manager.avatarUrl,
                null,
                data.manager.level,
              )}
              alt={managerName}
              className="w-14 h-14 rounded-full object-cover"
            />
            <div>
              <p className="font-bold text-foreground">{managerName}</p>
              {data.manager.level && (
                <span className="inline-block px-2 py-0.5 bg-[var(--editorial-secondary-container,var(--secondary))] text-[var(--editorial-on-secondary-container,var(--secondary-foreground))] text-xs font-bold rounded-lg uppercase tracking-wider">
                  {data.manager.level}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- KPI Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Card 1: Team Health Score */}
        <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <p className="text-muted-foreground text-sm font-medium mb-1">
            {t("healthScore")}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {kpis.avgScore !== null ? kpis.avgScore.toFixed(1) : "—"}
              <span className="text-lg text-muted-foreground">/5</span>
            </span>
            {kpis.scoreTrend !== 0 && (
              <span className="text-[var(--editorial-tertiary,var(--color-success))] text-xs font-bold flex items-center">
                {kpis.scoreTrend > 0 ? (
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-0.5 text-destructive" />
                )}
                {kpis.scoreTrend > 0 ? "+" : ""}
                {kpis.scoreTrend.toFixed(1)}
              </span>
            )}
          </div>
          <div className="mt-4">
            <MiniSparkBars entries={sparkEntries} />
          </div>
        </div>

        {/* Card 2: Session Completion */}
        <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <p className="text-muted-foreground text-sm font-medium mb-1">
            {t("completion")}
          </p>
          <span className="text-3xl font-bold text-foreground">
            {kpis.completionRate}%
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            {t("xOfYSessions", {
              completed: kpis.completedSessions,
              total: kpis.totalSessions,
            })}
          </p>
          <div className="w-full bg-[var(--editorial-surface-container,var(--muted))] h-1.5 rounded-full mt-4">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${kpis.completionRate}%` }}
            />
          </div>
        </div>

        {/* Card 3: Action Item Rate */}
        <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <p className="text-muted-foreground text-sm font-medium mb-1">
            {t("actionItems")}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {kpis.actionItemRate}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("completionVsAssignment")}
          </p>
        </div>

        {/* Card 4: Active Series */}
        <div className="bg-card p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <p className="text-muted-foreground text-sm font-medium mb-1">
            {t("series")}
          </p>
          <span className="text-3xl font-bold text-foreground">
            {kpis.activeSeries}
          </span>
          <p className="text-xs text-muted-foreground mt-1">{t("active")}</p>
          {kpis.staleSeries > 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              {t("staleSeries", { count: kpis.staleSeries })}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-[var(--editorial-tertiary,var(--color-success))] mt-3">
              <span className="w-2 h-2 rounded-full bg-[var(--editorial-tertiary,var(--color-success))] inline-block" />
              {t("allOnTrack")}
            </p>
          )}
        </div>
      </div>

      {/* ---- Health Distribution + Alerts ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Distribution (2 cols) */}
        <div className="lg:col-span-2 bg-card p-8 rounded-xl">
          <h2 className="text-xl font-bold mb-6 font-headline flex items-center gap-2">
            {t("healthDistribution")}
            <InfoTip tooltipKey="healthDistributionTooltip" t={t} />
          </h2>
          {totalDistribution > 0 ? (
            <>
              <div className="flex h-12 w-full rounded-xl overflow-hidden mb-6">
                {distribution.healthy > 0 && (
                  <div
                    className="bg-[var(--editorial-tertiary,var(--color-success))] flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      width: `${(distribution.healthy / totalDistribution) * 100}%`,
                    }}
                  >
                    {distribution.healthy}
                  </div>
                )}
                {distribution.attention > 0 && (
                  <div
                    className="bg-amber-400 flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      width: `${(distribution.attention / totalDistribution) * 100}%`,
                    }}
                  >
                    {distribution.attention}
                  </div>
                )}
                {distribution.critical > 0 && (
                  <div
                    className="bg-destructive flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      width: `${(distribution.critical / totalDistribution) * 100}%`,
                    }}
                  >
                    {distribution.critical}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[var(--editorial-tertiary,var(--color-success))]" />
                  <span className="text-sm text-muted-foreground">
                    {t("healthy")} ({distribution.healthy})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="text-sm text-muted-foreground">
                    {t("attention")} ({distribution.attention})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm text-muted-foreground">
                    {t("critical")} ({distribution.critical})
                  </span>
                </div>
                {distribution.noData > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t("noData")} ({distribution.noData})
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          )}
        </div>

        {/* Alerts (1 col) */}
        <div className="bg-[var(--editorial-surface-container-low,var(--muted))] p-8 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/20">
          <h2 className="text-xl font-bold mb-6 font-headline flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {t("priorityAlerts")}
          </h2>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <div key={i} className="bg-card p-4 rounded-xl shadow-sm">
                  <p
                    className={cn(
                      "text-xs font-bold uppercase tracking-widest mb-1",
                      alertTypeColor(alert.type),
                    )}
                  >
                    {t(alertTypeLabel(alert.type) as Parameters<typeof t>[0])}
                  </p>
                  <p className="font-bold text-foreground">
                    {alert.personName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {alert.detail}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noAlerts")}</p>
          )}
        </div>
      </div>

      {/* ---- Team Members Table ---- */}
      <div className="bg-card rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden mb-12">
        <div className="px-8 py-6 border-b border-[var(--editorial-surface-container,var(--border))]">
          <h2 className="text-xl font-bold font-headline">
            {t("teamPerformanceRoster")}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--editorial-surface-container-low,var(--muted))]/50">
              <tr>
                <th className="text-left px-8 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t("member")}
                </th>
                <th className="text-left px-4 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hidden md:table-cell">
                  Role
                </th>
                <th className="text-left px-4 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t("avgScore")}
                </th>
                <th className="text-left px-4 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t("trend")}
                </th>
                <th className="text-left px-4 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hidden sm:table-cell">
                  {t("lastSession")}
                </th>
                <th className="text-left px-4 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t("openActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member) => {
                const memberName = `${member.firstName} ${member.lastName}`;
                const days = daysAgo(member.lastSessionDate);
                return (
                  <tr
                    key={member.userId}
                    className="hover:bg-[var(--editorial-surface-container-low,var(--muted))]/30 transition-colors cursor-pointer border-b border-[var(--editorial-surface-container,var(--border))]/50 last:border-b-0"
                    onClick={() =>
                      router.push(`/analytics/individual/${member.userId}`)
                    }
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(
                            memberName,
                            member.avatarUrl,
                            null,
                            member.level,
                          )}
                          alt={memberName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <span className="font-bold text-foreground">
                          {memberName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {member.jobTitle || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            scoreDotColor(member.avgScore),
                          )}
                        />
                        <span
                          className={cn(
                            "font-bold",
                            scoreTextColor(member.avgScore),
                          )}
                        >
                          {member.avgScore !== null
                            ? member.avgScore.toFixed(1)
                            : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{trendIcon(member.trend)}</td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      {member.lastSessionDate ? (
                        <span
                          className={cn(
                            "text-sm",
                            days !== null && days > 30
                              ? "text-destructive font-medium"
                              : "text-muted-foreground",
                          )}
                        >
                          {days === 0
                            ? t("today")
                            : days !== null
                              ? t("daysAgo", { count: days })
                              : "—"}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="bg-[var(--editorial-secondary-container,var(--secondary))] px-3 py-1 rounded-full text-xs font-bold text-[var(--editorial-on-secondary-container,var(--secondary-foreground))]">
                        {t("openActionsCount", {
                          count: member.openActionItems,
                        })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Score Trend Chart ---- */}
      {teamScoreHistory.length > 0 && (
        <div className="bg-card p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold font-headline">
                {t("teamScoreHistory")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("teamScoreHistoryDesc")}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {t("goal", { value: "4.0" })}
            </div>
          </div>
          <div className="flex items-end justify-between h-64 gap-4 px-4 relative">
            {/* Target line at 80% (4.0/5.0) */}
            <div className="absolute w-full border-t-2 border-dashed border-primary/10 bottom-[80%] z-0" />
            {teamScoreHistory.map((entry, i, arr) => {
              const formattedDate = format.dateTime(new Date(entry.date), {
                month: "short",
                day: "numeric",
              });
              const opacity =
                arr.length > 1
                  ? 0.2 + (0.8 * i) / (arr.length - 1)
                  : 1;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center flex-1 z-10"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-full rounded-t-lg transition-all duration-300 hover:bg-[var(--editorial-primary-container,var(--primary))]/80",
                          i === arr.length - 1
                            ? "bg-primary"
                            : "bg-[var(--editorial-primary-container,var(--primary))]/20",
                        )}
                        style={{
                          height: `${Math.max(5, (entry.score / 5) * 100)}%`,
                          opacity:
                            i === arr.length - 1 ? 1 : opacity,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {entry.score.toFixed(1)}/5 &middot; {formattedDate}
                    </TooltipContent>
                  </Tooltip>
                  <span
                    className={cn(
                      "mt-4 text-xs font-bold",
                      i === arr.length - 1
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    {formattedDate}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
