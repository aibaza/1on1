"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Sparkles, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Nudge {
  id: string;
  content: string;
  reason: string | null;
  priority: string;
  seriesId: string;
  reportName: string;
  targetSessionAt: string | null;
  isDismissed: boolean;
}

interface NudgeListProps {
  seriesId: string;
  sessionId: string;
}

export function NudgeList({ seriesId }: NudgeListProps) {
  const t = useTranslations("sessions.nudges");
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { data } = useQuery<{ nudges: Nudge[] }>({
    queryKey: ["nudges", seriesId],
    queryFn: async () => {
      const res = await fetch(
        `/api/nudges?seriesId=${seriesId}`
      );
      if (!res.ok) throw new Error("Failed to fetch nudges");
      return res.json();
    },
    staleTime: 60_000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (nudgeId: string) => {
      const res = await fetch(`/api/nudges/${nudgeId}/dismiss`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to dismiss nudge");
      return res.json();
    },
    onMutate: (nudgeId: string) => {
      setDismissedIds((prev) => new Set([...prev, nudgeId]));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["nudges", seriesId] });
    },
  });

  const visibleNudges =
    data?.nudges.filter((n) => !dismissedIds.has(n.id)) ?? [];

  if (!data || visibleNudges.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer p-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left">{t("title")}</span>
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[10px] font-normal"
          >
            {visibleNudges.length}
          </Badge>
        </button>
      </CardHeader>
      {isOpen && (
        <CardContent className="px-3 pb-3 pt-0">
          <div className="space-y-1.5">
            {visibleNudges.map((nudge) => (
              <div
                key={nudge.id}
                className="group flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs"
              >
                <span
                  className={cn(
                    "mt-1.5 inline-block size-1.5 rounded-full shrink-0",
                    nudge.priority === "high" && "bg-red-500",
                    nudge.priority === "medium" && "bg-amber-500",
                    nudge.priority === "low" && "bg-neutral-400"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="leading-relaxed text-foreground">
                    {nudge.content}
                  </p>
                  {nudge.reason && (
                    <p className="mt-0.5 text-muted-foreground text-[10px] leading-relaxed">
                      {nudge.reason}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissMutation.mutate(nudge.id);
                  }}
                  disabled={dismissMutation.isPending}
                  title={t("dismiss")}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
