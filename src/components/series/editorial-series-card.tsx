"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations, useFormatter } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "@/components/ui/star-rating";
import { ChevronRight } from "lucide-react";

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
  };
  currentUserId: string;
  showManagerName?: boolean;
}

function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
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
      className={`group bg-card rounded-xl p-6 transition-all duration-300 hover:shadow-[0_20px_40px_rgba(41,64,125,0.06)] flex flex-col relative overflow-hidden ${
        isOverdue ? "border-l-4 border-amber-400 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.1)]" : ""
      }`}
    >
      {/* Prefill ready ribbon */}
      {isPrefillReady && (
        <div className="absolute -right-8 top-4 bg-accent px-10 py-1 rotate-45 text-[10px] font-extrabold uppercase tracking-tighter text-accent-foreground">
          Prefill ready
        </div>
      )}

      {/* Header: Avatar + Name + Status */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-muted group-hover:border-primary transition-colors">
            <Avatar className="w-full h-full">
              <AvatarImage src={series.report.avatarUrl ?? undefined} alt={reportName} />
              <AvatarFallback className="text-sm">{getInitials(series.report.firstName, series.report.lastName)}</AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h4 className="font-bold text-lg text-foreground">{reportName}</h4>
            <p className="text-muted-foreground text-sm font-medium">
              {showManagerName
                ? `${series.manager.firstName} ${series.manager.lastName}`
                : series.cadence}
            </p>
          </div>
        </div>
        {isOverdue ? (
          <span className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
            Overdue
          </span>
        ) : (
          <span className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {series.status === "active" ? "Active" : series.status}
          </span>
        )}
      </div>

      {/* Star rating */}
      {score !== null && (
        <div className="flex items-center gap-1 mb-4">
          <StarRating score={score} size="sm" />
          <span className="text-xs font-bold text-muted-foreground ml-1">{score.toFixed(1)}</span>
        </div>
      )}

      {/* AI Summary blurb */}
      <div className="bg-muted p-4 rounded-lg mb-6 flex-1">
        <p className="text-sm text-muted-foreground italic leading-relaxed line-clamp-3">
          {series.latestSummary?.blurb
            ? `"${series.latestSummary.blurb}"`
            : series.latestSession
              ? `Session #${series.latestSession.sessionNumber} completed`
              : "No sessions yet — start your first 1:1"}
        </p>
      </div>

      {/* Sparkline gradient wave */}
      {series.assessmentHistory.length >= 2 && (
        <div
          className="h-10 w-full mb-6 opacity-60 group-hover:opacity-100 transition-opacity"
          style={{
            background: "linear-gradient(90deg, var(--color-success, #71d7cd) 0%, var(--primary) 100%)",
            maskImage: `url("data:image/svg+xml,%3Csvg width='200' height='40' viewBox='0 0 200 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30C20 30 30 10 50 15C70 20 80 35 100 25C120 15 130 5 150 10C170 15 180 35 200 30V40H0V30Z' fill='black'/%3E%3C/svg%3E")`,
            WebkitMaskImage: `url("data:image/svg+xml,%3Csvg width='200' height='40' viewBox='0 0 200 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30C20 30 30 10 50 15C70 20 80 35 100 25C120 15 130 5 150 10C170 15 180 35 200 30V40H0V30Z' fill='black'/%3E%3C/svg%3E")`,
            maskSize: "cover",
            WebkitMaskSize: "cover",
          }}
        />
      )}

      {/* Footer: Date + Action */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        {isOverdue ? (
          <span className="text-sm font-bold text-destructive">
            Missed: {series.nextSessionAt ? format.dateTime(new Date(series.nextSessionAt), { month: "short", day: "numeric" }) : ""}
          </span>
        ) : (
          <span className="text-sm font-medium text-muted-foreground">
            Next: {series.nextSessionAt ? format.dateTime(new Date(series.nextSessionAt), { month: "short", day: "numeric" }) : "TBD"}
          </span>
        )}

        {isManager ? (
          isOverdue ? (
            <button
              onClick={handleAction}
              className="bg-amber-500 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-amber-600 active:scale-95 transition-all"
            >
              Reschedule
            </button>
          ) : isInProgress ? (
            <button
              onClick={handleAction}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              Resume
            </button>
          ) : series.latestSession ? (
            <button
              onClick={handleAction}
              disabled={startMutation.isPending}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              Start
            </button>
          ) : (
            <Link
              href={`/sessions/${series.id}`}
              className="text-primary font-bold text-sm hover:underline flex items-center gap-1 group/btn"
            >
              Details
              <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          )
        ) : (
          <Link
            href={`/sessions/${series.id}`}
            className="text-primary font-bold text-sm hover:underline flex items-center gap-1 group/btn"
          >
            Details
            <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>
    </div>
  );
}
