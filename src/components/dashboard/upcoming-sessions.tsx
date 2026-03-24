"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemedAvatarImage } from "@/components/ui/themed-avatar-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Play,
  RotateCcw,
  Plus,
} from "lucide-react";
import type { UpcomingSession } from "@/lib/queries/dashboard";
import { useTranslations, useFormatter } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";

interface UpcomingSessionsProps {
  sessions: UpcomingSession[];
}

function SessionCard({
  session,
}: {
  session: UpcomingSession;
}) {
  const router = useRouter();
  const t = useTranslations("dashboard.upcoming");
  const tSessions = useTranslations("sessions");
  const format = useFormatter();
  const { showApiError } = useApiErrorToast();

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
      toast.success(tSessions("detail.sessionStarted", { number: data.sessionNumber }));
      router.push(`/wizard/${data.id}`);
    },
    onError: (error: Error) => {
      showApiError(error);
    },
  });

  const initials = session.reportName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const isInProgress = session.status === "in_progress";

  return (
    <Card
      className="transition-all duration-200 hover:border-foreground/20 hover:shadow-md"
    >
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Avatar className="h-10 w-10">
          <ThemedAvatarImage name={session.reportName} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-medium truncate">
            {session.reportName}
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            <span>{format.dateTime(new Date(session.scheduledAt), { weekday: "short", month: "short", day: "numeric" })}</span>
            <span>&middot;</span>
            <span>{format.dateTime(new Date(session.scheduledAt), { hour: "numeric", minute: "2-digit" })}</span>
          </div>
        </div>
        {session.isToday && (
          <Badge variant="default" className="shrink-0">
            {t("today")}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {session.templateName && (
          <p className="text-xs text-muted-foreground">{session.templateName}</p>
        )}

        {/* Start / Resume button for today's sessions */}
        {session.isToday && (
          <Button
            variant={isInProgress ? "outline" : "default"}
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
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
                {t("resumeSession")}
              </>
            ) : (
              <>
                <Play className="mr-1.5 size-3.5" />
                {t("startSession")}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function UpcomingSessions({ sessions }: UpcomingSessionsProps) {
  const t = useTranslations("dashboard.upcoming");

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        heading={t("noSessions")}
        description={t("noSessionsDesc")}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/sessions/new">
              <Plus className="mr-1.5 size-3.5" />
              {t("newSeries")}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((s) => (
        <SessionCard
          key={s.sessionId}
          session={s}
        />
      ))}
    </div>
  );
}
