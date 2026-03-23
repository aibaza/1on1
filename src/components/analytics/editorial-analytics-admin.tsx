"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  UserX,
  Activity,
  Plus,
  Users,
  ChevronRight,
  CircleAlert,
  CheckCircle2,
  Info,
} from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HealthResponse {
  role: string;
  kpis: {
    avgScore: number | null;
    scoreTrend: number;
    completionRate: number;
    actionItemRate: number;
    activeSeries: number;
    staleSeries: number;
    totalSessions: number;
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
    userId: string;
    personName: string;
    avatarUrl: string | null;
    detail: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
    avgScore: number | null;
    trend: number;
    memberCount: number;
    alertCount: number;
    completionRate: number;
  }>;
  people: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
    avatarUrl: string | null;
    avgScore: number | null;
    trend: number;
    lastSessionDate: string | null;
    totalSessions: number;
    openActionItems: number;
    scoreHistory: number[];
  }>;
  personal: null;
}

interface EditorialAnalyticsAdminProps {
  data: HealthResponse;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground bg-muted";
  if (score >= 4.0) return "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40";
  if (score >= 3.0) return "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40";
  return "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/40";
}

function scoreBadgeColor(score: number | null): string {
  if (score === null) return "bg-muted text-muted-foreground";
  if (score >= 4.0) return "bg-[var(--editorial-tertiary-container,theme(colors.emerald.100))] text-[var(--editorial-on-tertiary-container,theme(colors.emerald.800))] dark:bg-emerald-950/50 dark:text-emerald-300";
  if (score >= 3.0) return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";
}

function trendIcon(trend: number) {
  if (trend > 0) return <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
  if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function trendBadge(trend: number) {
  const positive = trend > 0;
  const negative = trend < 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        positive && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
        negative && "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
        !positive && !negative && "bg-muted text-muted-foreground"
      )}
    >
      {positive ? <TrendingUp className="w-3 h-3" /> : negative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {positive ? "+" : ""}{trend.toFixed(1)}
    </span>
  );
}

function alertIcon(type: string) {
  switch (type) {
    case "stale_series":
    case "overdue":
      return <Clock className="w-4 h-4" />;
    case "low_score":
    case "score_drop":
      return <AlertTriangle className="w-4 h-4" />;
    case "no_sessions":
      return <UserX className="w-4 h-4" />;
    default:
      return <CircleAlert className="w-4 h-4" />;
  }
}

function alertColor(type: string): string {
  switch (type) {
    case "low_score":
    case "score_drop":
      return "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400";
    case "stale_series":
    case "overdue":
      return "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";
    default:
      return "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
  }
}

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/* ------------------------------------------------------------------ */
/*  Mini sparkline (pure CSS bars)                                     */
/* ------------------------------------------------------------------ */

