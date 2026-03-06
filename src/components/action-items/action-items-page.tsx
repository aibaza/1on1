"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Circle,
  ListChecks,
  Pencil,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface ActionItemRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  category: string | null;
  assigneeId: string;
  assigneeFirstName: string;
  assigneeLastName: string;
  createdAt: string;
  sessionId: string;
  sessionNumber: number;
  seriesId: string;
  reportId: string;
  reportFirstName: string;
  reportLastName: string;
  managerId: string;
}

interface ActionItemsPageProps {
  initialItems: ActionItemRow[];
  currentUserId: string;
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

interface SeriesGroup {
  seriesId: string;
  reportName: string;
  activeItems: ActionItemRow[];
  completedItems: ActionItemRow[];
  overdueCount: number;
}

export function ActionItemsPage({ initialItems, currentUserId }: ActionItemsPageProps) {
  const t = useTranslations("actionItems");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<ActionItemRow | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");

  const { data } = useQuery<{ actionItems: ActionItemRow[] }>({
    queryKey: ["action-items"],
    queryFn: async () => {
      const res = await fetch("/api/action-items");
      if (!res.ok) throw new Error("Failed to fetch action items");
      return res.json();
    },
    initialData: { actionItems: initialItems },
  });

  const items = data?.actionItems ?? [];

  // Group items by series, split active vs completed
  const groups = useMemo<SeriesGroup[]>(() => {
    const groupMap = new Map<string, SeriesGroup>();

    for (const item of items) {
      let group = groupMap.get(item.seriesId);
      if (!group) {
        group = {
          seriesId: item.seriesId,
          reportName: `${item.reportFirstName} ${item.reportLastName}`,
          activeItems: [],
          completedItems: [],
          overdueCount: 0,
        };
        groupMap.set(item.seriesId, group);
      }
      if (item.status === "completed") {
        group.completedItems.push(item);
      } else {
        group.activeItems.push(item);
        if (isOverdue(item.dueDate, item.status)) {
          group.overdueCount++;
        }
      }
    }

    const sortActive = (a: ActionItemRow, b: ActionItemRow) => {
      const aOverdue = isOverdue(a.dueDate, a.status);
      const bOverdue = isOverdue(b.dueDate, b.status);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      if (a.dueDate && b.dueDate)
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    };

    const sortCompleted = (a: ActionItemRow, b: ActionItemRow) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    for (const group of groupMap.values()) {
      group.activeItems.sort(sortActive);
      group.completedItems.sort(sortCompleted);
    }

    // Only return groups that have at least one item
    return Array.from(groupMap.values())
      .filter((g) => g.activeItems.length > 0 || g.completedItems.length > 0)
      .sort((a, b) => a.reportName.localeCompare(b.reportName));
  }, [items]);

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/action-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["action-items"] });
      const previous = queryClient.getQueryData<{ actionItems: ActionItemRow[] }>(["action-items"]);
      queryClient.setQueryData<{ actionItems: ActionItemRow[] }>(
        ["action-items"],
        (old) => {
          if (!old) return old;
          return {
            actionItems: old.actionItems.map((item) =>
              item.id === id ? { ...item, status } : item
            ),
          };
        }
      );
      return { previous };
    },
    onSuccess: (_data, { status }) => {
      toast.success(status === "completed" ? t("completed") : t("reopened"));
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["action-items"], context.previous);
      }
      toast.error(t("updateFailed"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      description?: string | null;
      assigneeId?: string;
      dueDate?: string | null;
    }) => {
      const res = await fetch(`/api/action-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update action item");
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("updated"));
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
    },
    onError: () => {
      toast.error(t("updateFailed"));
    },
  });

  function openEditSheet(item: ActionItemRow) {
    setEditItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description ?? "");
    setEditDueDate(item.dueDate ?? "");
    setEditAssigneeId(item.assigneeId);
  }

  function handleEditSubmit() {
    if (!editItem) return;
    const updates: Record<string, unknown> = {};
    if (editTitle !== editItem.title) updates.title = editTitle;
    if ((editDescription || null) !== editItem.description)
      updates.description = editDescription || null;
    if (editDueDate !== (editItem.dueDate ?? ""))
      updates.dueDate = editDueDate || null;
    if (editAssigneeId !== editItem.assigneeId)
      updates.assigneeId = editAssigneeId;
    if (Object.keys(updates).length === 0) {
      setEditItem(null);
      return;
    }
    editMutation.mutate({ id: editItem.id, ...updates });
  }

  const editParticipants = useMemo(() => {
    if (!editItem) return [];
    const seriesItems = items.filter((i) => i.seriesId === editItem.seriesId);
    const participantMap = new Map<string, { id: string; name: string }>();
    for (const si of seriesItems) {
      participantMap.set(si.assigneeId, {
        id: si.assigneeId,
        name: `${si.assigneeFirstName} ${si.assigneeLastName}`,
      });
      participantMap.set(si.reportId, {
        id: si.reportId,
        name: `${si.reportFirstName} ${si.reportLastName}`,
      });
    }
    return Array.from(participantMap.values());
  }, [editItem, items]);

  const hasAnyItems = groups.length > 0;

  if (!hasAnyItems) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ListChecks className="size-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-medium mb-1">{t("empty")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("emptyDesc")}</p>
        <Button asChild variant="outline">
          <Link href="/sessions">{t("goToSessions")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.seriesId}>
            {/* Group header */}
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold">{group.reportName}</h2>
              {group.activeItems.length > 0 && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {t("open", { count: group.activeItems.length })}
                </Badge>
              )}
              {group.overdueCount > 0 && (
                <Badge variant="destructive" className="text-[10px] font-normal">
                  {t("overdue", { count: group.overdueCount })}
                </Badge>
              )}
            </div>

            {/* Active items */}
            {group.activeItems.length > 0 && (
              <div className="space-y-1.5">
                {group.activeItems.map((item) => (
                  <ActionItemCard
                    key={item.id}
                    item={item}
                    isAssignee={item.assigneeId === currentUserId}
                    overdue={isOverdue(item.dueDate, item.status)}
                    format={format}
                    t={t}
                    onToggle={() =>
                      toggleMutation.mutate({ id: item.id, status: "completed" })
                    }
                    onEdit={() => openEditSheet(item)}
                  />
                ))}
              </div>
            )}

            {/* Completed items */}
            {group.completedItems.length > 0 && (
              <div className="mt-3">
                {group.activeItems.length > 0 && (
                  <div className="flex items-center gap-2 my-3">
                    <Separator className="flex-1" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      {t("completedSection")}
                    </span>
                    <Separator className="flex-1" />
                  </div>
                )}
                <div className="space-y-1.5">
                  {group.completedItems.map((item) => (
                    <ActionItemCard
                      key={item.id}
                      item={item}
                      isAssignee={item.assigneeId === currentUserId}
                      overdue={false}
                      format={format}
                      t={t}
                      onToggle={() =>
                        toggleMutation.mutate({ id: item.id, status: "open" })
                      }
                      onEdit={() => openEditSheet(item)}
                      completed
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit sheet */}
      <Sheet open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("edit.title")}</SheetTitle>
            <SheetDescription>{t("edit.description")}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("edit.titleLabel")}</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={t("edit.titlePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("edit.descriptionLabel")}</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t("edit.descriptionPlaceholder")}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("edit.assigneeLabel")}</label>
              <Select value={editAssigneeId} onValueChange={setEditAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("edit.assigneePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {editParticipants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("edit.dueDateLabel")}</label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditItem(null)}>
                {t("edit.cancel")}
              </Button>
              <Button
                onClick={handleEditSubmit}
                disabled={!editTitle.trim() || editMutation.isPending}
              >
                {editMutation.isPending ? t("edit.saving") : t("edit.save")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// --- ActionItemCard ---

interface ActionItemCardProps {
  item: ActionItemRow;
  isAssignee: boolean;
  overdue: boolean;
  completed?: boolean;
  format: ReturnType<typeof useFormatter>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any, values?: any) => string;
  onToggle: () => void;
  onEdit: () => void;
}

function ActionItemCard({
  item,
  isAssignee,
  overdue,
  completed = false,
  format,
  t,
  onToggle,
  onEdit,
}: ActionItemCardProps) {
  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-md border px-4 py-3 transition-colors",
        completed
          ? "opacity-50 bg-muted/20"
          : "hover:bg-muted/30",
        overdue && "border-l-2 border-l-destructive/60 bg-destructive/[0.03]"
      )}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        disabled={!isAssignee}
        className={cn(
          "mt-0.5 shrink-0",
          !isAssignee && "cursor-not-allowed opacity-40"
        )}
      >
        {completed ? (
          <CheckCircle2 className="size-5 text-green-600 fill-green-100 transition-colors" />
        ) : (
          <Circle
            className={cn(
              "size-5 transition-colors",
              isAssignee
                ? "text-muted-foreground/30 hover:text-primary"
                : "text-muted-foreground/20"
            )}
          />
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium leading-snug", completed && "line-through")}>
          {item.title}
        </p>
        {item.description && (
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
            {item.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <User className="size-3" />
            {item.assigneeFirstName} {item.assigneeLastName}
          </span>
          {item.dueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs",
                overdue ? "text-destructive font-medium" : "text-muted-foreground"
              )}
            >
              <CalendarDays className="size-3" />
              {format.dateTime(new Date(item.dueDate), { month: "short", day: "numeric" })}
              {overdue && <AlertCircle className="size-3 ml-0.5" />}
            </span>
          )}
          <Badge variant="outline" className="text-[10px] font-normal">
            {t("sessionBadge", { number: item.sessionNumber })}
          </Badge>
        </div>
      </div>

      {/* Edit button — only for assignee, only on active items */}
      {isAssignee && !completed && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
