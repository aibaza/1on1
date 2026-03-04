"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Play,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import type { UpcomingSession } from "@/lib/queries/dashboard";
import type { NudgeData } from "@/components/dashboard/nudge-card";

interface UpcomingSessionsProps {
  sessions: UpcomingSession[];
}

function formatSessionTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function InlineNudge({ nudge }: { nudge: NudgeData }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-amber-50/60 px-3 py-2 dark:bg-amber-950/30">
      <Sparkles className="mt-0.5 size-3 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
        {nudge.content}
      </p>
    </div>
  );
}

function SessionCard({ session }: { session: UpcomingSession }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const firstNudge = session.nudges[0];
  const extraNudges = session.nudges.slice(1);
  const hasExtraNudges = extraNudges.length > 0;

  const startSession = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/series/${session.seriesId}/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start session");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Session #${data.sessionNumber} started`);
      router.push(`/wizard/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const initials = session.reportName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const isInProgress = session.status === "in_progress";

  return (
    <Card className="transition-colors hover:border-foreground/20">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Avatar className="size-9">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-medium truncate">
            {session.reportName}
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            <span>{formatSessionTime(session.scheduledAt)}</span>
            <span>&middot;</span>
            <span>{formatTime(session.scheduledAt)}</span>
          </div>
        </div>
        {session.isToday && (
          <Badge variant="default" className="shrink-0">
            Today
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {session.templateName && (
          <p className="text-xs text-muted-foreground">{session.templateName}</p>
        )}

        {/* Inline nudge preview */}
        {firstNudge && <InlineNudge nudge={firstNudge} />}
        {expanded &&
          extraNudges.map((n) => <InlineNudge key={n.id} nudge={n} />)}
        {hasExtraNudges && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="size-3" />+{extraNudges.length} more{" "}
                {extraNudges.length === 1 ? "nudge" : "nudges"}
              </>
            )}
          </button>
        )}

        {/* Start / Resume button for today's sessions */}
        {session.isToday && (
          <Button
            variant={isInProgress ? "outline" : "default"}
            size="sm"
            className="w-full"
            onClick={() => {
              if (isInProgress && session.activeSessionId) {
                router.push(`/wizard/${session.activeSessionId}`);
              } else {
                startSession.mutate();
              }
            }}
            disabled={startSession.isPending}
          >
            {isInProgress ? (
              <>
                <RotateCcw className="mr-1.5 size-3.5" />
                Resume Session
              </>
            ) : (
              <>
                <Play className="mr-1.5 size-3.5" />
                Start Session
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function UpcomingSessions({ sessions }: UpcomingSessionsProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Calendar className="mx-auto mb-3 size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">No upcoming sessions this week</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Set up a meeting series to get started
        </p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/sessions/new">
            <Plus className="mr-1.5 size-3.5" />
            New Meeting Series
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((s) => (
        <SessionCard key={s.sessionId} session={s} />
      ))}
    </div>
  );
}
