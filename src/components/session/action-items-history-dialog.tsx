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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SeriesActionItem {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  category: string | null;
  assigneeId: string;
  assignee: { firstName: string; lastName: string } | null;
  sessionNumber: number;
  sessionDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface ActionItemsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionItems: SeriesActionItem[];
  managerId: string;
  reportId: string;
  managerName: string;
  reportName: string;
  currentUserId?: string;
  onToggleActionItem?: (actionItemId: string, currentStatus: string) => void;
}

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

function PersonSection({
  name,
  items,
  defaultOpen,
  currentUserId,
  onToggleActionItem,
}: {
  name: string;
  items: SeriesActionItem[];
  defaultOpen: boolean;
  currentUserId?: string;
  onToggleActionItem?: (actionItemId: string, currentStatus: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const t = useTranslations("sessions");
  const format = useFormatter();

  const openCount = items.filter(
    (i) => i.status === "open" || i.status === "in_progress"
  ).length;
  const completedCount = items.filter((i) => i.status === "completed").length;

  // Group by session number (newest first)
  const grouped = useMemo(() => {
    const groups = new Map<number, SeriesActionItem[]>();
    for (const item of items) {
      if (!groups.has(item.sessionNumber)) {
        groups.set(item.sessionNumber, []);
      }
      groups.get(item.sessionNumber)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => b - a);
  }, [items]);

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
          {grouped.map(([sessionNum, sessionItems]) => (
            <div key={sessionNum}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 ml-1">
                {t("context.fromSession", { number: sessionNum })}
              </p>
              <ul className="space-y-1">
                {sessionItems.map((item) => {
                  const overdue = isOverdue(item.dueDate, item.status);
                  const isDone =
                    item.status === "completed" || item.status === "cancelled";
                  const canToggle =
                    !!onToggleActionItem &&
                    !!currentUserId &&
                    item.assigneeId === currentUserId;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "flex items-start gap-2 rounded-xl border px-3 py-2 text-xs transition-colors",
                        isDone
                          ? "border-border/30 bg-muted/30 opacity-60"
                          : "border-border/50",
                        overdue && !isDone && "border-l-2 border-l-destructive/60"
                      )}
                    >
                      {canToggle ? (
                        <button
                          type="button"
                          onClick={() => onToggleActionItem(item.id, item.status)}
                          className="shrink-0 cursor-pointer hover:scale-110 transition-transform"
                        >
                          <StatusIcon status={item.status} />
                        </button>
                      ) : (
                        <StatusIcon status={item.status} />
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
                          {item.dueDate && (
                            <span>
                              {t("context.due", {
                                date: format.dateTime(
                                  new Date(item.dueDate),
                                  { month: "short", day: "numeric" }
                                ),
                              })}
                            </span>
                          )}
                          {overdue && (
                            <span className="ml-1 text-destructive font-medium">
                              &middot; {t("context.overdue")}
                            </span>
                          )}
                          {item.completedAt && (
                            <span>
                              {item.dueDate ? " · " : ""}
                              {t("historyDialog.completedOn", {
                                date: format.dateTime(
                                  new Date(item.completedAt),
                                  { month: "short", day: "numeric" }
                                ),
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActionItemsHistoryDialog({
  open,
  onOpenChange,
  actionItems,
  managerId,
  reportId,
  managerName,
  reportName,
  currentUserId,
  onToggleActionItem,
}: ActionItemsHistoryDialogProps) {
  const t = useTranslations("sessions");

  // Split by assignee: report items vs manager items
  const reportItems = useMemo(
    () => actionItems.filter((ai) => ai.assigneeId === reportId),
    [actionItems, reportId]
  );
  const managerItems = useMemo(
    () => actionItems.filter((ai) => ai.assigneeId === managerId),
    [actionItems, managerId]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {t("historyDialog.allActionItems")}
          </DialogTitle>
          <DialogDescription>
            {t("historyDialog.actionItemsDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y">
          {reportItems.length > 0 && (
            <PersonSection
              name={reportName}
              items={reportItems}
              defaultOpen
              currentUserId={currentUserId}
              onToggleActionItem={onToggleActionItem}
            />
          )}
          {managerItems.length > 0 && (
            <PersonSection
              name={managerName}
              items={managerItems}
              defaultOpen={reportItems.length === 0}
              currentUserId={currentUserId}
              onToggleActionItem={onToggleActionItem}
            />
          )}
          {reportItems.length === 0 && managerItems.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground italic">
              {t("context.noActionItems")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
