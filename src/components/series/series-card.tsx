"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CalendarDays, Play, RotateCcw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { useTranslations, useFormatter } from "next-intl";

interface SeriesCardProps {
  series: {
    id: string;
    managerId: string;
    cadence: string;
    status: string;
    nextSessionAt: string | null;
    report: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    };
    latestSession: {
      id: string;
      status: string;
      sessionNumber: number;
      sessionScore: string | null;
    } | null;
  };
  currentUserId: string;
}

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "secondary",
  paused: "outline",
  archived: "outline",
};

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

  return format.dateTime(date, {
    month: "short",
    day: "numeric",
  });
}

export function SeriesCard({ series, currentUserId }: SeriesCardProps) {
  const t = useTranslations("sessions");
  const format = useFormatter();
  const { showApiError } = useApiErrorToast();
  const router = useRouter();
  const hasInProgress = series.latestSession?.status === "in_progress";
  const isManager = series.managerId === currentUserId;

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
      showApiError(error);
    },
  });

  const initials =
    (series.report.firstName?.[0] ?? "") +
    (series.report.lastName?.[0] ?? "");

  return (
    <Card className="group relative transition-all duration-200 hover:border-foreground/20 hover:shadow-md">
      <Link href={`/sessions/${series.id}`} className="absolute inset-0 z-0" />
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src={series.report.avatarUrl ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base truncate">
            {series.report.firstName} {series.report.lastName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {series.cadence === "weekly" ? t("form.weekly")
              : series.cadence === "biweekly" ? t("form.biweekly")
              : series.cadence === "monthly" ? t("form.monthly")
              : series.cadence}
          </p>
        </div>
        <Badge variant={statusVariant[series.status] ?? "outline"}>
          {series.status === "active"
            ? t("series.statusActive")
            : series.status === "paused"
              ? t("series.statusPaused")
              : t("series.statusArchived")}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {series.nextSessionAt ? (
              <span>{formatRelativeDate(series.nextSessionAt, t, format)}</span>
            ) : (
              <span>{t("series.notScheduled")}</span>
            )}
          </div>
          {series.latestSession?.sessionScore && series.latestSession.status === "completed" && (
            <span className="text-sm font-medium tabular-nums text-muted-foreground">
              {format.number(parseFloat(series.latestSession.sessionScore), { maximumFractionDigits: 1, minimumFractionDigits: 1 })} / 5
            </span>
          )}
        </div>
        {isManager && series.status === "active" && (
          <Button
            variant={hasInProgress ? "default" : "outline"}
            size="sm"
            className="relative z-10"
            onClick={(e) => {
              e.preventDefault();
              if (!hasInProgress) {
                startSession.mutate();
              } else if (series.latestSession?.id) {
                // Navigate directly to the wizard to resume
                router.push(`/wizard/${series.latestSession.id}`);
              }
            }}
            disabled={startSession.isPending}
          >
            {hasInProgress ? (
              <>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {t("series.resume")}
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                {t("series.start")}
              </>
            )}
          </Button>
        )}
        {hasInProgress && series.latestSession && (
          <p className="text-xs text-muted-foreground">
            {t("series.inProgress", { number: series.latestSession.sessionNumber })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
