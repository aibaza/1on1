"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { SessionListItem } from "@/components/ui/session-list-item";

interface SessionEntry {
  id: string;
  sessionNumber: number;
  scheduledAt: string;
  completedAt: string | null;
  status: string;
  sessionScore: string | null;
  durationMinutes: number | null;
  aiSnippet?: string | null;
  sentiment?: string | null;
}

interface SessionTimelineProps {
  sessions: SessionEntry[];
}

export const statusVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  completed: "outline",
  in_progress: "default",
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

  if (sessions.length === 0) {
    return <EmptyState heading={t("noSessions")} className="py-0" />;
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const isCompleted = s.status === "completed";
        const isInProgress = s.status === "in_progress";

        return (
          <SessionListItem
            key={s.id}
            id={s.id}
            sessionNumber={s.sessionNumber}
            date={s.completedAt ?? s.scheduledAt}
            score={s.sessionScore ? parseFloat(s.sessionScore) : null}
            aiSnippet={s.aiSnippet}
            sentiment={s.sentiment}
            href={isCompleted ? `/sessions/${s.id}/summary` : undefined}
            name={t(statusKeys[s.status] as Parameters<typeof t>[0])}
            trailing={
              isInProgress ? (
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
              ) : undefined
            }
          />
        );
      })}
    </div>
  );
}
