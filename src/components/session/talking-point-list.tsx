"use client";

import { useCallback, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TalkingPoint {
  id: string;
  content: string;
  category: string | null;
  sortOrder: number;
  isDiscussed: boolean;
  discussedAt: string | null;
  authorId: string;
  carriedFromSessionId: string | null;
  createdAt: string;
}

interface TalkingPointListProps {
  sessionId: string;
  category: string;
  initialPoints: TalkingPoint[];
  readOnly?: boolean;
  onSavingChange?: (saving: boolean) => void;
  /** Map from session ID to session number, for "carried from" badges */
  sessionNumberMap?: Map<string, number>;
}

export function TalkingPointList({
  sessionId,
  category,
  initialPoints,
  readOnly,
  onSavingChange,
  sessionNumberMap,
}: TalkingPointListProps) {
  const t = useTranslations("sessions.talkingPoints");
  const queryClient = useQueryClient();
  const [points, setPoints] = useState<TalkingPoint[]>(initialPoints);
  const [newContent, setNewContent] = useState("");

  // Sync local state when parent refetches new data
  useEffect(() => {
    setPoints(initialPoints);
  }, [initialPoints]);

  // Create talking point
  const createPoint = useMutation({
    mutationFn: async (content: string) => {
      const sortOrder = points.length;
      const res = await fetch(`/api/sessions/${sessionId}/talking-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, category, sortOrder }),
      });
      if (!res.ok) throw new Error("Failed to create talking point");
      return res.json();
    },
    onMutate: (content) => {
      onSavingChange?.(true);
      // Optimistic insert
      const optimistic: TalkingPoint = {
        id: `temp-${Date.now()}`,
        content,
        category,
        sortOrder: points.length,
        isDiscussed: false,
        discussedAt: null,
        authorId: "",
        carriedFromSessionId: null,
        createdAt: new Date().toISOString(),
      };
      setPoints((prev) => [...prev, optimistic]);
      return { optimistic };
    },
    onSuccess: (data, _content, context) => {
      // Replace optimistic with real data
      setPoints((prev) =>
        prev.map((p) =>
          p.id === context?.optimistic.id ? data : p
        )
      );
      queryClient.invalidateQueries({ queryKey: ["talking-points", sessionId] });
      onSavingChange?.(false);
    },
    onError: (_err, _content, context) => {
      // Remove optimistic on error
      if (context?.optimistic) {
        setPoints((prev) =>
          prev.filter((p) => p.id !== context.optimistic.id)
        );
      }
      onSavingChange?.(false);
    },
  });

  // Toggle discussed
  const togglePoint = useMutation({
    mutationFn: async ({
      id,
      isDiscussed,
    }: {
      id: string;
      isDiscussed: boolean;
    }) => {
      const res = await fetch(`/api/sessions/${sessionId}/talking-points`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDiscussed }),
      });
      if (!res.ok) throw new Error("Failed to toggle talking point");
      return res.json();
    },
    onMutate: ({ id, isDiscussed }) => {
      onSavingChange?.(true);
      // Optimistic toggle
      setPoints((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, isDiscussed, discussedAt: isDiscussed ? new Date().toISOString() : null }
            : p
        )
      );
    },
    onSettled: () => onSavingChange?.(false),
  });

  // Delete talking point
  const deletePoint = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sessions/${sessionId}/talking-points`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete talking point");
      return res.json();
    },
    onMutate: (id) => {
      onSavingChange?.(true);
      // Optimistic remove
      setPoints((prev) => prev.filter((p) => p.id !== id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talking-points", sessionId] });
    },
    onSettled: () => onSavingChange?.(false),
  });

  const handleAdd = useCallback(() => {
    const content = newContent.trim();
    if (!content) return;
    createPoint.mutate(content);
    setNewContent("");
  }, [newContent, createPoint]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <div className="space-y-2">
      {/* List */}
      {points.length > 0 && (
        <ul className="space-y-1">
          {points.map((point) => {
            const carriedSessionNumber = point.carriedFromSessionId
              ? sessionNumberMap?.get(point.carriedFromSessionId)
              : undefined;

            return (
              <li
                key={point.id}
                className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
              >
                <button
                  type="button"
                  onClick={() =>
                    !readOnly &&
                    togglePoint.mutate({
                      id: point.id,
                      isDiscussed: !point.isDiscussed,
                    })
                  }
                  disabled={readOnly}
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    point.isDiscussed
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 hover:border-primary"
                  )}
                >
                  {point.isDiscussed && <Check className="size-3" />}
                </button>

                <span
                  className={cn(
                    "flex-1 text-sm leading-snug",
                    point.isDiscussed && "text-muted-foreground line-through"
                  )}
                >
                  {point.content}
                </span>

                {carriedSessionNumber && (
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px] font-normal"
                  >
                    {t("fromSession", { number: carriedSessionNumber })}
                  </Badge>
                )}

                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deletePoint.mutate(point.id)}
                  >
                    <Trash2 className="size-3 text-muted-foreground" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Add input */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("addPlaceholder")}
            className="h-9 text-sm bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg focus-visible:ring-1 focus-visible:ring-[var(--editorial-primary-container,var(--ring))]"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={handleAdd}
            disabled={!newContent.trim()}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
