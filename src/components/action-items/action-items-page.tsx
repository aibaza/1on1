"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
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
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface SeriesGroup {
  seriesId: string;
  reportName: string;
  items: ActionItemRow[];
  overdueCount: number;
}

export function ActionItemsPage({ initialItems }: ActionItemsPageProps) {
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

  // Group items by series
  const groups = useMemo<SeriesGroup[]>(() => {
    const groupMap = new Map<string, SeriesGroup>();

    for (const item of items) {
      let group = groupMap.get(item.seriesId);
      if (!group) {
        group = {
          seriesId: item.seriesId,
          reportName: `${item.reportFirstName} ${item.reportLastName}`,
          items: [],
          overdueCount: 0,
        };
        groupMap.set(item.seriesId, group);
      }
      group.items.push(item);
      if (isOverdue(item.dueDate, item.status)) {
        group.overdueCount++;
      }
    }

    // Sort items within each group: overdue first, then by dueDate, then createdAt
    for (const group of groupMap.values()) {
      group.items.sort((a, b) => {
        const aOverdue = isOverdue(a.dueDate, a.status);
        const bOverdue = isOverdue(b.dueDate, b.status);
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

        // Then by due date ascending (nulls last)
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;

        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }

    return Array.from(groupMap.values()).sort((a, b) =>
      a.reportName.localeCompare(b.reportName)
    );
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
            actionItems: old.actionItems.filter((item) =>
              item.id === id ? status !== "completed" : true
            ).map((item) =>
              item.id === id ? { ...item, status } : item
            ),
          };
        }
      );
      return { previous };
    },
    onSuccess: (_data, { status }) => {
      toast.success(
        status === "completed" ? "Action item completed" : "Action item reopened"
      );
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["action-items"], context.previous);
      }
      toast.error("Failed to update action item");
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
      toast.success("Action item updated");
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
    },
    onError: () => {
      toast.error("Failed to update action item");
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

  // Collect unique participants from the current edit item's series
  const editParticipants = useMemo(() => {
    if (!editItem) return [];
    const seriesItems = items.filter(
      (i) => i.seriesId === editItem.seriesId
    );
    // Include the report and deduplicate any assignees
    const participantMap = new Map<string, { id: string; name: string }>();
    participantMap.set(editItem.reportId, {
      id: editItem.reportId,
      name: `${editItem.reportFirstName} ${editItem.reportLastName}`,
    });
    participantMap.set(editItem.managerId, {
      id: editItem.managerId,
      name: `${editItem.managerId}`, // fallback
    });
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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ListChecks className="size-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-medium mb-1">No open action items</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Create them during your next session.
        </p>
        <Button asChild variant="outline">
          <Link href="/sessions">Go to Sessions</Link>
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
              <Badge variant="secondary" className="text-[10px] font-normal">
                {group.items.length} open
              </Badge>
              {group.overdueCount > 0 && (
                <Badge
                  variant="destructive"
                  className="text-[10px] font-normal"
                >
                  {group.overdueCount} overdue
                </Badge>
              )}
            </div>

            {/* Item list */}
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const overdue = isOverdue(item.dueDate, item.status);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group flex items-start gap-3 rounded-md border px-4 py-3 transition-colors hover:bg-muted/30",
                      overdue && "border-l-2 border-l-destructive/60 bg-destructive/[0.03]"
                    )}
                  >
                    {/* Toggle button */}
                    <button
                      type="button"
                      onClick={() =>
                        toggleMutation.mutate({
                          id: item.id,
                          status:
                            item.status === "completed" ? "open" : "completed",
                        })
                      }
                      className="mt-0.5 shrink-0"
                    >
                      <CheckCircle2
                        className={cn(
                          "size-5 transition-colors",
                          item.status === "completed"
                            ? "text-green-600 fill-green-100"
                            : "text-muted-foreground/30 hover:text-primary"
                        )}
                      />
                    </button>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        {item.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="size-3" />
                          {item.assigneeFirstName} {item.assigneeLastName}
                        </span>
                        {item.dueDate && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-xs",
                              overdue
                                ? "text-destructive font-medium"
                                : "text-muted-foreground"
                            )}
                          >
                            <CalendarDays className="size-3" />
                            {formatShortDate(item.dueDate)}
                            {overdue && (
                              <AlertCircle className="size-3 ml-0.5" />
                            )}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          Session #{item.sessionNumber}
                        </Badge>
                      </div>
                    </div>

                    {/* Edit button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => openEditSheet(item)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Edit sheet */}
      <Sheet open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Action Item</SheetTitle>
            <SheetDescription>
              Update the details of this action item.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Action item title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Assignee</label>
              <Select value={editAssigneeId} onValueChange={setEditAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
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
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditItem(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSubmit}
                disabled={!editTitle.trim() || editMutation.isPending}
              >
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
