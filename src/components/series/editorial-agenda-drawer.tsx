"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useFormatter } from "next-intl";
import { X, CalendarDays, Repeat, PlusCircle, GripVertical, AlertCircle, Sparkles } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemedAvatarImage } from "@/components/ui/themed-avatar-image";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { TalkingPoint } from "@/components/session/talking-point-list";

interface EditorialAgendaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  personName: string;
  personAvatarUrl?: string | null;
  personJobTitle?: string | null;
  personLevel?: string | null;
  sessionNumber: number;
  sessionDate: string;
  seriesId?: string;
  cadence?: string | null;
  preferredTime?: string | null;
  openActionItemCount?: number;
  overdueActionItemCount?: number;
  lastScore?: number | null;
  aiSnippet?: string | null;
}

export function EditorialAgendaDrawer({
  open,
  onOpenChange,
  sessionId,
  personName,
  personAvatarUrl,
  personJobTitle,
  personLevel,
  sessionNumber,
  sessionDate,
  seriesId,
  cadence,
  preferredTime,
  openActionItemCount,
  overdueActionItemCount,
  lastScore,
  aiSnippet,
}: EditorialAgendaDrawerProps) {
  const t = useTranslations("sessions");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [newContent, setNewContent] = useState("");

  // Fetch talking points
  const { data, isLoading } = useQuery<{
    talkingPoints: TalkingPoint[];
    categories: string[];
  }>({
    queryKey: ["talking-points", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/talking-points`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: open,
    staleTime: 0,
  });

  const points = data?.talkingPoints ?? [];
  const totalPoints = points.length;

  // Create
  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/sessions/${sessionId}/talking-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, category: data?.categories?.[0] ?? "General", sortOrder: totalPoints }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talking-points", sessionId] });
      setNewContent("");
      inputRef.current?.focus();
    },
  });

  // Toggle discussed
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isDiscussed }: { id: string; isDiscussed: boolean }) => {
      const res = await fetch(`/api/sessions/${sessionId}/talking-points`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDiscussed }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talking-points", sessionId] });
    },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sessions/${sessionId}/talking-points`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talking-points", sessionId] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newContent.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  }

  // Format
  const isOverdue = sessionDate && new Date(sessionDate).getTime() < Date.now();
  const formattedDate = sessionDate
    ? format.dateTime(new Date(sessionDate), { weekday: "long", month: "short", day: "numeric" })
    : "";
  const timeStr = preferredTime?.slice(0, 5) ?? null;
  const dateWithTime = timeStr ? `${formattedDate}, ${timeStr}` : formattedDate;

  // Relative date + time (same format as series card)
  const nextDateText = (() => {
    if (!sessionDate) return t("series.notScheduled");
    const date = new Date(sessionDate);
    const diffMs = date.getTime() - Date.now();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    let rel: string;
    if (diffDays === 0) rel = t("series.today");
    else if (diffDays === 1) rel = t("series.tomorrow");
    else if (diffDays === -1) rel = t("series.yesterday");
    else if (diffDays > 0 && diffDays <= 7) rel = t("series.inDays", { count: diffDays });
    else if (diffDays < 0 && diffDays >= -7) rel = t("series.daysAgo", { count: Math.abs(diffDays) });
    else rel = format.dateTime(date, { month: "short", day: "numeric" });
    const text = timeStr ? `${rel} ${t("series.atTime", { time: timeStr })}` : rel;
    return text.charAt(0).toUpperCase() + text.slice(1);
  })();

  const cadenceLabel = cadence === "weekly" ? t("form.weekly")
    : cadence === "biweekly" ? t("form.biweekly")
    : cadence === "monthly" ? t("form.monthly")
    : cadence ?? "";

  const initials = personName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[440px] p-0 flex flex-col [&>button]:hidden">
        {/* Header */}
        <header className="p-8 pb-6 border-b border-[var(--editorial-outline-variant,var(--border))]/10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 ring-2 ring-primary/5">
                <ThemedAvatarImage name={personName} uploadedUrl={personAvatarUrl} role={personLevel} />
                <AvatarFallback className="text-sm font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-headline font-extrabold text-foreground">{personName}</h2>
                {personJobTitle && (
                  <p className="text-sm text-muted-foreground/60 font-medium">{personJobTitle}</p>
                )}
                {lastScore !== null && lastScore !== undefined && (
                  <StarRating score={lastScore} size="sm" />
                )}
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Session + date unified (same style as series card) */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground font-bold">
              {t("agenda.sessionLabel", { number: sessionNumber })}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1.5 text-sm font-medium cursor-default",
                  isOverdue
                    ? "text-destructive"
                    : "text-[var(--color-success,#004c47)]"
                )}>
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{nextDateText}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isOverdue ? t("series.tooltipOverdue") : t("series.tooltipNextSession")}
              </TooltipContent>
            </Tooltip>
          </div>
          {cadenceLabel && (
            <div className="flex items-center gap-1.5 text-muted-foreground/50 text-xs mt-1">
              <Repeat className="h-3 w-3" />
              <span>{cadenceLabel}</span>
            </div>
          )}
        </header>

        {/* Talking points list */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-headline font-bold text-foreground">{t("agenda.talkingPoints")}</h3>
            <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
              {t("agenda.itemCount", { count: totalPoints })}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-3">
              {points.map((point) => (
                <div
                  key={point.id}
                  className={cn(
                    "group flex items-start gap-3 p-4 rounded-2xl border transition-colors relative",
                    point.carriedFromSessionId
                      ? "bg-[var(--editorial-surface-container-low,var(--muted))] border-primary/5 hover:bg-accent"
                      : "bg-card border-[var(--editorial-outline-variant,var(--border))]/5 hover:bg-[var(--editorial-surface-container-low,var(--muted))]"
                  )}
                >
                  {/* Drag handle */}
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                  </div>

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={point.isDiscussed}
                    onChange={() => toggleMutation.mutate({ id: point.id, isDiscussed: !point.isDiscussed })}
                    className="mt-1 w-5 h-5 rounded-md border-[var(--editorial-outline-variant,var(--border))] text-primary focus:ring-primary/20 cursor-pointer"
                  />

                  <div className="flex-1 min-w-0">
                    {point.carriedFromSessionId && (
                      <div className="mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary px-1.5 py-0.5 bg-card rounded shadow-sm border border-primary/5">
                          {t("agenda.carriedForward")}
                        </span>
                      </div>
                    )}
                    <p className={cn(
                      "text-sm font-medium leading-relaxed",
                      point.isDiscussed ? "text-muted-foreground line-through" : "text-foreground"
                    )}>
                      {point.content}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteMutation.mutate(point.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add input */}
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={t("agenda.addPlaceholder")}
                className="w-full pl-12 pr-4 py-4 bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-2xl focus:ring-2 focus:ring-primary/20 focus:bg-card text-sm transition-all placeholder:text-muted-foreground/50 font-medium"
                disabled={createMutation.isPending}
              />
              <PlusCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            </div>
          </form>
        </div>

        {/* Footer: Insights & Actions — only show when we have data */}
        {((openActionItemCount ?? 0) > 0 || lastScore !== null && lastScore !== undefined || aiSnippet) && (
          <footer className="p-8 pt-0 mt-auto">
            <div className="p-5 bg-card rounded-2xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t("agenda.insightsTitle")}
                </h4>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[var(--editorial-surface-container-low,var(--muted))] rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    {t("agenda.actionItems")}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-headline font-bold text-foreground">
                      {openActionItemCount ?? 0}
                    </span>
                    {(overdueActionItemCount ?? 0) > 0 && (
                      <span className="text-[10px] font-medium text-destructive flex items-center gap-0.5">
                        <AlertCircle className="h-3 w-3" />
                        {t("agenda.overdueCount", { count: overdueActionItemCount ?? 0 })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-[var(--editorial-surface-container-low,var(--muted))] rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    {t("agenda.lastScore")}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-headline font-bold text-foreground">
                      {lastScore?.toFixed(1) ?? "—"}
                    </span>
                    {lastScore !== null && lastScore !== undefined && (
                      <span className="text-[10px] font-medium text-[var(--color-success,#004c47)]">/ 5.0</span>
                    )}
                  </div>
                </div>
              </div>

              {aiSnippet && (
                <div className="p-3 bg-[var(--color-success,#004c47)]/5 border-l-2 border-[var(--color-success,#004c47)]/30 rounded-r-xl">
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    &ldquo;{aiSnippet}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </footer>
        )}
      </SheetContent>
    </Sheet>
  );
}
