"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations, useFormatter } from "next-intl";
import Link from "next/link";
import { getAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  Flame,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface IndividualAnalyticsResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
    avatarUrl: string | null;
    level: string;
  };
  currentScore: number | null;
  avgScore: number | null;
  trend: number;
  totalSessions: number;
  scoreHistory: Array<{
    sessionId: string;
    sessionNumber: number;
    score: number;
    date: string;
    durationMinutes: number | null;
    aiSnippet: string | null;
  }>;
  actionItems: {
    total: number;
    completed: number;
    open: number;
    overdue: number;
    completionRate: number;
  };
  openActionItems: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    sessionNumber: number;
  }>;
  streak: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function scoreBorderColor(score: number): string {
  if (score >= 3.5)
    return "border-[var(--editorial-tertiary,var(--color-success))]";
  if (score >= 2.5) return "border-amber-500";
  return "border-destructive";
}

function scoreBadgeClasses(score: number): string {
  if (score >= 3.5)
    return "bg-[var(--editorial-tertiary,var(--color-success))]/10 text-[var(--editorial-tertiary,var(--color-success))]";
  if (score >= 2.5) return "bg-amber-100 text-amber-700";
  return "bg-destructive/10 text-destructive";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EditorialIndividualAnalytics({
  userId,
}: {
  userId: string;
}) {
  const t = useTranslations("analytics.health");
  const format = useFormatter();

  const { data, isLoading } = useQuery<IndividualAnalyticsResponse>({
    queryKey: ["individual-analytics", userId],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/individual?userId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch individual analytics");
      return res.json();
    },
  });

  /* ---- Loading skeleton ---- */
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 rounded-xl bg-muted" />
          <div className="space-y-3 flex-1">
            <div className="h-10 w-64 bg-muted rounded" />
            <div className="h-5 w-40 bg-muted rounded" />
          </div>
        </div>
        {/* Chart skeleton */}
        <div className="h-[400px] bg-muted rounded-xl" />
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
        {/* Timeline skeleton */}
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (!data || data.scoreHistory.length === 0) {
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

  const fullName = `${data.user.firstName} ${data.user.lastName}`;
  const actionRate = data.actionItems.completionRate;
  const currentScore = data.currentScore ?? 0;

  return (
    <div>
      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <header className="mb-12">
        <Link
          href="/analytics"
          className="text-primary font-semibold flex items-center gap-1 mb-6 text-sm hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {t("backToAnalytics")}
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <img
                src={getAvatarUrl(
                  fullName,
                  data.user.avatarUrl,
                  null,
                  data.user.level,
                )}
                alt={fullName}
                className="w-32 h-32 rounded-xl object-cover shadow-2xl"
              />
              <div className="absolute -bottom-2 -right-2 bg-[var(--editorial-tertiary,var(--color-success))] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-md">
                {data.user.level}
              </div>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-1 font-headline">
                {fullName}
              </h1>
              <p className="text-xl text-muted-foreground font-medium">
                {data.user.jobTitle ?? ""}
              </p>
            </div>
          </div>

          {/* Current Score Card */}
          <div className="bg-card p-6 rounded-xl shadow-xl shadow-black/5 flex items-center gap-6 border border-[var(--editorial-outline-variant,var(--border))]/10">
            <div className="text-right">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-tighter mb-1">
                {t("currentGrowthScore")}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-foreground tracking-tighter">
                  {data.currentScore !== null
                    ? data.currentScore.toFixed(1)
                    : "—"}
                </span>
                <span className="text-lg font-bold text-muted-foreground/50">
                  / 5.0
                </span>
              </div>
            </div>
            {data.trend !== 0 && (
              <div
                className={cn(
                  "px-4 py-2 rounded-lg flex flex-col items-center justify-center",
                  data.trend > 0
                    ? "bg-[var(--editorial-tertiary-container,#00665f)]/30 text-[var(--editorial-tertiary,var(--color-success))]"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {data.trend > 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                <span className="text-sm font-extrabold">
                  {data.trend > 0 ? "+" : ""}
                  {data.trend.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/*  SCORE OVERVIEW — 12-col grid                                 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
        {/* ---- Left: Score History Chart (8 cols) ---- */}
        <div className="md:col-span-8 bg-card p-8 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {t("scoreHistory")}
            </h2>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary/20" />
                Previous
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                Current
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-6 border-t-2 border-dashed border-[var(--editorial-tertiary,var(--color-success))]/50" />
                Goal
              </span>
            </div>
          </div>

          <div className="flex-1 flex items-end justify-between gap-4 px-2 relative">
            {/* Goal line at 80% (score 4.0) */}
            <div
              className="absolute w-full border-t-2 border-dashed border-[var(--editorial-tertiary,var(--color-success))]/30"
              style={{ bottom: "80%" }}
            />

            {data.scoreHistory.map((entry, i, arr) => {
              const isLast = i === arr.length - 1;
              const barHeight = `${Math.max(5, (entry.score / 5) * 100)}%`;
              const opacity = 0.1 + (i / arr.length) * 0.9;

              return (
                <Tooltip key={entry.sessionId}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex-1 flex flex-col items-center justify-end h-full"
                      style={{ minWidth: 0 }}
                    >
                      {isLast && (
                        <span className="text-xs font-bold text-foreground mb-1">
                          {entry.score.toFixed(1)}
                        </span>
                      )}
                      <div
                        className={cn(
                          "w-full rounded-t-lg transition-all duration-300 hover:opacity-100",
                          isLast
                            ? "bg-primary shadow-lg shadow-primary/10"
                            : "bg-primary",
                        )}
                        style={{
                          height: barHeight,
                          opacity: isLast ? 1 : opacity,
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {entry.score.toFixed(1)}/5 &middot; Session #
                      {entry.sessionNumber} &middot;{" "}
                      {format.dateTime(new Date(entry.date), {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Bottom labels */}
          <div className="flex justify-between mt-2 text-xs text-muted-foreground px-2">
            <span>#{data.scoreHistory[0]?.sessionNumber}</span>
            {data.scoreHistory.length > 2 && (
              <span>
                #
                {
                  data.scoreHistory[Math.floor(data.scoreHistory.length / 2)]
                    ?.sessionNumber
                }
              </span>
            )}
            <span>Current</span>
          </div>
        </div>

        {/* ---- Right: Two stacked cards (4 cols) ---- */}
        <div className="md:col-span-4 flex flex-col gap-6">
          {/* Focus Score with SVG ring */}
          <div className="bg-card p-8 rounded-xl shadow-sm flex flex-col justify-center items-center text-center border border-[var(--editorial-outline-variant,var(--border))]/10">
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  fill="none"
                  stroke="currentColor"
                  className="text-muted/20"
                  strokeWidth="8"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  fill="none"
                  stroke="currentColor"
                  className="text-[var(--editorial-tertiary,var(--color-success))]"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="364.4"
                  strokeDashoffset={364.4 - 364.4 * (currentScore / 5)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-extrabold text-foreground">
                  {currentScore.toFixed(1)}
                </span>
              </div>
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {t("focusScore")}
            </p>
            <span
              className={cn(
                "text-xs font-bold px-3 py-1 rounded-full",
                data.trend > 0
                  ? "bg-[var(--editorial-tertiary,var(--color-success))]/10 text-[var(--editorial-tertiary,var(--color-success))]"
                  : data.trend < 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {data.trend > 0
                ? t("consistentImprovement")
                : data.trend < 0
                  ? t("attention")
                  : t("stable")}
            </span>
          </div>

          {/* AI Insight */}
          <div className="bg-[var(--editorial-tertiary,#004c47)] text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wider">
                {t("aiInsight")}
              </span>
            </div>
            <p className="text-sm italic leading-relaxed opacity-90">
              {data.scoreHistory[data.scoreHistory.length - 1]?.aiSnippet ??
                t("aiInsightDefault")}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  STATS ROW — 4 cols                                           */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Total Sessions */}
        <div className="bg-card p-6 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-primary/5">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("lifetime")}
            </span>
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {data.totalSessions}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("totalSessions")}
          </p>
        </div>

        {/* Average Score */}
        <div className="bg-card p-6 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-[var(--editorial-tertiary,var(--color-success))]/5">
              <BarChart3 className="h-5 w-5 text-[var(--editorial-tertiary,var(--color-success))]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("globalAvg")}
            </span>
          </div>
          <p
            className={cn(
              "text-3xl font-extrabold",
              data.avgScore !== null
                ? scoreBadgeClasses(data.avgScore).split(" ")[1]
                : "text-foreground",
            )}
          >
            {data.avgScore !== null ? data.avgScore.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("avgScore")}
          </p>
        </div>

        {/* Action Rate */}
        <div className="bg-card p-6 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t("actionRate")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-extrabold text-foreground">
              {actionRate.toFixed(0)}%
            </p>
            <div className="relative w-12 h-12">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  className="text-muted/20"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  className="text-primary"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="125.6"
                  strokeDashoffset={125.6 - (125.6 * actionRate) / 100}
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("actionsClosed")}
          </p>
        </div>

        {/* Session Streak */}
        <div className="bg-card p-6 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-500/5">
              <Flame className="h-5 w-5 text-orange-500 fill-orange-500" />
            </div>
            {data.streak > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                {t("activeStreak")}
              </span>
            )}
          </div>
          <p className="text-3xl font-extrabold text-foreground">
            {data.streak}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("sessionStreak")}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  LOWER SECTION — lg:grid-cols-3                               */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---- Left (2 cols): Session History Timeline ---- */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">
            {t("sessionHistoryTitle")}
          </h2>

          {[...data.scoreHistory].reverse().map((entry, i) => (
            <Link
              key={entry.sessionId}
              href={`/sessions/${entry.sessionId}/summary`}
              className={cn(
                "block bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group border-l-4",
                scoreBorderColor(entry.score),
              )}
              style={{ opacity: Math.max(0.6, 1 - i * 0.05) }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    Session #{entry.sessionNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format.dateTime(new Date(entry.date), {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-sm font-bold px-2.5 py-0.5 rounded-full",
                    scoreBadgeClasses(entry.score),
                  )}
                >
                  {entry.score.toFixed(1)}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {entry.durationMinutes !== null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {entry.durationMinutes}m
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <ClipboardCheck className="h-3 w-3" />
                  {data.actionItems.total > 0
                    ? `${data.actionItems.completed}/${data.actionItems.total}`
                    : "—"}
                </span>
              </div>

              {entry.aiSnippet && (
                <div className="mt-3 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground italic">
                  {entry.aiSnippet}
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* ---- Right (1 col): Action Items ---- */}
        <div className="space-y-6">
          {/* Completion Rate card */}
          <div className="bg-primary text-primary-foreground p-8 rounded-xl shadow-xl shadow-primary/10">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
              {t("completionRateLabel")}
            </p>
            <p className="text-4xl font-extrabold mb-4">
              {actionRate.toFixed(0)}%
            </p>

            <div className="bg-[var(--editorial-primary-container,hsl(var(--primary)/0.3))]/50 h-3 rounded-full overflow-hidden mb-6">
              <div
                className="bg-[var(--editorial-tertiary-fixed,hsl(var(--primary-foreground)))] h-full rounded-full transition-all duration-500"
                style={{ width: `${actionRate}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-bold">{data.actionItems.total}</p>
                <p className="text-xs opacity-70">{t("total")}</p>
              </div>
              <div>
                <p className="font-bold">{data.actionItems.completed}</p>
                <p className="text-xs opacity-70">{t("completedLabel")}</p>
              </div>
              <div style={{ opacity: data.actionItems.open === 0 ? 0.4 : 1 }}>
                <p className="font-bold">{data.actionItems.open}</p>
                <p className="text-xs opacity-70">{t("openLabel")}</p>
              </div>
              <div
                style={{ opacity: data.actionItems.overdue === 0 ? 0.4 : 1 }}
              >
                <p className="font-bold">{data.actionItems.overdue}</p>
                <p className="text-xs opacity-70">{t("overdueLabel")}</p>
              </div>
            </div>
          </div>

          {/* Priority Focus card */}
          <div className="bg-card p-6 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">
                {t("priorityFocus")}
              </h3>
            </div>

            <div className="space-y-3">
              {data.openActionItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  <Circle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-xs text-foreground leading-snug">
                    {item.title}
                  </span>
                </div>
              ))}

              {data.openActionItems.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  {t("allOnTrack")}
                </p>
              )}
            </div>

            <Link
              href="/action-items"
              className="mt-4 block text-center text-xs font-semibold text-primary hover:underline"
            >
              {t("viewAllItems")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
