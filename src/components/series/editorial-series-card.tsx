"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations, useFormatter } from "next-intl";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { StarRating } from "@/components/ui/star-rating";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CalendarDays, ChevronRight, ListTodo, Play, RotateCcw, UserCog, UserCheck } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { hashSeriesColor } from "@/lib/chart-colors";
import { AgendaSheet } from "./agenda-sheet";

interface EditorialSeriesCardProps {
  series: {
    id: string;
    managerId: string;
    cadence: string;
    defaultTemplateName?: string | null;
    status: string;
    nextSessionAt: string | null;
    preferredDay: string | null;
    preferredTime: string | null;
    manager: { id: string; firstName: string; lastName: string };
    report: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
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

function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

// Sentiment to border color mapping
const sentimentBorderClass: Record<string, string> = {
  positive: "border-l-4 border-l-[var(--color-success)]",
  concerning: "border-l-4 border-l-destructive",
  mixed: "border-l-4 border-l-[var(--color-warning,#f59e0b)]",
};

// Relative date formatting
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

  return format.dateTime(date, { month: "short", day: "numeric" });
}

const DAY_KEY_MAP: Record<string, string> = {
  mon: "scheduleDayMon", tue: "scheduleDayTue", wed: "scheduleDayWed",
  thu: "scheduleDayThu", fri: "scheduleDayFri",
};

function formatSchedule(
  cadence: string, preferredDay: string | null, preferredTime: string | null,
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

export function EditorialSeriesCard({ series, currentUserId, showManagerName }: EditorialSeriesCardProps) {
  const t = useTranslations("sessions");
  const format = useFormatter();
  const { showApiError } = useApiErrorToast();
  const router = useRouter();
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaSessionId, setAgendaSessionId] = useState<string | null>(null);
  const [agendaSessionNumber, setAgendaSessionNumber] = useState<number>(0);

  const isManager = series.managerId === currentUserId;
  const reportName = `${series.report.firstName} ${series.report.lastName}`;
  const managerName = `${series.manager.firstName} ${series.manager.lastName}`;
  const score = series.latestSession?.sessionScore ? parseFloat(series.latestSession.sessionScore) : null;
  const isInProgress = series.latestSession?.status === "in_progress";
  const isOverdue = series.nextSessionAt && new Date(series.nextSessionAt).getTime() < Date.now();
  const sentiment = series.latestSummary?.sentiment ?? "";
  const sentimentClass = sentimentBorderClass[sentiment] ?? "";

  const nextDateText = series.nextSessionAt
    ? formatRelativeDate(series.nextSessionAt, t, format)
    : t("series.notScheduled");
  const scheduleText = formatSchedule(series.cadence, series.preferredDay, series.preferredTime, t);

  // Sparkline data
  const { chartData, sparkDomain } = useMemo(() => {
    const hist = series.assessmentHistory;
    const qh = series.questionHistories;
    const len = Math.max(hist.length, ...qh.map((q) => q.values.length));
    if (len < 2) return { chartData: [], sparkDomain: [0, 5] as [number, number] };
    const allValues = [...hist, ...qh.flatMap((q) => q.values)];
    const minVal = Math.max(0, Math.min(...allValues) - 0.5);
    const maxVal = Math.min(5, Math.max(...allValues) + 0.5);
    const data = Array.from({ length: len }, (_, i) => {
      const point: Record<string, number | undefined> = { index: i };
      if (i < hist.length) point.main = hist[i];
      qh.forEach((q, qi) => { if (i < q.values.length) point[`q${qi}`] = q.values[i]; });
      return point;
    });
    return { chartData: data, sparkDomain: [minVal, maxVal] as [number, number] };
  }, [series.assessmentHistory, series.questionHistories]);

  // Mutations
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/series/${series.id}/start`, { method: "POST" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(t("detail.sessionStarted", { number: data.sessionNumber }));
      router.push(`/wizard/${data.id}`);
    },
    onError: (e: Error) => showApiError(e),
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
    onError: (e: Error) => showApiError(e),
  });

  const handleAgendaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const openSession = series.latestSession?.status !== "completed" && series.latestSession?.status !== "cancelled"
      ? series.latestSession : null;
    if (openSession) {
      setAgendaSessionId(openSession.id);
      setAgendaSessionNumber(openSession.sessionNumber);
      setAgendaOpen(true);
    } else {
      ensureSession.mutate();
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInProgress && series.latestSession) {
      router.push(`/wizard/${series.latestSession.id}`);
    } else {
      startMutation.mutate();
    }
  };

  return (
    <div className={`group relative bg-card rounded-2xl p-6 flex flex-col h-full overflow-hidden border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:border-[var(--editorial-outline-variant,var(--border))]/80 ${sentimentClass} ${isOverdue ? "border-l-4 border-l-[var(--color-warning,#f59e0b)]" : ""}`}>
      {/* Clickable overlay */}
      <Link href={`/sessions/${series.id}`} className="absolute inset-0 z-0" />

      {/* Header: Avatar + Name + Status + Agenda */}
      <div className="flex justify-between items-start mb-4 relative z-[1]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-11 w-11 rounded-xl">
              <AvatarImage src={getAvatarUrl(reportName, series.report.avatarUrl)} alt={reportName} className="rounded-xl" />
              <AvatarFallback className="text-xs rounded-xl font-bold">{getInitials(series.report.firstName, series.report.lastName)}</AvatarFallback>
            </Avatar>
            {/* Relationship badge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-card ${isManager ? "bg-primary" : "bg-[var(--color-success)]"}`}>
                  {isManager
                    ? <UserCog className="h-2.5 w-2.5 text-white" />
                    : <UserCheck className="h-2.5 w-2.5 text-white" />}
                </span>
              </TooltipTrigger>
              <TooltipContent>{isManager ? t("series.tooltipYouManage") : t("series.tooltipYourManager")}</TooltipContent>
            </Tooltip>
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-foreground truncate">{reportName}</h4>
            {score !== null && <StarRating score={score} size="sm" />}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Agenda button */}
          {series.status === "active" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="relative z-10 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-[var(--editorial-surface-container,var(--muted))] transition-all"
                  onClick={handleAgendaClick}
                  disabled={ensureSession.isPending}
                  aria-label={`${reportName} ${t("series.agenda")}`}
                >
                  <ListTodo className="h-4 w-4" />
                  {(series.latestSession?.talkingPointCount ?? 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-white text-[9px] font-bold px-1">
                      {series.latestSession!.talkingPointCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{t("series.tooltipAgenda")}</TooltipContent>
            </Tooltip>
          )}

          {/* Status badge */}
          {isOverdue ? (
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-warning,#f59e0b)] bg-[var(--color-warning,#f59e0b)]/10 px-2 py-0.5 rounded-md">
              {t("editorial.overdue")}
            </span>
          ) : series.status !== "active" ? (
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-[var(--editorial-surface-container,var(--muted))] px-2 py-0.5 rounded-md">
              {series.status === "paused" ? t("series.statusPaused") : t("series.statusArchived")}
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-success)] bg-[var(--color-success)]/10 px-2 py-0.5 rounded-md">
              {t("editorial.active")}
            </span>
          )}
        </div>
      </div>

      {/* AI Summary blurb with sentiment dot */}
      <div className="mb-3 flex-1 relative z-[1] pointer-events-none">
        {series.latestSummary ? (
          <p className="text-xs text-muted-foreground font-medium leading-relaxed line-clamp-2 flex items-start gap-1.5">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
              sentiment === "positive" ? "bg-[var(--color-success)]"
              : sentiment === "concerning" ? "bg-destructive"
              : "bg-[var(--color-warning,#f59e0b)]"
            }`} />
            {series.latestSummary.blurb}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic line-clamp-2">
            {t("series.summaryPlaceholder")}
          </p>
        )}
      </div>

      {/* In-progress status + template name */}
      {isInProgress && series.latestSession && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-2 relative z-[1]">
          <span className="font-medium">{t("series.inProgress", { number: series.latestSession.sessionNumber })}</span>
          {series.defaultTemplateName && (
            <span className="text-muted-foreground/60 truncate max-w-[50%]">{series.defaultTemplateName}</span>
          )}
        </div>
      )}

      {/* Sparkline */}
      {chartData.length >= 2 && (
        <div className="relative h-[50px] -mx-6 mb-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, rgba(15, 23, 42, 0.03))" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`sparkGrad-${series.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                {series.questionHistories.map((q, qi) => {
                  const color = hashSeriesColor(q.questionText);
                  return (
                    <linearGradient key={`qg-${qi}`} id={`sparkGrad-q-${series.id}-${qi}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <YAxis domain={sparkDomain} hide />
              {series.questionHistories.map((q, qi) => {
                const color = hashSeriesColor(q.questionText);
                const opacity = ((q.scoreWeight - 0.5) / 1.5) * 0.18 + 0.02;
                return (
                  <Area key={`q${qi}`} type="monotone" dataKey={`q${qi}`} stroke={color} strokeWidth={1.5}
                    fill={`url(#sparkGrad-q-${series.id}-${qi})`} opacity={opacity} isAnimationActive={false} connectNulls />
                );
              })}
              <Area type="monotone" dataKey="main" stroke="var(--chart-1)" strokeWidth={2}
                fill={`url(#sparkGrad-${series.id})`} opacity={0.35} isAnimationActive={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer: Date + Schedule + Action */}
      <div className="flex items-end justify-between pt-4 border-t border-[var(--editorial-outline-variant,var(--border))]/50 relative z-[1]">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <CalendarDays className="h-3 w-3" />
            <span>{nextDateText}</span>
          </div>
          <span className="text-[10px] text-muted-foreground/50">{scheduleText}</span>
        </div>

        {isManager && series.status === "active" ? (
          <button
            type="button"
            onClick={handleAction}
            disabled={startMutation.isPending}
            className={`relative z-10 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
              isInProgress
                ? "text-white shadow-sm"
                : "text-primary hover:bg-primary/5"
            }`}
            style={isInProgress ? { background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" } : undefined}
          >
            {isInProgress ? (
              <><RotateCcw className="h-3.5 w-3.5" /> {t("series.resume")}</>
            ) : (
              <><Play className="h-3.5 w-3.5" /> {t("series.start")}</>
            )}
          </button>
        ) : (
          <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 relative z-10">
            {t("editorial.details")} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {/* Agenda Sheet */}
      {agendaSessionId && (
        <AgendaSheet
          open={agendaOpen}
          onOpenChange={setAgendaOpen}
          sessionId={agendaSessionId}
          personName={reportName}
          sessionNumber={agendaSessionNumber}
          sessionDate={series.latestSession?.scheduledAt ?? series.nextSessionAt ?? ""}
        />
      )}
    </div>
  );
}
