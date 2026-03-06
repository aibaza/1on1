"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";

interface SessionEntry {
  id: string;
  sessionNumber: number;
  scheduledAt: string;
  completedAt: string | null;
  status: string;
  sessionScore: string | null;
  durationMinutes: number | null;
}

interface SessionTimelineProps {
  sessions: SessionEntry[];
}

const statusVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  completed: "secondary",
  in_progress: "outline",
  scheduled: "outline",
  cancelled: "destructive",
  missed: "destructive",
};

const statusKeys: Record<string, string> = {
  completed: "statusCompleted",
  in_progress: "statusInProgress",
  scheduled: "statusScheduled",
  cancelled: "statusCancelled",
  missed: "statusMissed",
};

export function SessionTimeline({ sessions }: SessionTimelineProps) {
  const router = useRouter();
  const t = useTranslations("sessions.timeline");
  const format = useFormatter();

  if (sessions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("noSessions")}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {sessions.map((s, index) => {
        const isCompleted = s.status === "completed";
        const isInProgress = s.status === "in_progress";
        const isClickable = isCompleted || isInProgress;

        const content = (
          <div
            className={`flex items-center gap-4 rounded-md px-3 py-2.5 transition-colors ${
              isClickable
                ? "cursor-pointer hover:bg-muted/70"
                : "hover:bg-muted/50"
            }`}
          >
            {/* Timeline dot + connector */}
            <div className="relative flex flex-col items-center">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  isCompleted
                    ? "bg-primary"
                    : isInProgress
                      ? "bg-yellow-500"
                      : "bg-muted-foreground/30"
                }`}
              />
              {index < sessions.length - 1 && (
                <div className="absolute top-3 h-6 w-px bg-border" />
              )}
            </div>

            {/* Session info */}
            <div className="flex flex-1 items-center justify-between min-w-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {t("sessionNumber", { number: s.sessionNumber })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format.dateTime(new Date(s.scheduledAt), {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {s.durationMinutes && (
                    <span className="ml-1.5">{t("duration", { count: s.durationMinutes })}</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {s.sessionScore && (
                  <span className="text-sm font-medium tabular-nums">
                    {format.number(parseFloat(s.sessionScore), { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
                  </span>
                )}
                {isInProgress && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/wizard/${s.id}`);
                    }}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t("resume")}
                  </Button>
                )}
                <Badge
                  variant={statusVariant[s.status] ?? "outline"}
                  className="text-xs"
                >
                  {t(statusKeys[s.status] as Parameters<typeof t>[0])}
                </Badge>
              </div>
            </div>
          </div>
        );

        if (isCompleted) {
          return (
            <Link key={s.id} href={`/sessions/${s.id}/summary`}>
              {content}
            </Link>
          );
        }

        return <div key={s.id}>{content}</div>;
      })}
    </div>
  );
}
