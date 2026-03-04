"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SessionTimeline } from "./session-timeline";
import {
  Play,
  Pause,
  RotateCcw,
  Archive,
  CalendarDays,
  Clock,
  Settings,
} from "lucide-react";

interface SeriesDetailData {
  id: string;
  cadence: string;
  cadenceCustomDays: number | null;
  defaultDurationMinutes: number;
  defaultTemplateId: string | null;
  preferredDay: string | null;
  preferredTime: string | null;
  status: string;
  nextSessionAt: string | null;
  createdAt: string;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  report: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  sessions: Array<{
    id: string;
    sessionNumber: number;
    scheduledAt: string;
    completedAt: string | null;
    status: string;
    sessionScore: string | null;
    durationMinutes: number | null;
  }>;
}

interface SeriesDetailProps {
  series: SeriesDetailData;
  currentUserId: string;
}

const dayLabels: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
};

export function SeriesDetail({ series, currentUserId }: SeriesDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isManager = series.manager?.id === currentUserId;
  const hasInProgress = series.sessions.some(
    (s) => s.status === "in_progress"
  );

  // Find the in-progress session id for Resume navigation
  const inProgressSession = series.sessions.find(
    (s) => s.status === "in_progress"
  );

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
      toast.success(`Session #${data.sessionNumber} started`);
      router.push(`/wizard/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/series/${series.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update series");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Series updated");
      queryClient.invalidateQueries({ queryKey: ["series"] });
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const archiveSeries = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/series/${series.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to archive series");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Series archived");
      router.push("/sessions");
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const report = series.report;
  const reportInitials =
    (report?.firstName?.[0] ?? "") + (report?.lastName?.[0] ?? "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={report?.avatarUrl ?? undefined} />
            <AvatarFallback className="text-lg">{reportInitials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold">
              {report?.firstName} {report?.lastName}
            </h1>
            <p className="text-muted-foreground">
              1:1 with {series.manager?.firstName} {series.manager?.lastName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              series.status === "active"
                ? "default"
                : series.status === "paused"
                  ? "secondary"
                  : "outline"
            }
          >
            {series.status}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      {isManager && series.status !== "archived" && (
        <div className="flex items-center gap-2">
          {!hasInProgress ? (
            <Button
              onClick={() => startSession.mutate()}
              disabled={startSession.isPending}
            >
              <Play className="mr-1.5 h-4 w-4" />
              Start Session
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                if (inProgressSession) {
                  router.push(`/wizard/${inProgressSession.id}`);
                }
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Resume Session
            </Button>
          )}

          {series.status === "active" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus.mutate("paused")}
              disabled={updateStatus.isPending}
            >
              <Pause className="mr-1.5 h-3.5 w-3.5" />
              Pause
            </Button>
          ) : series.status === "paused" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus.mutate("active")}
              disabled={updateStatus.isPending}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Resume
            </Button>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            onClick={() => archiveSeries.mutate()}
            disabled={archiveSeries.isPending}
          >
            <Archive className="mr-1.5 h-3.5 w-3.5" />
            Archive
          </Button>
        </div>
      )}

      <Separator />

      {/* Settings summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Cadence
          </p>
          <p className="text-sm capitalize">
            {series.cadence === "custom"
              ? `Every ${series.cadenceCustomDays} days`
              : series.cadence}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Preferred day
          </p>
          <p className="text-sm flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            {series.preferredDay
              ? dayLabels[series.preferredDay] ?? series.preferredDay
              : "No preference"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Preferred time
          </p>
          <p className="text-sm flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {series.preferredTime ?? "No preference"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Duration
          </p>
          <p className="text-sm flex items-center gap-1">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            {series.defaultDurationMinutes} min
          </p>
        </div>
      </div>

      {series.nextSessionAt && (
        <div className="rounded-md bg-muted/50 px-4 py-3">
          <p className="text-sm">
            <span className="font-medium">Next session:</span>{" "}
            {new Date(series.nextSessionAt).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      )}

      <Separator />

      {/* Session history */}
      <div>
        <h2 className="mb-3 text-lg font-medium">Session History</h2>
        <SessionTimeline sessions={series.sessions} />
      </div>
    </div>
  );
}
