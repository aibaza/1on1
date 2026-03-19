"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CalendarDays, ListTodo, Play, RotateCcw, Star } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { useTranslations, useFormatter } from "next-intl";
import { useMemo, useState } from "react";
import { AgendaSheet } from "./agenda-sheet";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { hashSeriesColor } from "@/lib/chart-colors";

interface SeriesCardProps {
  series: {
    id: string;
    managerId: string;
    cadence: string;
    status: string;
    nextSessionAt: string | null;
    preferredDay: string | null;
    preferredTime: string | null;
    manager: {
      id: string;
      firstName: string;
      lastName: string;
    };
    report: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    };
    latestSession: {
      id: string;
      status: string;
      sessionNumber: number;
      sessionScore: string | null;
      scheduledAt: string | null;
      talkingPointCount: number;
    } | null;
    latestSummary: { blurb: string; sentiment: string } | null;
    assessmentHistory: number[];
    questionHistories: { questionText: string; scoreWeight: number; values: number[] }[];
  };
  currentUserId: string;
  showManagerName?: boolean;
}

function questionOpacity(weight: number): number {
  return ((weight - 0.5) / 1.5) * 0.18 + 0.02;
}

interface SparklineProps {
  assessmentHistory: number[];
  questionHistories: { questionText: string; scoreWeight: number; values: number[] }[];
  id: string;
}