function MiniSparkBars({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = 5;
  const recent = values.slice(-8);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {recent.map((v, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 rounded-full",
            v >= 4.0 ? "bg-emerald-400/60" : v >= 3.0 ? "bg-amber-400/60" : "bg-red-400/60"
          )}
          style={{ height: `${Math.max(10, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InfoTip({ tooltipKey, t }: { tooltipKey: string; t: any }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
        {t(tooltipKey)}
      </TooltipContent>
    </Tooltip>
  );
}

export default function EditorialAnalyticsAdmin({ data }: EditorialAnalyticsAdminProps) {
  const t = useTranslations("analytics.health");
  const format = useFormatter();

  const { kpis, distribution, alerts, teams, people } = data;

  const sortedPeople = useMemo(() => {
    return [...people].sort((a, b) => {
      if (a.avgScore === null && b.avgScore === null) return 0;
      if (a.avgScore === null) return 1;
      if (b.avgScore === null) return 1;
      return a.avgScore - b.avgScore;
    });
  }, [people]);

  const completedSessions = Math.round((kpis.completionRate / 100) * kpis.totalSessions);

  const distTotal = distribution
    ? distribution.healthy + distribution.attention + distribution.critical + distribution.noData
    : 0;

  function pct(value: number) {
    return distTotal > 0 ? (value / distTotal) * 100 : 0;
  }

  return (
    <div className="space-y-12">
      {/* ── Header ── */}
      <header className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-headline font-extrabold text-foreground tracking-tight mb-2">
            {t("organizationOverview")}
          </h2>
          <p className="text-muted-foreground text-lg">
            {t("organizationOverviewDescription")}
          </p>
        </div>
      </header>

      {/* ── Section 1: KPI Cards ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Health Score */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">{t("healthScore")} <InfoTip tooltipKey="healthScoreTooltip" t={t} /></span>
            {trendBadge(kpis.scoreTrend)}
          </div>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-headline font-extrabold text-foreground">
              {kpis.avgScore !== null ? kpis.avgScore.toFixed(1) : "—"}
            </span>
            <span className="text-muted-foreground text-sm">/5</span>
          </div>
          <MiniSparkBars values={people.flatMap((p) => p.scoreHistory).slice(-8)} />
        </div>

        {/* Card 2 — Completion */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">{t("completion")} <InfoTip tooltipKey="completionTooltip" t={t} /></span>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-headline font-extrabold text-foreground mb-3">
            {kpis.completionRate}%
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${kpis.completionRate}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {t("xOfYSessions", { completed: completedSessions, total: kpis.totalSessions })}
          </span>
        </div>

        {/* Card 3 — Action Items */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">{t("actionItems")} <InfoTip tooltipKey="actionItemsTooltip" t={t} /></span>
            {trendBadge(kpis.actionItemRate)}
          </div>
          <div className="text-3xl font-headline font-extrabold text-foreground mb-3">
            {kpis.actionItemRate}%
          </div>
          <div className="flex w-full h-2 rounded-full overflow-hidden bg-muted">
            <div className="h-full bg-emerald-500" style={{ width: `${kpis.actionItemRate}%` }} />
            <div className="h-full bg-amber-400" style={{ width: `${Math.max(0, 100 - kpis.actionItemRate) * 0.3}%` }} />
            <div className="h-full bg-red-400 flex-1" />
          </div>
        </div>

        {/* Card 4 — Series */}
        <div className="bg-card p-6 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">{t("series")} <InfoTip tooltipKey="seriesTooltip" t={t} /></span>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-headline font-extrabold text-foreground">
              {kpis.activeSeries}
            </span>
            <span className="text-sm text-muted-foreground">{t("active")}</span>
          </div>
          {kpis.staleSeries > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              {t("staleSeries", { count: kpis.staleSeries })}
            </span>
          )}
        </div>
      </section>

      {/* ── Section 2: Health Distribution ── */}
      {distribution && distTotal > 0 && (
        <section>
          <h3 className="text-lg font-headline font-bold text-foreground mb-4 flex items-center gap-2">{t("healthDistribution")} <InfoTip tooltipKey="healthDistributionTooltip" t={t} /></h3>
          <div className="flex w-full h-12 rounded-xl overflow-hidden">
            {distribution.healthy > 0 && (
              <div
                className="bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center text-white text-sm font-semibold"
                style={{ width: `${pct(distribution.healthy)}%` }}
              >
                {distribution.healthy}
              </div>
            )}
            {distribution.attention > 0 && (
              <div
                className="bg-amber-400 dark:bg-amber-500 flex items-center justify-center text-white text-sm font-semibold"
                style={{ width: `${pct(distribution.attention)}%` }}
              >
                {distribution.attention}
              </div>
            )}
            {distribution.critical > 0 && (
              <div
                className="bg-red-500 dark:bg-red-600 flex items-center justify-center text-white text-sm font-semibold"
                style={{ width: `${pct(distribution.critical)}%` }}
              >
                {distribution.critical}
              </div>
            )}
          </div>
          <div className="flex gap-6 mt-3 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              {t("healthy")} ({distribution.healthy})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              {t("attention")} ({distribution.attention})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              {t("critical")} ({distribution.critical})
            </span>
            {distribution.noData > 0 && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-3 h-3 rounded-full bg-muted" />
                {t("noData")} ({distribution.noData})
              </span>
            )}
          </div>
        </section>
      )}

      {/* ── Section 3+4: Bento Grid ── */}
      <section className="grid grid-cols-12 gap-4">
        {/* Left: Alerts */}
        <div className="col-span-12 lg:col-span-5 bg-card rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-headline font-bold text-foreground">{t("urgentSignals")}</h3>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              LIVE
            </span>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noAlerts")}</p>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert, i) => (
                <div key={`${alert.userId}-${i}`} className="flex items-start gap-3">
                  <div className={cn("flex items-center justify-center w-8 h-8 rounded-full shrink-0", alertColor(alert.type))}>
                    {alertIcon(alert.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{alert.personName}</p>
                    <p className="text-xs text-muted-foreground">{alert.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Teams Grid */}
        <div className="col-span-12 lg:col-span-7">
          <h3 className="text-lg font-headline font-bold text-foreground mb-4">{t("teams")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="bg-card rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-headline font-semibold text-foreground truncate">{team.name}</h4>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", scoreBadgeColor(team.avgScore))}>
                    {team.avgScore !== null ? team.avgScore.toFixed(1) : "—"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {team.memberCount} members
                </p>
                {/* Avatar stack */}
                <div className="flex -space-x-2 mb-3">
                  {Array.from({ length: Math.min(team.memberCount, 5) }).map((_, j) => (
                    <div
                      key={j}
                      className="w-7 h-7 rounded-full border-2 border-card bg-muted overflow-hidden"
                    >
                      <img
                        src={getAvatarUrl(team.name + j)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {team.memberCount > 5 && (
                    <div className="w-7 h-7 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      +{team.memberCount - 5}
                    </div>
                  )}
                </div>
                {team.alertCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    {t("alertCount", { count: team.alertCount })}
                  </span>
                )}
              </Link>
            ))}

            {/* Create Team placeholder */}
            <Link
              href="/teams"
              className="rounded-xl border-2 border-dashed border-[var(--editorial-outline-variant,var(--border))]/30 p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors min-h-[140px]"
            >
              <Plus className="w-6 h-6" />
              <span className="text-sm font-medium">{t("createTeam")}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 5: People Table ── */}
      <section>
        <h3 className="text-lg font-headline font-bold text-foreground mb-4">{t("memberHealthIndex")}</h3>
        <div className="bg-card rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left">
                  <th className="px-6 py-3 font-medium text-muted-foreground">{t("member")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("avgScore")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("trend")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("lastSession")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("openActions")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sortedPeople.slice(0, 10).map((person) => {
                  const name = `${person.firstName} ${person.lastName}`;
                  const days = daysAgo(person.lastSessionDate);
                  const stale = days !== null && days > 30;

                  return (
                    <tr key={person.userId} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      {/* Member */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatarUrl(name, person.avatarUrl)}
                            alt={name}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{name}</p>
                            {person.jobTitle && (
                              <p className="text-xs text-muted-foreground truncate">{person.jobTitle}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Avg Score */}
                      <td className="px-4 py-4">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", scoreBadgeColor(person.avgScore))}>
                          {person.avgScore !== null ? person.avgScore.toFixed(1) : "—"}
                        </span>
                      </td>
                      {/* Trend */}
                      <td className="px-4 py-4">
                        {trendIcon(person.trend)}
                      </td>
                      {/* Last Session */}
                      <td className="px-4 py-4">
                        <span className={cn("text-sm", stale ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground")}>
                          {days !== null
                            ? format.relativeTime(new Date(person.lastSessionDate!), new Date())
                            : "—"}
                        </span>
                      </td>
                      {/* Open Actions */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-foreground">{person.openActionItems}</span>
                      </td>
                      {/* Action */}
                      <td className="px-4 py-4">
                        <Link
                          href={`/people/${person.userId}`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {people.length > 10 && (
            <div className="px-6 py-3 border-t border-border/50">
              <Link href="/people" className="text-sm font-medium text-primary hover:underline">
                {t("viewAll")} ({people.length})
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
