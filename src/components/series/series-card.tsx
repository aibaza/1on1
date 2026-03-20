"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CalendarDays, ListTodo, Play, RotateCcw, Star, UserCog, UserCheck } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { useTranslations, useFormatter } from "next-intl";
import { useMemo, useState } from "react";
import { AgendaSheet } from "./agenda-sheet";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { hashSeriesColor } from "@/lib/chart-colors";

// ── Rich tooltip helper ─────────────────────────────────
// label = always shown (muted), value = shown only when text is truncated

function RichTooltip({
  label,
  value,
  href,
  children,
}: {
  label: string;
  value?: string | null;
  href?: string;
  children: React.ReactElement;
}) {
  const router = useRouter();
  const handleClick = href
    ? (e: React.MouseEvent) => { e.preventDefault(); router.push(href); }
    : undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild className={`pointer-events-auto ${href ? "cursor-pointer" : ""}`} onClick={handleClick}>
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <span className="opacity-60">{label}</span>
        {value && (
          <>
            <br />
            <strong>{value}</strong>
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Types ────────────────────────────────────────────────

interface SeriesCardProps {
  series: {
    id: string;
    managerId: string;
    cadence: string;
    defaultTemplateName?: string | null;
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

// ── Sparkline ────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────

const statusClass: Record<string, string> = {
  paused: "border-amber-400/60 text-amber-700 bg-amber-50 dark:border-amber-500/40 dark:text-amber-400 dark:bg-amber-950/30",
  archived: "border-muted-foreground/30 text-muted-foreground bg-muted/40",
};

const sentimentBorder: Record<string, string> = {
  positive: "border-l-4 border-l-green-500/50 dark:border-l-green-400/60",
  concerning: "border-l-4 border-l-red-500/50 dark:border-l-red-400/60",
  mixed: "border-l-4 border-l-amber-500/50 dark:border-l-amber-400/60",
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

// ── Card component ──────────────────────────────────────

export function SeriesCard({ series, currentUserId, showManagerName }: SeriesCardProps) {
  const t = useTranslations("sessions");
  const format = useFormatter();
  const { showApiError } = useApiErrorToast();
  const router = useRouter();
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaSessionId, setAgendaSessionId] = useState<string | null>(null);
  const [agendaSessionNumber, setAgendaSessionNumber] = useState<number>(0);
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

  const ensureSession = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/series/${series.id}/ensure-session`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to ensure session");
      return res.json() as Promise<{ sessionId: string; sessionNumber: number }>;
    },
    onSuccess: (data) => {
      setAgendaSessionId(data.sessionId);
      setAgendaSessionNumber(data.sessionNumber);
      setAgendaOpen(true);
    },
    onError: (error: Error) => {
      showApiError(error);
    },
  });

  const handleAgendaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const openSession = series.latestSession?.status !== "completed" && series.latestSession?.status !== "cancelled"
      ? series.latestSession
      : null;
    if (openSession) {
      setAgendaSessionId(openSession.id);
      setAgendaSessionNumber(openSession.sessionNumber);
      setAgendaOpen(true);
    } else {
      ensureSession.mutate();
    }
  };

  const score =
    series.latestSession?.sessionScore && series.latestSession.status === "completed"
      ? parseFloat(series.latestSession.sessionScore)
      : null;

  const reportFullName = `${series.report.firstName} ${series.report.lastName}`;
  const managerFullName = `${series.manager.firstName} ${series.manager.lastName}`;
  const seriesUrl = `/sessions/${series.id}`;
  const initials =
    (series.report.firstName?.[0] ?? "") +
    (series.report.lastName?.[0] ?? "");
  const scheduleText = formatSchedule(series.cadence, series.preferredDay, series.preferredTime, t);
  const nextDateText = series.nextSessionAt
    ? formatRelativeDate(series.nextSessionAt, t, format)
    : t("series.notScheduled");

  return (
    <Card className={`group relative flex h-full flex-col overflow-hidden transition-all duration-200 hover:shadow-md ${sentimentBorder[series.latestSummary?.sentiment ?? ""] ?? ""}`}>
      <Link href={`/sessions/${series.id}`} className="absolute inset-0 z-0" />
      <ScoreSparkline assessmentHistory={series.assessmentHistory} questionHistories={series.questionHistories} id={series.id} />
      <CardHeader className="relative z-[1] pointer-events-none flex flex-row items-center gap-3 pb-2">
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={series.report.avatarUrl ?? undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {isManager ? (
            <RichTooltip label={t("series.tooltipYouManage")}>
              <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 ring-2 ring-background">
                <UserCog className="h-2.5 w-2.5 text-white" />
              </span>
            </RichTooltip>
          ) : (
            <RichTooltip label={t("series.tooltipYourManager")}>
              <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
                <UserCheck className="h-2.5 w-2.5 text-white" />
              </span>
            </RichTooltip>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <RichTooltip label={isManager ? t("series.tooltipTeamMember") : t("series.tooltipYou")} value={reportFullName} href={seriesUrl}>
            <CardTitle className="text-base truncate">
              {reportFullName}
            </CardTitle>
          </RichTooltip>
          {(() => {
            const fullStars = score !== null ? Math.floor(score) : 0;
            const hasHalf = score !== null && score - fullStars >= 0.5;
            return (
              <Tooltip>
                <TooltipTrigger asChild className="pointer-events-auto" onClick={() => router.push(seriesUrl)}>
                  <div className="flex items-center gap-0.5 cursor-pointer">
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
                </TooltipTrigger>
                <TooltipContent>
                  <span className="opacity-60">{t("series.tooltipScore")}</span>
                  {score !== null && (
                    <>
                      <br />
                      <strong>{format.number(score, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} / 5</strong>
                    </>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })()}
        </div>
        {showManagerName && (
          <RichTooltip label={t("series.tooltipManagedBy")} value={managerFullName} href={seriesUrl}>
            <span className="text-xs font-normal text-muted-foreground truncate max-w-[30%]">
              {managerFullName}
            </span>
          </RichTooltip>
        )}
        {series.status !== "active" && (
          <Badge variant="outline" className={statusClass[series.status] ?? ""}>
            {series.status === "paused"
              ? t("series.statusPaused")
              : t("series.statusArchived")}
          </Badge>
        )}
        {series.status === "active" && (
          <>
            <Tooltip>
              <TooltipTrigger asChild className="pointer-events-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative z-10 h-8 w-8 pointer-events-auto"
                  onClick={handleAgendaClick}
                  disabled={ensureSession.isPending}
                  aria-label={`${reportFullName} ${t("series.agenda")}`}
                >
                  <ListTodo className="h-4 w-4" />
                  {(series.latestSession?.talkingPointCount ?? 0) > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 text-[10px] font-semibold">
                      {series.latestSession!.talkingPointCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span className="opacity-60">{t("series.tooltipAgenda")}</span>
              </TooltipContent>
            </Tooltip>
            {agendaSessionId && (
              <AgendaSheet
                open={agendaOpen}
                onOpenChange={setAgendaOpen}
                sessionId={agendaSessionId}
                personName={reportFullName}
                sessionNumber={agendaSessionNumber}
                sessionDate={series.latestSession?.scheduledAt ?? series.nextSessionAt ?? ""}
              />
            )}
          </>
        )}
      </CardHeader>
      <CardContent className="relative z-[1] pointer-events-none flex flex-1 flex-col gap-2 pt-0">
        {series.latestSummary ? (
          <RichTooltip label={t("series.tooltipAiSummary")} value={series.latestSummary.blurb} href={seriesUrl}>
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
          </RichTooltip>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild className="pointer-events-auto" onClick={() => router.push(seriesUrl)}>
                <p className="text-xs text-muted-foreground/40 line-clamp-2 italic cursor-pointer">
                  {t("series.summaryPlaceholder")}
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <span className="opacity-60">{t("series.tooltipAiSummary")}</span>
              </TooltipContent>
            </Tooltip>
          </>
        )}
        {hasInProgress && series.latestSession && (
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <RichTooltip label={t("series.tooltipSessionStatus")} href={seriesUrl}>
              <span>{t("series.inProgress", { number: series.latestSession.sessionNumber })}</span>
            </RichTooltip>
            {series.defaultTemplateName && (
              <RichTooltip label={t("series.tooltipTemplate")} value={series.defaultTemplateName} href={seriesUrl}>
                <span className="max-w-[50%] truncate text-muted-foreground/60">
                  {series.defaultTemplateName}
                </span>
              </RichTooltip>
            )}
          </div>
        )}
        {!hasInProgress && series.defaultTemplateName && (
          <RichTooltip label={t("series.tooltipTemplate")} value={series.defaultTemplateName} href={seriesUrl}>
            <p className="text-xs text-muted-foreground/60 truncate max-w-[50%] ml-auto">
              {series.defaultTemplateName}
            </p>
          </RichTooltip>
        )}
        <div className="mt-auto flex items-end justify-between pt-2">
          {isManager && series.status === "active" ? (
            <Button
              variant={hasInProgress ? "default" : "ghost"}
              size="sm"
              className="relative z-10 -ml-3 -mb-1.5 pointer-events-auto"
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
            <RichTooltip label={t("series.tooltipNextSession")} value={series.nextSessionAt ? format.dateTime(new Date(series.nextSessionAt), { dateStyle: "full", timeStyle: "short" }) : undefined} href={seriesUrl}>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <CalendarDays className="h-3 w-3" />
                <span>{nextDateText}</span>
              </div>
            </RichTooltip>
            <RichTooltip label={t("series.tooltipSchedule")} href={seriesUrl}>
              <span className="text-xs text-muted-foreground/50">
                {scheduleText}
              </span>
            </RichTooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
