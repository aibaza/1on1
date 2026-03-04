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
  active: "default",
  paused: "secondary",
  archived: "outline",
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function SeriesCard({ series, currentUserId }: SeriesCardProps) {
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
      toast.error(error.message);
    },
  });

  const initials =
    (series.report.firstName?.[0] ?? "") +
    (series.report.lastName?.[0] ?? "");

  return (
    <Card className="group relative transition-colors hover:border-foreground/20">
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
          <p className="text-sm text-muted-foreground capitalize">
            {series.cadence}
          </p>
        </div>
        <Badge variant={statusVariant[series.status] ?? "outline"}>
          {series.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {series.nextSessionAt ? (
              <span>{formatRelativeDate(series.nextSessionAt)}</span>
            ) : (
              <span>Not scheduled</span>
            )}
          </div>
          {series.latestSession?.sessionScore && series.latestSession.status === "completed" && (
            <span className="text-sm font-medium tabular-nums text-muted-foreground">
              {parseFloat(series.latestSession.sessionScore).toFixed(1)} / 5
            </span>
          )}
        </div>
        {isManager && series.status === "active" && (
          <Button
            variant={hasInProgress ? "outline" : "default"}
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
                Resume
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Start
              </>
            )}
          </Button>
        )}
        {hasInProgress && series.latestSession && (
          <p className="text-xs text-muted-foreground">
            Session #{series.latestSession.sessionNumber} in progress
          </p>
        )}
      </CardContent>
    </Card>
  );
}
