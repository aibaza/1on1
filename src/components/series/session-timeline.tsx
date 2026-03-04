"use client";

import { Badge } from "@/components/ui/badge";

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
  completed: "default",
  in_progress: "secondary",
  scheduled: "outline",
  cancelled: "destructive",
  missed: "destructive",
};

export function SessionTimeline({ sessions }: SessionTimelineProps) {
  if (sessions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No sessions yet. Start your first session above.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {sessions.map((s, index) => (
        <div
          key={s.id}
          className="flex items-center gap-4 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
        >
          {/* Timeline dot + connector */}
          <div className="relative flex flex-col items-center">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                s.status === "completed"
                  ? "bg-primary"
                  : s.status === "in_progress"
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
                Session #{s.sessionNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(s.scheduledAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {s.durationMinutes && (
                  <span className="ml-1.5">({s.durationMinutes} min)</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {s.sessionScore && (
                <span className="text-sm font-medium tabular-nums">
                  {parseFloat(s.sessionScore).toFixed(1)}
                </span>
              )}
              <Badge variant={statusVariant[s.status] ?? "outline"} className="text-xs">
                {s.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
