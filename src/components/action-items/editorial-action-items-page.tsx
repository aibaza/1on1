"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Link2,
  ListChecks,
  Pencil,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/lib/avatar";
import Link from "next/link";
import type { ActionItemRow } from "./action-items-page";

interface EditorialActionItemsPageProps {
  initialItems: ActionItemRow[];
  currentUserId: string;
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

function sortActive(a: ActionItemRow, b: ActionItemRow) {
  const aOverdue = isOverdue(a.dueDate, a.status);
  const bOverdue = isOverdue(b.dueDate, b.status);
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
  if (a.dueDate && b.dueDate)
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function sortCompleted(a: ActionItemRow, b: ActionItemRow) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

interface MyItemsData {
  activeItems: ActionItemRow[];
  completedItems: ActionItemRow[];
  overdueItems: ActionItemRow[];
  nonOverdueActiveItems: ActionItemRow[];
  totalCount: number;
  overdueCount: number;
}

interface ReportGroup {
  seriesId: string;
  reportId: string;
  reportName: string;
  activeItems: ActionItemRow[];
  completedItems: ActionItemRow[];
  overdueCount: number;
}

const inputClass =
  "w-full bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-xl p-4 focus:ring-2 focus:ring-[var(--editorial-primary-container,var(--ring))] text-foreground font-medium outline-none transition-all";

export function EditorialActionItemsPage({
  initialItems,
  currentUserId,
}: EditorialActionItemsPageProps) {
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

  // My items: assigned to current user
  const myItemsData = useMemo<MyItemsData>(() => {
    const mine = items.filter((i) => i.assigneeId === currentUserId);
    const active = mine.filter((i) => i.status !== "completed").sort(sortActive);
    const completed = mine.filter((i) => i.status === "completed").sort(sortCompleted);
    const overdueItems = active.filter((i) => isOverdue(i.dueDate, i.status));
    const nonOverdueActiveItems = active.filter((i) => !isOverdue(i.dueDate, i.status));
    return {
      activeItems: active,
      completedItems: completed,
      overdueItems,
      nonOverdueActiveItems,
      totalCount: mine.length,
      overdueCount: overdueItems.length,
    };
  }, [items, currentUserId]);

  // Report groups: items from series where I'm the manager, not assigned to me
  const reportGroupsData = useMemo<ReportGroup[]>(() => {
    const reportItems = items.filter(
      (i) => i.managerId === currentUserId && i.assigneeId !== currentUserId
    );
    const groupMap = new Map<string, ReportGroup>();
    for (const item of reportItems) {
      let group = groupMap.get(item.seriesId);
      if (!group) {
        group = {
          seriesId: item.seriesId,
          reportId: item.reportId,
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
        if (isOverdue(item.dueDate, item.status)) group.overdueCount++;
      }
    }
    for (const group of groupMap.values()) {
      group.activeItems.sort(sortActive);
      group.completedItems.sort(sortCompleted);
    }
    return Array.from(groupMap.values())
      .filter((g) => g.activeItems.length > 0 || g.completedItems.length > 0)
      .sort((a, b) => {
        const aOverdue = a.overdueCount > 0;
        const bOverdue = b.overdueCount > 0;
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (a.activeItems.length !== b.activeItems.length)
          return b.activeItems.length - a.activeItems.length;
        return a.reportName.localeCompare(b.reportName);
      });
  }, [items, currentUserId]);

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

  const hasAnyItems = myItemsData.totalCount > 0 || reportGroupsData.length > 0;

  if (!hasAnyItems) {
    return (
      <EmptyState
        icon={ListChecks}
        heading={t("empty")}
        description={t("emptyDesc")}
        action={
          <Button asChild variant="outline">
            <Link href="/sessions">{t("goToSessions")}</Link>
          </Button>
        }
      />
    );
  }

  function formatDueDate(dueDate: string | null, itemOverdue: boolean) {
    if (!dueDate) return null;
    if (itemOverdue) {
      const daysOverdue = Math.floor(
        (Date.now() - new Date(dueDate).getTime()) / 86400000
      );
      return t("dueAgo", { count: daysOverdue });
    }
    return format.dateTime(new Date(dueDate), { month: "short", day: "numeric" });
  }

  return (
    <>
      {/* Page Header */}
      <header className="mb-12 flex justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-5xl font-headline font-black text-foreground tracking-tight">
            {t("title")}
          </h2>
          <p className="text-muted-foreground font-medium max-w-lg">
            {t("description")}
          </p>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* My Items: left column */}
        {myItemsData.totalCount > 0 && (
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {/* Section header */}
            <div className="flex items-center">
              <h3 className="font-headline font-extrabold text-2xl">
                {t("sectionMine")}
              </h3>
              {myItemsData.activeItems.length > 0 && (
                <span className="ml-3 px-2.5 py-0.5 bg-[var(--editorial-primary-fixed,hsl(var(--primary)/0.1))] text-primary text-xs rounded-full font-bold">
                  {myItemsData.activeItems.length}
                </span>
              )}
            </div>

            {/* Overdue Highlight Card */}
            {myItemsData.overdueItems.length > 0 && (
              <div className="bg-destructive/[0.08] rounded-xl p-6 border border-destructive/20 space-y-4">
                <div className="flex items-center text-destructive font-bold space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-headline uppercase tracking-wider text-xs">
                    {t("overdueLabel")}
                  </span>
                </div>
                {myItemsData.overdueItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex items-center justify-between p-4 bg-card rounded-xl shadow-sm border-l-4 border-destructive"
                  >
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() =>
                          toggleMutation.mutate({
                            id: item.id,
                            status: "completed",
                          })
                        }
                        className="w-6 h-6 rounded-full border-2 border-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {item.title}
                        </h4>
                        <div className="flex items-center space-x-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Link2 className="h-3.5 w-3.5 mr-1" />
                            {t("sessionBadge", { number: item.sessionNumber })}
                          </span>
                          <span className="text-destructive font-bold">
                            {formatDueDate(item.dueDate, true)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditSheet(item)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:bg-accent rounded-lg transition-all"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Active Items (non-overdue) */}
            {myItemsData.nonOverdueActiveItems.length > 0 && (
              <div className="space-y-3">
                {myItemsData.nonOverdueActiveItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex items-center justify-between p-5 bg-card rounded-xl shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() =>
                          toggleMutation.mutate({
                            id: item.id,
                            status: "completed",
                          })
                        }
                        className="w-6 h-6 rounded-full border-2 border-[var(--editorial-outline-variant,var(--border))] flex items-center justify-center hover:border-primary transition-colors"
                      >
                        <Check className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {item.title}
                        </h4>
                        <div className="flex items-center space-x-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Link2 className="h-3.5 w-3.5 mr-1" />
                            {t("sessionBadge", { number: item.sessionNumber })}
                          </span>
                          {item.dueDate && (
                            <span>
                              {formatDueDate(item.dueDate, false)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditSheet(item)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:bg-accent rounded-lg transition-all"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Completed Section */}
            {myItemsData.completedItems.length > 0 && (
              <details className="group bg-[var(--editorial-surface-container-low,var(--muted))] rounded-xl overflow-hidden transition-all">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-accent">
                  <div className="flex items-center space-x-3">
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                    <span className="font-bold text-muted-foreground text-sm uppercase tracking-widest">
                      {t("completedSection")}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground/60">
                      {t("tasks", { count: myItemsData.completedItems.length })}
                    </span>
                  </div>
                </summary>
                <div className="p-5 pt-0 space-y-3">
                  {myItemsData.completedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center space-x-4 p-4 opacity-50"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleMutation.mutate({
                            id: item.id,
                            status: "open",
                          })
                        }
                        className="shrink-0 hover:opacity-80 transition-opacity"
                      >
                        <CheckCircle2 className="h-5 w-5 text-[var(--editorial-tertiary,var(--color-success))] fill-current" />
                      </button>
                      <span className="line-through text-muted-foreground text-sm">
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* My Reports: right column */}
        {reportGroupsData.length > 0 && (
          <div
            className={cn(
              "col-span-12 lg:col-span-5 space-y-6",
              myItemsData.totalCount === 0 && "lg:col-span-12"
            )}
          >
            <h3 className="font-headline font-extrabold text-2xl">
              {t("sectionTeam")}
            </h3>

            <div className="space-y-6">
              {reportGroupsData.map((group) => (
                <div
                  key={group.seriesId}
                  className="bg-[var(--editorial-surface-container-low,var(--muted))] rounded-xl p-6 space-y-6"
                >
                  {/* Report header with avatar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getAvatarUrl(group.reportName)}
                        alt={group.reportName}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <h4 className="font-bold text-foreground">
                          {group.reportName}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Active items */}
                  {group.activeItems.length > 0 && (
                    <div className="space-y-4">
                      {group.activeItems.map((item) => {
                        const itemOverdue = isOverdue(item.dueDate, item.status);
                        const isAssignee = item.assigneeId === currentUserId;
                        return (
                          <div
                            key={item.id}
                            className="group flex items-center justify-between p-4 bg-card rounded-xl shadow-sm"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  itemOverdue
                                    ? "bg-destructive"
                                    : "bg-[var(--editorial-tertiary,var(--color-success))]"
                                )}
                              />
                              <span className="text-sm font-medium">
                                {item.title}
                              </span>
                            </div>
                            {isAssignee && (
                              <button
                                type="button"
                                onClick={() => openEditSheet(item)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:bg-accent rounded-md"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Empty state */}
                  {group.activeItems.length === 0 &&
                    group.completedItems.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-[var(--editorial-outline-variant,var(--border))] rounded-xl">
                        <ListChecks className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-muted-foreground/60">
                          {t("allCaughtUp")}
                        </p>
                      </div>
                    )}

                  {/* Completed collapsible per report */}
                  {group.completedItems.length > 0 && (
                    <details className="group">
                      <summary className="flex items-center space-x-2 cursor-pointer list-none text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                        <span>
                          {t("completedSection")} ({group.completedItems.length})
                        </span>
                      </summary>
                      <div className="mt-3 space-y-2 pl-6">
                        {group.completedItems.map((item) => (
                          <p
                            key={item.id}
                            className="text-xs line-through text-muted-foreground"
                          >
                            {item.title}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Drawer */}
      <Sheet open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <SheetContent side="right" className="sm:max-w-[420px] p-10 flex flex-col gap-0" showCloseButton={false}>
          {editItem && (
            <>
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-headline font-black text-foreground">
                  {t("edit.title")}
                </h3>
                <button
                  type="button"
                  className="p-2 hover:bg-accent rounded-full transition-colors"
                  onClick={() => setEditItem(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form
                className="space-y-8 flex-1 overflow-y-auto"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEditSubmit();
                }}
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t("edit.titleLabel")}
                  </label>
                  <input
                    className={inputClass}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t("edit.titlePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t("edit.descriptionLabel")}
                  </label>
                  <textarea
                    className={cn(inputClass, "resize-none")}
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder={t("edit.descriptionPlaceholder")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {t("edit.assigneeLabel")}
                    </label>
                    <Select value={editAssigneeId} onValueChange={setEditAssigneeId}>
                      <SelectTrigger className={inputClass}>
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
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {t("edit.dueDateLabel")}
                    </label>
                    <input
                      type="date"
                      className={inputClass}
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Session
                  </label>
                  <div className="bg-primary/5 p-4 rounded-xl flex items-center text-primary font-bold text-sm">
                    <Link2 className="h-4 w-4 mr-2" />
                    {t("sessionBadge", { number: editItem.sessionNumber })}
                  </div>
                </div>
                <div className="pt-10 flex space-x-4">
                  <button
                    type="submit"
                    disabled={!editTitle.trim() || editMutation.isPending}
                    className="flex-1 py-4 bg-gradient-to-br from-primary to-[var(--editorial-primary-container,var(--primary))] text-primary-foreground rounded-xl font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {editMutation.isPending ? t("edit.saving") : t("edit.save")}
                  </button>
                </div>
              </form>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
