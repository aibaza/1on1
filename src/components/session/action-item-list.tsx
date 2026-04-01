"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Shared types ---

export interface ActionItemEntry {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  category: string | null;
  assigneeId: string;
  assignee?: { firstName: string; lastName: string } | null;
  sessionNumber?: number;
  completedAt?: string | null;
  createdAt?: string;
}

// --- Helpers ---

const STATUS_ICON: Record<string, typeof Circle> = {
  open: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
};

function StatusIcon({ status }: { status: string }) {
  const Icon = STATUS_ICON[status] ?? Circle;
  return (
    <Icon
      className={cn(
        "size-4 shrink-0",
        status === "completed" && "text-green-600",
        status === "cancelled" && "text-muted-foreground",
        status === "in_progress" && "text-blue-500",
        status === "open" && "text-muted-foreground/60"
      )}
    />
  );
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "completed" || status === "cancelled") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

// --- Single action item row ---

export function ActionItemRow({
  item,
  currentUserId,
  onToggle,
  compact,
}: {
  item: ActionItemEntry;
  currentUserId?: string;
  onToggle?: (id: string, currentStatus: string) => void;
  compact?: boolean;
}) {
  const t = useTranslations("sessions");
  const format = useFormatter();

  const overdue = isOverdue(item.dueDate, item.status);
  const isDone = item.status === "completed" || item.status === "cancelled";
  const canToggle = !!onToggle && !!currentUserId && item.assigneeId === currentUserId;

  const assigneeName = item.assignee
    ? `${item.assignee.firstName} ${item.assignee.lastName}`
    : null;

  return (
    <li
      className={cn(
        "flex items-start gap-2 rounded-xl border text-xs transition-colors",
        compact ? "px-2 py-1.5" : "px-3 py-2",
        isDone
          ? "border-border/30 bg-muted/30 opacity-60"
          : "border-border/50",
        overdue && !isDone && "border-l-2 border-l-destructive/60"
      )}
    >
      {canToggle ? (
        <button
          type="button"
          onClick={() => onToggle(item.id, item.status)}
          className="shrink-0 mt-0.5 cursor-pointer hover:scale-110 transition-transform"
        >
          <StatusIcon status={item.status} />
        </button>
      ) : (
        <span className="shrink-0 mt-0.5">
          <StatusIcon status={item.status} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-medium leading-tight",
            isDone && "line-through"
          )}
        >
          {item.title}
        </p>
        <p className="text-muted-foreground mt-0.5">
          {assigneeName && <span>{assigneeName}</span>}
          {item.dueDate && (
            <span className={assigneeName ? "ml-1" : ""}>
              {assigneeName ? "· " : ""}
              {t("context.due", {
                date: format.dateTime(new Date(item.dueDate), {
                  month: "short",
                  day: "numeric",
                }),
              })}
            </span>
          )}
          {overdue && !isDone && (
            <span className="ml-1 text-destructive font-medium">
              · {t("context.overdue")}
            </span>
          )}
          {item.completedAt && (
            <span>
              {(assigneeName || item.dueDate) ? " · " : ""}
              {t("historyDialog.completedOn", {
                date: format.dateTime(new Date(item.completedAt), {
                  month: "short",
                  day: "numeric",
                }),
              })}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

// --- Grouped by person with collapsible header ---

export function ActionItemPersonGroup({
  name,
  items,
  defaultOpen,
  currentUserId,
  onToggle,
  compact,
  showSessionGroups,
}: {
  name: string;
  items: ActionItemEntry[];
  defaultOpen?: boolean;
  currentUserId?: string;
  onToggle?: (id: string, currentStatus: string) => void;
  compact?: boolean;
  showSessionGroups?: boolean;
}) {
  const t = useTranslations("sessions");

  const openCount = items.filter(
    (i) => i.status === "open" || i.status === "in_progress"
  ).length;
  const completedCount = items.filter((i) => i.status === "completed").length;

  // Auto-open if there are uncompleted items
  const shouldOpen = defaultOpen ?? openCount > 0;
  const [isOpen, setIsOpen] = useState(shouldOpen);

  // Group by session number (newest first)
  const grouped = useMemo(() => {
    if (!showSessionGroups) return null;
    const groups = new Map<number, ActionItemEntry[]>();
    for (const item of items) {
      const sn = item.sessionNumber ?? 0;
      if (!groups.has(sn)) groups.set(sn, []);
      groups.get(sn)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => b - a);
  }, [items, showSessionGroups]);

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-2 py-2 text-sm font-semibold font-headline hover:text-primary transition-colors cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 text-left">{name}</span>
        <div className="flex items-center gap-1.5">
          {openCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {openCount} {t("historyDialog.open")}
            </Badge>
          )}
          {completedCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[10px] text-muted-foreground"
            >
              {completedCount} {t("historyDialog.done")}
            </Badge>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="ml-2 space-y-3 pb-4">
          {grouped ? (
            grouped.map(([sessionNum, sessionItems]) => (
              <div key={sessionNum}>
                {sessionNum > 0 && (
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 ml-1">
                    {t("context.fromSession", { number: sessionNum })}
                  </p>
                )}
                <ul className="space-y-1">
                  {sessionItems.map((item) => (
                    <ActionItemRow
                      key={item.id}
                      item={item}
                      currentUserId={currentUserId}
                      onToggle={onToggle}
                      compact={compact}
                    />
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <ul className="space-y-1">
              {items.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  currentUserId={currentUserId}
                  onToggle={onToggle}
                  compact={compact}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
