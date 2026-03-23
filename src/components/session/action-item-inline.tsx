"use client";

import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations, useFormatter } from "next-intl";
import {
  CalendarDays,
  CheckCircle2,
  Plus,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ActionItemData {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  assigneeId: string;
  assignee: { firstName: string; lastName: string } | null;
  createdById: string;
  dueDate: string | null;
  status: string;
  completedAt: string | null;
  createdAt: string;
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
}

interface ActionItemInlineProps {
  sessionId: string;
  category: string;
  seriesParticipants: Participant[];
  initialItems: ActionItemData[];
  readOnly?: boolean;
  onSavingChange?: (saving: boolean) => void;
}

export function ActionItemInline({
  sessionId,
  category,
  seriesParticipants,
  initialItems,
  readOnly,
  onSavingChange,
}: ActionItemInlineProps) {
  const t = useTranslations("sessions.actionItemsInline");
  const format = useFormatter();
  const [items, setItems] = useState<ActionItemData[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formAssignee, setFormAssignee] = useState(
    seriesParticipants[0]?.id ?? ""
  );
  const [formDueDate, setFormDueDate] = useState("");

  // Create action item
  const createItem = useMutation({
    mutationFn: async (data: {
      title: string;
      assigneeId: string;
      dueDate?: string;
    }) => {
      const res = await fetch(`/api/sessions/${sessionId}/action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, category }),
      });
      if (!res.ok) throw new Error("Failed to create action item");
      return res.json();
    },
    onMutate: (data) => {
      onSavingChange?.(true);
      // Optimistic insert
      const assignee = seriesParticipants.find((p) => p.id === data.assigneeId);
      const optimistic: ActionItemData = {
        id: `temp-${Date.now()}`,
        title: data.title,
        description: null,
        category,
        assigneeId: data.assigneeId,
        assignee: assignee
          ? { firstName: assignee.firstName, lastName: assignee.lastName }
          : null,
        createdById: "",
        dueDate: data.dueDate ?? null,
        status: "open",
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      setItems((prev) => [...prev, optimistic]);
      return { optimistic };
    },
    onSuccess: (data, _vars, context) => {
      // Replace optimistic with real data
      setItems((prev) =>
        prev.map((i) =>
          i.id === context?.optimistic.id ? data : i
        )
      );
      onSavingChange?.(false);
    },
    onError: (_err, _vars, context) => {
      if (context?.optimistic) {
        setItems((prev) =>
          prev.filter((i) => i.id !== context.optimistic.id)
        );
      }
      onSavingChange?.(false);
    },
  });

  // Toggle action item status
  const toggleStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => {
      const res = await fetch(`/api/sessions/${sessionId}/action-items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed to update action item");
      return res.json();
    },
    onMutate: ({ id, status }) => {
      onSavingChange?.(true);
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status } : i
        )
      );
    },
    onSettled: () => onSavingChange?.(false),
  });

  const handleSubmit = useCallback(() => {
    const title = formTitle.trim();
    if (!title || !formAssignee) return;

    createItem.mutate({
      title,
      assigneeId: formAssignee,
      dueDate: formDueDate || undefined,
    });

    // Reset form
    setFormTitle("");
    setFormDueDate("");
    setShowForm(false);
  }, [formTitle, formAssignee, formDueDate, createItem]);

  return (
    <div className="space-y-2">
      {/* Existing items */}
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-start gap-2 rounded-md border px-3 py-2"
            >
              <button
                type="button"
                onClick={() =>
                  !readOnly &&
                  toggleStatus.mutate({
                    id: item.id,
                    status:
                      item.status === "completed" ? "open" : "completed",
                  })
                }
                disabled={readOnly}
                className="mt-0.5 shrink-0"
              >
                <CheckCircle2
                  className={cn(
                    "size-4 transition-colors",
                    item.status === "completed"
                      ? "text-green-600 fill-green-100"
                      : "text-muted-foreground/40 hover:text-primary"
                  )}
                />
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium leading-snug",
                    item.status === "completed" &&
                      "text-muted-foreground line-through"
                  )}
                >
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.assignee && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="size-2.5" />
                      {item.assignee.firstName} {item.assignee.lastName}
                    </span>
                  )}
                  {item.dueDate && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="size-2.5" />
                      {format.dateTime(new Date(item.dueDate), {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>

              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[10px]",
                  item.status === "completed" && "bg-green-50 text-green-700 border-green-200"
                )}
              >
                {item.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {/* Add action item */}
      {!readOnly && (
        <>
          {showForm ? (
            <div className="space-y-2 rounded-xl bg-[var(--editorial-surface-container-low,var(--muted))]/50 p-3">
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                className="h-9 text-sm bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg focus-visible:ring-1 focus-visible:ring-[var(--editorial-primary-container,var(--ring))]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                  if (e.key === "Escape") {
                    setShowForm(false);
                    setFormTitle("");
                  }
                }}
              />

              <div className="flex items-center gap-2">
                <Select value={formAssignee} onValueChange={setFormAssignee}>
                  <SelectTrigger className="h-9 flex-1 text-xs bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg">
                    <SelectValue placeholder={t("assignTo")} />
                  </SelectTrigger>
                  <SelectContent>
                    {seriesParticipants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="h-9 w-[140px] text-xs bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg focus-visible:ring-1 focus-visible:ring-[var(--editorial-primary-container,var(--ring))]"
                  placeholder={t("dueDate")}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowForm(false);
                    setFormTitle("");
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSubmit}
                  disabled={!formTitle.trim() || !formAssignee}
                >
                  {t("add")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-start gap-1.5 text-xs text-muted-foreground"
              onClick={() => setShowForm(true)}
            >
              <Plus className="size-3.5" />
              {t("addActionItem")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
