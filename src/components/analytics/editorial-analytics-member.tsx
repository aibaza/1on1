"use client";

import { useTranslations, useFormatter } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Flame,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  personal: {
    currentScore: number | null;
    trend: number;
    scoreHistory: number[];
    actionItemRate: number;
    totalSessions: number;
    nextSessionDate: string | null;
  } | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EditorialAnalyticsMember({
  data,
}: {
  data: HealthResponse;
}) {
  const t = useTranslations("analytics.health");
  const format = useFormatter();
  const personal = data.personal;

  /* ---- empty state ------------------------------------------------ */
  if (!personal) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground text-lg">{t("noAnalyticsYet")}</p>
      </div>
    );
  }

  const score = personal.currentScore;
  const trend = personal.trend;
  const history = personal.scoreHistory;
  const actionRate = personal.actionItemRate;

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/*  Section 1 — Score + History                                  */}
      {/* ============================================================ */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left — Current Growth Score */}
        <div className="col-span-12 md:col-span-4 bg-card p-8 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            {t("currentGrowthScore")}
          </p>

          {trend !== 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-sm font-medium mb-2",
                trend > 0 ? "text-green-500" : "text-red-500",
              )}
            >
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {trend > 0 ? "+" : ""}
              {trend.toFixed(1)}
            </span>
          )}

          <p className="text-6xl font-headline font-black text-primary leading-none">
            {score !== null ? score.toFixed(1) : "—"}
            <span className="text-2xl font-normal text-muted-foreground ml-1">
              / 5.0
            </span>
          </p>

          <p className="text-sm text-muted-foreground mt-4">
            {t("growthAnalyticsDescription")}
          </p>
        </div>

        {/* Right — Score History */}
        <div className="col-span-12 md:col-span-8 bg-card p-8 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10 min-h-[300px] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("scoreHistory")}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {t("personal")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                {t("benchmark")}
              </span>
            </div>
          </div>

          <div className="relative flex-1 flex items-end justify-between px-2 gap-4">
            {/* Grid lines */}
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-[var(--editorial-outline-variant,var(--border))]/10"
                style={{ bottom: `${(i + 1) * 25}%` }}
              />
            ))}

            {history.map((s, i) => (
              <div
                key={i}
                className={cn(
                  "w-4 bg-primary rounded-t-full shadow-lg shadow-primary/10 relative z-10",
                  i === history.length - 1 &&
                    "border-t-4 border-[var(--editorial-tertiary,var(--color-success))]",
                )}
                style={{ height: `${(s / 5) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 2 — Stats cards                                      */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sessions */}
        <div className="bg-card p-6 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-4xl font-black">{personal.totalSessions}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("totalSessions")}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--editorial-primary-fixed,var(--primary))]/10 p-3">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>

        {/* Completion */}
        <div className="bg-card p-6 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-4xl font-black">
                {Math.round(actionRate * 100)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("actionsClosed")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle
                    className="text-accent"
                    cx="32"
                    cy="32"
                    r="28"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="6"
                  />
                  <circle
                    className="text-[var(--editorial-tertiary,var(--color-success))]"
                    cx="32"
                    cy="32"
                    r="28"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeDasharray="176"
                    strokeDashoffset={176 - 176 * actionRate}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-[var(--editorial-tertiary,var(--color-success))]" />
                </div>
              </div>
              <div className="rounded-xl bg-[var(--editorial-tertiary-fixed,var(--color-success))]/10 p-3">
                <CheckCircle2 className="h-5 w-5 text-[var(--editorial-tertiary,var(--color-success))]" />
              </div>
            </div>
          </div>
        </div>

        {/* Next Session */}
        <div className="bg-card p-6 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-black">
                {personal.nextSessionDate
                  ? format.dateTime(new Date(personal.nextSessionDate), {
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("nextSession")}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--editorial-secondary-fixed,var(--secondary))]/10 p-3">
              <Calendar className="h-5 w-5 text-secondary-foreground" />
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="bg-card p-6 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-4xl font-black">
                {history.length}
                <span className="text-base font-normal text-muted-foreground ml-1">
                  {t("sessions")}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("streak")}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--editorial-tertiary,var(--color-success))]/10 p-3">
              <Flame className="h-5 w-5 text-[var(--editorial-tertiary,var(--color-success))]" />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 3 — Growth Journey Timeline                          */}
      {/* ============================================================ */}
      {history.length > 0 && (
        <div className="bg-[var(--editorial-surface-container-low,var(--muted))] p-10 rounded-2xl relative overflow-hidden">
          {/* Decorative blur */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />

          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-8">
            {t("growthJourney")}
          </h3>

          <div className="relative">
            {/* Horizontal line */}
            <div className="absolute top-4 left-0 right-0 h-1 bg-accent rounded-full" />

            {/* Dots */}
            <div className="relative flex justify-between items-start">
              {history.map((s, i) => {
                const isLast = i === history.length - 1;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className={cn(
                        "rounded-full flex items-center justify-center font-bold text-xs z-10",
                        isLast
                          ? "w-12 h-12 bg-[var(--editorial-tertiary-container,#00665f)] border-4 border-[var(--editorial-surface-container-low,var(--muted))] text-white"
                          : "w-8 h-8 bg-primary border-4 border-[var(--editorial-surface-container-low,var(--muted))] text-primary-foreground",
                      )}
                    >
                      {s.toFixed(1)}
                    </div>
                    {isLast && (
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--editorial-tertiary,var(--color-success))]">
                        {t("current")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
