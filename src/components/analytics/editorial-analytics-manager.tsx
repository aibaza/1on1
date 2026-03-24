"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Heart,
  CheckCircle2,
  ClipboardCheck,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import {
  scoreBadgeColor,
  trendBadgeColor,
  SCORE_THRESHOLD_HEALTHY,
  SCORE_THRESHOLD_ATTENTION,
  DISTRIBUTION_COLORS,
} from "@/lib/analytics/colors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HealthResponse {
  level: string;
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
    level: string;
    avgScore: number | null;
    trend: number;
    lastSessionDate: string | null;
    totalSessions: number;
    openActionItems: number;
    scoreHistory: number[];
  }>;
  personal: null;
}

interface EditorialAnalyticsManagerProps {
  data: HealthResponse;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function trendBadge(trend: number) {
  if (trend <= 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", trendBadgeColor(trend))}>
      <TrendingUp className="w-3 h-3" />
      +{trend.toFixed(1)}
    </span>
  );
}

function statusBadge(score: number | null) {
  if (score === null) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
        No Data
      </span>
    );
  }
  if (score < SCORE_THRESHOLD_ATTENTION) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Critical
      </span>
    );
  }
  if (score < SCORE_THRESHOLD_HEALTHY) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Needs Focus
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Optimal
    </span>
  );
}

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// relativeDateLabel is defined inside the component (needs t() access)

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

export default function EditorialAnalyticsManager({ data }: EditorialAnalyticsManagerProps) {
  const t = useTranslations("analytics.health");

  const { kpis, distribution, alerts, people } = data;

  function relativeDateLabel(dateStr: string | null): string {
    const days = daysAgo(dateStr);
    if (days === null) return "\u2014";
    if (days === 0) return t("today");
    return t("daysAgo", { count: days });
  }

  const sortedPeople = useMemo(() => {
    return [...people].sort((a, b) => {
      if (a.avgScore === null && b.avgScore === null) return 0;
      if (a.avgScore === null) return 1;
      if (b.avgScore === null) return 1;
      return a.avgScore - b.avgScore;
    });
  }, [people]);

  const distTotal = distribution
    ? distribution.healthy + distribution.attention + distribution.critical + distribution.noData
    : 0;

  const healthyPct = distTotal > 0 && distribution ? (distribution.healthy / distTotal) * 100 : 0;
  const attentionPct = distTotal > 0 && distribution
    ? ((distribution.attention + distribution.critical) / distTotal) * 100
    : 0;

  return (
    <div className="space-y-12">
      {/* -- Header -- */}
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
          {t("teamOverview")}
        </p>
        <h2 className="text-4xl font-headline font-extrabold text-foreground tracking-tight">
          {t("directReportsAnalytics")}
        </h2>
      </header>

      {/* -- KPI Cards -- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 - Team Health Score */}
        <div className="bg-card p-6 rounded-xl hover:bg-accent transition-all">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mb-3">
            <Heart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">{t("healthScore")} <InfoTip tooltipKey="healthScoreTooltip" t={t} /></p>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-headline font-extrabold text-foreground">
              {kpis.avgScore !== null ? kpis.avgScore.toFixed(1) : "\u2014"}
            </span>
            <span className="text-muted-foreground text-sm">/5</span>
          </div>
          {trendBadge(kpis.scoreTrend)}
        </div>

        {/* Card 2 - Session Completion */}
        <div className="bg-card p-6 rounded-xl hover:bg-accent transition-all">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">{t("completion")} <InfoTip tooltipKey="completionTooltip" t={t} /></p>
          <span className="text-3xl font-headline font-extrabold text-foreground">
            {kpis.completionRate}%
          </span>
        </div>

        {/* Card 3 - Action Item Rate */}
        <div className="bg-card p-6 rounded-xl hover:bg-accent transition-all">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3">
            <ClipboardCheck className="w-5 h-5 text-secondary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">{t("actionItems")} <InfoTip tooltipKey="actionItemsTooltip" t={t} /></p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-headline font-extrabold text-foreground">
              {kpis.actionItemRate}%
            </span>
          </div>
          {trendBadge(kpis.actionItemRate)}
        </div>

        {/* Card 4 - Active Series */}
        <div className="bg-card p-6 rounded-xl hover:bg-accent transition-all">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">{t("series")} <InfoTip tooltipKey="seriesTooltip" t={t} /></p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-headline font-extrabold text-foreground">
              {kpis.activeSeries}
            </span>
            <span className="text-sm text-muted-foreground">{t("active")}</span>
          </div>
        </div>
      </section>

      {/* -- Distribution + Alerts -- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left (2 cols) - Health Distribution */}
        <div className="lg:col-span-2 bg-card p-6 rounded-xl">
          <h3 className="text-lg font-headline font-bold text-foreground mb-6 flex items-center gap-2">
            {t("healthDistribution")} <InfoTip tooltipKey="healthDistributionTooltip" t={t} />
          </h3>

          {distribution && distTotal > 0 ? (
            <div className="space-y-4">
              {/* Healthy bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{t("healthy")}</span>
                  <span className="text-sm text-muted-foreground">{distribution.healthy} ({Math.round(healthyPct)}%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${healthyPct}%` }}
                  />
                </div>
              </div>

              {/* Needs Attention bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{t("attention")}</span>
                  <span className="text-sm text-muted-foreground">{distribution.attention + distribution.critical} ({Math.round(attentionPct)}%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all"
                    style={{ width: `${attentionPct}%` }}
                  />
                </div>
              </div>

              {/* AI Insight */}
              <div className="mt-6 flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {healthyPct >= 70
                    ? t("aiInsightPositive")
                    : t("aiInsightNegative")}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          )}
        </div>

        {/* Right (1 col) - Priority Alerts */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-lg font-headline font-bold text-foreground mb-3">
            {t("urgentSignals")}
          </h3>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noAlerts")}</p>
          ) : (
            alerts.slice(0, 5).map((alert, i) => (
              <div
                key={`${alert.userId}-${i}`}
                className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 rounded-r-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {alert.type === "score_drop" || alert.type === "low_score" ? (
                      <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{alert.personName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
                    <Link
                      href={`/people/${alert.userId}`}
                      className="inline-block mt-2 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                    >
                      {t("reviewPlan")}
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* -- People Table: Reporting Pipeline -- */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-headline font-bold text-foreground">{t("reportingPipeline")}</h3>
          <span className="text-xs text-muted-foreground">{t("sortedByUrgency")}</span>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left">
                  <th className="px-6 py-3 font-medium text-muted-foreground">{t("member")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("healthStatus")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("lastSession")}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t("nextSync")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sortedPeople.map((person) => {
                  const name = `${person.firstName} ${person.lastName}`;

                  return (
                    <tr
                      key={person.userId}
                      className="group border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      {/* Report Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatarUrl(name, person.avatarUrl, null, person.level)}
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
                      {/* Health Status */}
                      <td className="px-4 py-4">
                        {statusBadge(person.avgScore)}
                      </td>
                      {/* Last Session */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground">
                          {relativeDateLabel(person.lastSessionDate)}
                        </span>
                      </td>
                      {/* Next Sync */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground">{t("scheduleSync")}</span>
                      </td>
                      {/* Action */}
                      <td className="px-4 py-4">
                        <Link
                          href={`/people/${person.userId}`}
                          className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all"
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
        </div>
      </section>
    </div>
  );
}
