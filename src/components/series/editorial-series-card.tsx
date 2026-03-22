"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { useTranslations, useFormatter } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, Star } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { hashSeriesColor } from "@/lib/chart-colors";

interface EditorialSeriesCardProps {
  series: {
    id: string;
    managerId: string;
    cadence: string;
    status: string;
    nextSessionAt: string | null;
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

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <Star
      className={className}
      fill={filled ? "currentColor" : "none"}
      strokeWidth={filled ? 0 : 1.5}
    />
  );
}

export function EditorialSeriesCard({ series, currentUserId, showManagerName }: EditorialSeriesCardProps) {
  const t = useTranslations("sessions");
  const format = useFormatter();
  const router = useRouter();
  const isManager = series.managerId === currentUserId;
  const reportName = `${series.report.firstName} ${series.report.lastName}`;
  const score = series.latestSession?.sessionScore ? parseFloat(series.latestSession.sessionScore) : null;
  const isInProgress = series.latestSession?.status === "in_progress";
  const isOverdue = series.nextSessionAt && new Date(series.nextSessionAt).getTime() < Date.now();
  const isPrefillReady = false; // TODO: wire when prefill feature ships

  // Build sparkline chart data from assessment history + question histories
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
      qh.forEach((q, qi) => {
        if (i < q.values.length) point[`q${qi}`] = q.values[i];
      });
      return point;
    });

    return { chartData: data, sparkDomain: [minVal, maxVal] as [number, number] };
  }, [series.assessmentHistory, series.questionHistories]);

  // Start session mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/series/${series.id}/start`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start session");
      return res.json();
    },
    onSuccess: (data) => {
      router.push(`/wizard/${data.sessionId}`);
    },
    onError: () => {
      toast.error("Failed to start session");
    },
  });

  const handleAction = () => {
    if (isInProgress && series.latestSession) {
      router.push(`/wizard/${series.latestSession.id}`);
    } else if (isManager) {
      startMutation.mutate();
    }
  };

  return (
    <div
      className={`group bg-card rounded-2xl p-6 flex flex-col relative overflow-hidden border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] hover:border-[var(--editorial-outline-variant,var(--border))]/60 hover:-translate-y-0.5 ${
        isOverdue ? "border-l-4 border-l-amber-400" : ""
      }`}
    >
      {/* Prefill ready ribbon */}
      {isPrefillReady && (
        <div className="absolute -right-8 top-4 bg-accent px-10 py-1 rotate-45 text-[10px] font-extrabold uppercase tracking-tighter text-accent-foreground">
          Prefill ready
        </div>
      )}

      {/* Header: Avatar + Name + Status */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--editorial-outline-variant,var(--border))]/50">
            <Avatar className="w-full h-full rounded-xl">
              <AvatarImage src={series.report.avatarUrl ?? undefined} alt={reportName} className="rounded-xl" />
              <AvatarFallback className="text-sm rounded-xl">{getInitials(series.report.firstName, series.report.lastName)}</AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">{reportName}</h4>
            {score !== null && (
              <div className="flex text-primary/30 scale-75 -ml-3.5 origin-left">
                {[1, 2, 3, 4, 5].map((i) => (
                  <StarIcon key={i} className="h-5 w-5" filled={i <= Math.round(score)} />
                ))}
              </div>
            )}
            {score === null && (
              <p className="text-muted-foreground text-xs font-medium">
                {showManagerName
                  ? `${series.manager.firstName} ${series.manager.lastName}`
                  : series.cadence}
              </p>
            )}
          </div>
        </div>
        {isOverdue ? (
          <span className="text-[9px] font-bold uppercase tracking-widest text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">
            Overdue
          </span>
        ) : (
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
            series.status === "active"
              ? "text-[var(--color-success)] bg-[var(--color-success)]/10"
              : "text-muted-foreground bg-muted"
          }`}>
            {series.status === "active" ? "Active" : series.status}
          </span>
        )}
      </div>

      {/* AI Summary blurb */}
      <div className="mb-4 flex-1">
        <p className="text-xs text-muted-foreground font-medium leading-relaxed italic text-balance line-clamp-3">
          {series.latestSummary?.blurb
            ? `"${series.latestSummary.blurb}"`
            : series.latestSession
              ? `Session #${series.latestSession.sessionNumber} completed`
              : "No sessions yet — start your first 1:1"}
        </p>
      </div>

      {/* Recharts sparkline */}
      {chartData.length >= 2 && (
        <div className="relative h-[60px] mt-auto -mx-6 mb-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, rgba(15, 23, 42, 0.03))" }}>
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
                  <Area
                    key={`q${qi}`}
                    type="monotone"
                    dataKey={`q${qi}`}
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#sparkGrad-q-${series.id}-${qi})`}
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
                fill={`url(#sparkGrad-${series.id})`}
                opacity={0.35}
                isAnimationActive={false}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer: Date + Action */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--editorial-outline-variant,var(--border))]/50 relative z-10">
        {isOverdue ? (
          <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">
            Overdue
          </span>
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {series.nextSessionAt
              ? format.dateTime(new Date(series.nextSessionAt), { day: "2-digit", month: "short" }).toUpperCase()
              : "TBD"}
          </span>
        )}

        {isManager ? (
          isOverdue ? (
            <button
              onClick={handleAction}
              className="bg-primary text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--editorial-primary-container,var(--primary))] transition-all shadow-sm"
            >
              Complete
            </button>
          ) : isInProgress ? (
            <button
              onClick={handleAction}
              className="text-xs font-bold text-primary hover:underline transition-all flex items-center gap-1"
            >
              Resume <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : series.latestSession ? (
            <button
              onClick={handleAction}
              disabled={startMutation.isPending}
              className="text-xs font-bold text-primary hover:underline transition-all flex items-center gap-1 disabled:opacity-50"
            >
              Start <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              href={`/sessions/${series.id}`}
              className="text-xs font-bold text-foreground hover:text-primary transition-all"
            >
              Details
            </Link>
          )
        ) : (
          <Link
            href={`/sessions/${series.id}`}
            className="text-xs font-bold text-foreground hover:text-primary transition-all"
          >
            Details
          </Link>
        )}
      </div>
    </div>
  );
}
