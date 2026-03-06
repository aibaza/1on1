"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
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
import { useTranslations, useFormatter } from "next-intl";

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

export function SeriesDetail({ series, currentUserId }: SeriesDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("sessions");
  const format = useFormatter();
  const { showApiError } = useApiErrorToast();
  const isManager = series.manager?.id === currentUserId;
  const hasInProgress = series.sessions.some(
    (s) => s.status === "in_progress"
  );

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
      toast.success(t("detail.sessionStarted", { number: data.sessionNumber }));
      router.push(`/wizard/${data.id}`);
    },
    onError: (error: Error) => {
      showApiError(error);
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
      toast.success(t("detail.seriesUpdated"));
      queryClient.invalidateQueries({ queryKey: ["series"] });
      router.refresh();
    },
    onError: (error: Error) => {
      showApiError(error);
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
      toast.success(t("detail.seriesArchived"));
      router.push("/sessions");
      router.refresh();
    },
    onError: (error: Error) => {
      showApiError(error);
    },
  });

  const report = series.report;
  const reportInitials =
    (report?.firstName?.[0] ?? "") + (report?.lastName?.[0] ?? "");

  const managerName = series.manager
    ? `${series.manager.firstName} ${series.manager.lastName}`
    : "";

  const statusBadgeVariant =
    series.status === "active"
      ? "secondary"
      : "outline";

  const statusLabel =
    series.status === "active"
      ? t("series.statusActive")
      : series.status === "paused"
        ? t("series.statusPaused")
        : t("series.statusArchived");

  const preferredDayLabel = series.preferredDay
    ? t(`form.${series.preferredDay === "mon" ? "monday" : series.preferredDay === "tue" ? "tuesday" : series.preferredDay === "wed" ? "wednesday" : series.preferredDay === "thu" ? "thursday" : "friday"}`)
    : t("detail.noPreference");

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
              {t("detail.oneOnOneWith", { name: managerName })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusBadgeVariant as "secondary" | "outline"}>
            {statusLabel}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      {isManager && series.status !== "archived" && (
        <div className="flex items-center gap-2">
          {!hasInProgress ? (
            <Button
              variant="outline"
              onClick={() => startSession.mutate()}
              disabled={startSession.isPending}
            >
              <Play className="mr-1.5 h-4 w-4" />
              {t("detail.startSession")}
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (inProgressSession) {
                  router.push(`/wizard/${inProgressSession.id}`);
                }
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              {t("detail.resumeSession")}
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
              {t("detail.pause")}
            </Button>
          ) : series.status === "paused" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus.mutate("active")}
              disabled={updateStatus.isPending}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              {t("detail.resumeSeries")}
            </Button>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            onClick={() => archiveSeries.mutate()}
            disabled={archiveSeries.isPending}
          >
            <Archive className="mr-1.5 h-3.5 w-3.5" />
            {t("detail.archive")}
          </Button>
        </div>
      )}

      <Separator />

      {/* Settings summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("detail.cadence")}
          </p>
          <p className="text-sm capitalize">
            {series.cadence === "custom"
              ? t("detail.everyDays", { count: series.cadenceCustomDays ?? 0 })
              : series.cadence === "weekly" ? t("form.weekly")
              : series.cadence === "biweekly" ? t("form.biweekly")
              : series.cadence === "monthly" ? t("form.monthly")
              : series.cadence}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("detail.preferredDay")}
          </p>
          <p className="text-sm flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            {preferredDayLabel}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("detail.preferredTime")}
          </p>
          <p className="text-sm flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {series.preferredTime ?? t("detail.noPreference")}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("detail.duration")}
          </p>
          <p className="text-sm flex items-center gap-1">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            {t("detail.durationMinutes", { count: series.defaultDurationMinutes })}
          </p>
        </div>
      </div>

      {series.nextSessionAt && (
        <div className="rounded-md bg-muted/50 px-4 py-3">
          <p className="text-sm">
            <span className="font-medium">{t("detail.nextSession")}</span>{" "}
            {format.dateTime(new Date(series.nextSessionAt), {
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
        <h2 className="mb-3 text-lg font-medium">{t("detail.sessionHistory")}</h2>
        <SessionTimeline sessions={series.sessions} />
      </div>
    </div>
  );
}