function ScoreSparkline({ assessmentHistory, questionHistories, id }: SparklineProps) {
  const allValues = useMemo(() => {
    const combined: number[] = [...assessmentHistory];
    for (const q of questionHistories) combined.push(...q.values);
    return combined;
  }, [assessmentHistory, questionHistories]);

  const chartData = useMemo(() => {
    const len = Math.max(assessmentHistory.length, ...questionHistories.map((q) => q.values.length));
    if (len < 2) return [];
    return Array.from({ length: len }, (_, i) => {
      const point: Record<string, number | undefined> = { index: i };
      if (i < assessmentHistory.length) point.main = assessmentHistory[i];
      questionHistories.forEach((q, qi) => {
        if (i < q.values.length) point[`q${qi}`] = q.values[i];
      });
      return point;
    });
  }, [assessmentHistory, questionHistories]);

  if (chartData.length < 2) return null;

  const minValue = Math.max(0, Math.min(...allValues) - 5);
  const maxValue = Math.min(100, Math.max(...allValues) + 5);
  const mainGradId = `sparkGrad-${id}`;

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[30%]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={mainGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            {questionHistories.map((q, qi) => {
              const color = hashSeriesColor(q.questionText);
              const gid = `sparkGrad-q-${id}-${qi}`;
              return (
                <linearGradient key={gid} id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <YAxis domain={[minValue, maxValue]} hide />
          {/* Per-question areas (rendered first = behind) */}
          {questionHistories.map((q, qi) => {
            const color = hashSeriesColor(q.questionText);
            const opacity = questionOpacity(q.scoreWeight);
            return (
              <Area
                key={`q${qi}`}
                type="monotone"
                dataKey={`q${qi}`}
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#sparkGrad-q-${id}-${qi})`}
                opacity={opacity}
                isAnimationActive={false}
                connectNulls
              />
            );
          })}
          {/* Main assessment area (on top) */}
          <Area
            type="monotone"
            dataKey="main"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill={`url(#${mainGradId})`}
            opacity={0.28}
            isAnimationActive={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const statusClass: Record<string, string> = {
  paused: "border-amber-400/60 text-amber-700 bg-amber-50 dark:border-amber-500/40 dark:text-amber-400 dark:bg-amber-950/30",
  archived: "border-muted-foreground/30 text-muted-foreground bg-muted/40",
};

const sentimentBorder: Record<string, string> = {
  positive: "border-b-4 border-b-green-500/50 dark:border-b-green-400/60",
  concerning: "border-b-4 border-b-red-500/50 dark:border-b-red-400/60",
  mixed: "border-b-4 border-b-amber-500/50 dark:border-b-amber-400/60",
  neutral: "",
};

function formatRelativeDate(
  dateStr: string,
  t: ReturnType<typeof useTranslations<"sessions">>,
  format: ReturnType<typeof useFormatter>
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t("series.today");
  if (diffDays === 1) return t("series.tomorrow");
  if (diffDays === -1) return t("series.yesterday");
  if (diffDays > 0 && diffDays <= 7) return t("series.inDays", { count: diffDays });
  if (diffDays < 0 && diffDays >= -7) return t("series.daysAgo", { count: Math.abs(diffDays) });

  return format.dateTime(date, {
    month: "short",
    day: "numeric",
  });
}

const DAY_KEY_MAP: Record<string, string> = {
  mon: "scheduleDayMon",
  tue: "scheduleDayTue",
  wed: "scheduleDayWed",
  thu: "scheduleDayThu",
  fri: "scheduleDayFri",
};

function formatSchedule(
  cadence: string,
  preferredDay: string | null,
  preferredTime: string | null,
  t: ReturnType<typeof useTranslations<"sessions">>
): string {
  const cadenceLabel =
    cadence === "weekly" ? t("form.weekly")
    : cadence === "biweekly" ? t("form.biweekly")
    : cadence === "monthly" ? t("form.monthly")
    : cadence;

  const dayKey = preferredDay ? DAY_KEY_MAP[preferredDay] : null;
  const day = dayKey ? t(`series.${dayKey}` as Parameters<typeof t>[0]) : null;
  const time = preferredTime ? preferredTime.slice(0, 5) : null;

  if (day && time) return t("series.schedule", { cadence: cadenceLabel, day, time });
  if (day) return t("series.scheduleDayOnly", { cadence: cadenceLabel, day });
  if (time) return t("series.scheduleTimeOnly", { cadence: cadenceLabel, time });
  return t("series.scheduleNone", { cadence: cadenceLabel });
}

export function SeriesCard({ series, currentUserId, showManagerName }: SeriesCardProps) {
  const t = useTranslations("sessions");
  const format = useFormatter();
  const { showApiError } = useApiErrorToast();
  const router = useRouter();
  const [agendaOpen, setAgendaOpen] = useState(false);
  const hasInProgress = series.latestSession?.status === "in_progress";
  const isManager = series.managerId === currentUserId;

  const startSession = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/series/${series.id}/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start session");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(t("detail.sessionStarted", { number: data.sessionNumber }));
      router.push(`/wizard/${data.id}`);
    },
    onError: (error: Error) => {
      showApiError(error);
    },
  });

  const score =
    series.latestSession?.sessionScore && series.latestSession.status === "completed"
      ? parseFloat(series.latestSession.sessionScore)
      : null;

  const initials =
    (series.report.firstName?.[0] ?? "") +
    (series.report.lastName?.[0] ?? "");

  return (
    <Card className={`group relative flex h-full flex-col overflow-hidden transition-all duration-200 hover:shadow-md ${sentimentBorder[series.latestSummary?.sentiment ?? ""] ?? ""}`}>
      <Link href={`/sessions/${series.id}`} className="absolute inset-0 z-0" />
      <ScoreSparkline assessmentHistory={series.assessmentHistory} questionHistories={series.questionHistories} id={series.id} />
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src={series.report.avatarUrl ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base truncate">
            {series.report.firstName} {series.report.lastName}
          </CardTitle>
          {(() => {
            const fullStars = score !== null ? Math.floor(score) : 0;
            const hasHalf = score !== null && score - fullStars >= 0.5;
            return (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => {
                  if (score === null) {
                    return <Star key={i} className="h-3 w-3 text-muted-foreground/20" />;
                  }
                  if (i < fullStars) {
                    return <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />;
                  }
                  if (i === fullStars && hasHalf) {
                    return (
                      <span key={i} className="relative inline-flex h-3 w-3">
                        <Star className="absolute h-3 w-3 text-muted-foreground/20" />
                        <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        </span>
                      </span>
                    );
                  }
                  return <Star key={i} className="h-3 w-3 text-muted-foreground/20" />;
                })}
                {score !== null && (
                  <span className="ml-1 text-xs tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {format.number(score, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
        {showManagerName && (
          <span className="text-xs font-normal text-muted-foreground">
            {series.manager.firstName} {series.manager.lastName}
          </span>
        )}
        {series.status !== "active" && (
          <Badge variant="outline" className={statusClass[series.status] ?? ""}>
            {series.status === "paused"
              ? t("series.statusPaused")
              : t("series.statusArchived")}
          </Badge>
        )}
        {series.latestSession?.status === "scheduled" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="relative z-10 h-8 w-8"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAgendaOpen(true);
              }}
              aria-label={`${series.report.firstName} ${series.report.lastName} ${t("series.agenda")}`}
            >
              <ListTodo className="h-4 w-4" />
              {series.latestSession.talkingPointCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 text-[10px] font-semibold">
                  {series.latestSession.talkingPointCount}
                </Badge>
              )}
            </Button>
            <AgendaSheet
              open={agendaOpen}
              onOpenChange={setAgendaOpen}
              sessionId={series.latestSession.id}
              personName={`${series.report.firstName} ${series.report.lastName}`}
              sessionNumber={series.latestSession.sessionNumber}
              sessionDate={series.latestSession.scheduledAt ?? series.nextSessionAt ?? ""}
            />
          </>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 pt-0">
        {series.latestSummary ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground line-clamp-2">
            <span
              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                series.latestSummary.sentiment === "positive"
                  ? "bg-green-500"
                  : series.latestSummary.sentiment === "concerning"
                    ? "bg-red-500"
                    : "bg-amber-500"
              }`}
            />
            {series.latestSummary.blurb}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/40 line-clamp-2 italic">
            {t("series.summaryPlaceholder")}
          </p>
        )}
        {hasInProgress && series.latestSession && (
          <p className="text-xs text-muted-foreground">
            {t("series.inProgress", { number: series.latestSession.sessionNumber })}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between pt-2">
          {isManager && series.status === "active" ? (
            <Button
              variant={hasInProgress ? "default" : "ghost"}
              size="sm"
              className="relative z-10 -ml-3 -mb-1.5"
              onClick={(e) => {
                e.preventDefault();
                if (!hasInProgress) {
                  startSession.mutate();
                } else if (series.latestSession?.id) {
                  router.push(`/wizard/${series.latestSession.id}`);
                }
              }}
              disabled={startSession.isPending}
            >
              {hasInProgress ? (
                <>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  {t("series.resume")}
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  {t("series.start")}
                </>
              )}
            </Button>
          ) : <div />}
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <CalendarDays className="h-3 w-3" />
              {series.nextSessionAt ? (
                <span>{formatRelativeDate(series.nextSessionAt, t, format)}</span>
              ) : (
                <span>{t("series.notScheduled")}</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground/50">
              {formatSchedule(series.cadence, series.preferredDay, series.preferredTime, t)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
