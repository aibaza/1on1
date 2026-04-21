"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Lock,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  FEEDBACK_CLOSE_REASONS,
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
  type FeedbackCloseReason,
  type FeedbackPriority,
  type FeedbackStatus,
} from "@/lib/validations/feedback";

export interface AssigneeOption {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string | null;
}

interface AdminControlsPanelProps {
  reportId: string;
  currentStatus: FeedbackStatus;
  currentPriority: FeedbackPriority | null;
  currentAssignedToUserId: string | null;
  currentTags: string[];
  currentCloseReason: FeedbackCloseReason | null;
  assignees: AssigneeOption[];
}

interface PatchBody {
  status?: FeedbackStatus;
  priority?: FeedbackPriority | null;
  tags?: string[];
  assignedToUserId?: string | null;
  closeReason?: FeedbackCloseReason | null;
}

function initial(name?: string | null, email?: string | null): string {
  const src = name?.trim() || email?.trim() || "?";
  return src.charAt(0).toUpperCase();
}

export function AdminControlsPanel({
  reportId,
  currentStatus,
  currentPriority,
  currentAssignedToUserId,
  currentTags,
  currentCloseReason,
  assignees,
}: AdminControlsPanelProps) {
  const t = useTranslations("feedback.admin.controls");
  const tStatus = useTranslations("feedback.status");
  const tPriority = useTranslations("feedback.priority");
  const tCloseReason = useTranslations("feedback.closeReason");
  const tResolve = useTranslations("feedback.admin.resolve");
  const tClose = useTranslations("feedback.admin.close");
  const personLabel = (a: AssigneeOption): string =>
    a.name?.trim() || a.email || t("unknownPerson");

  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const currentUserEmail = session?.user?.email ?? null;
  const currentUserName = session?.user?.name ?? null;

  const [status, setStatus] = useState<FeedbackStatus>(currentStatus);
  const [priority, setPriority] = useState<FeedbackPriority | null>(
    currentPriority
  );
  const [assignedToUserId, setAssignedToUserId] = useState<string | null>(
    currentAssignedToUserId
  );
  const [tags, setTags] = useState<string[]>(currentTags);
  const [tagInput, setTagInput] = useState("");
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);

  // Resolve / Close dialog state
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [closeReason, setCloseReason] = useState<FeedbackCloseReason>(
    currentCloseReason ?? "invalid"
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-feedback", reportId] });
    queryClient.invalidateQueries({ queryKey: ["admin-feedback-list"] });
  }, [queryClient, reportId]);

  const patchReport = useMutation({
    mutationFn: async (body: PatchBody) => {
      const res = await fetch(`/api/admin/feedback/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("updateFailed"));
      }
      return res.json();
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const postMessage = useMutation({
    mutationFn: async (payload: { body: string; isInternal: boolean }) => {
      const res = await fetch(`/api/admin/feedback/${reportId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("updateFailed"));
      }
      return res.json();
    },
  });

  const handleStatusChange = (next: FeedbackStatus) => {
    setStatus(next);
    patchReport.mutate(
      { status: next },
      {
        onSuccess: () => {
          toast.success(t("statusUpdated", { value: tStatus(next) }));
        },
        onError: () => {
          // revert on failure
          setStatus(currentStatus);
        },
      }
    );
  };

  const handlePriorityChange = (value: string) => {
    const next: FeedbackPriority | null =
      value === "__unassigned__" ? null : (value as FeedbackPriority);
    setPriority(next);
    patchReport.mutate(
      { priority: next },
      {
        onSuccess: () => {
          toast.success(
            next === null
              ? t("priorityCleared")
              : t("prioritySet", { value: tPriority(next) })
          );
        },
        onError: () => {
          setPriority(currentPriority);
        },
      }
    );
  };

  const handleAssign = (nextId: string | null) => {
    setAssignedToUserId(nextId);
    setAssigneePopoverOpen(false);
    patchReport.mutate(
      { assignedToUserId: nextId },
      {
        onSuccess: () => {
          toast.success(
            nextId === null ? t("unassignedToast") : t("assigneeUpdated")
          );
        },
        onError: () => {
          setAssignedToUserId(currentAssignedToUserId);
        },
      }
    );
  };

  const handleAssignToMe = () => {
    if (!currentUserId) return;
    handleAssign(currentUserId);
  };

  const addTag = (raw: string) => {
    const clean = raw.trim().replace(/,$/, "").trim();
    if (!clean) return;
    if (clean.length > 50) {
      toast.error(t("tagTooLong"));
      return;
    }
    if (tags.includes(clean)) {
      setTagInput("");
      return;
    }
    if (tags.length >= 20) {
      toast.error(t("tagMax"));
      return;
    }
    const next = [...tags, clean];
    setTags(next);
    setTagInput("");
    patchReport.mutate(
      { tags: next },
      {
        onError: () => {
          setTags(tags);
        },
      }
    );
  };

  const removeTag = (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    patchReport.mutate(
      { tags: next },
      {
        onError: () => {
          setTags(tags);
        },
      }
    );
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      const last = tags[tags.length - 1];
      removeTag(last);
    }
  };

  const assignee = assignees.find((a) => a.id === assignedToUserId);
  const assigneeOptions = [...assignees];
  // Add current session user if not in list (still allow assignment)
  if (
    currentUserId &&
    !assigneeOptions.some((a) => a.id === currentUserId) &&
    (currentUserEmail || currentUserName)
  ) {
    assigneeOptions.unshift({
      id: currentUserId,
      name: currentUserName,
      email: currentUserEmail,
    });
  }

  const runResolve = async () => {
    const note = resolveNote.trim();
    if (!note) {
      toast.error(tResolve("noteRequired"));
      return;
    }
    try {
      await postMessage.mutateAsync({ body: note, isInternal: false });
      await patchReport.mutateAsync({ status: "resolved" });
      setStatus("resolved");
      setResolveOpen(false);
      setResolveNote("");
      toast.success(tResolve("success"));
    } catch {
      // error already toasted
    }
  };

  const runClose = async () => {
    const note = closeNote.trim();
    try {
      if (note) {
        await postMessage.mutateAsync({ body: note, isInternal: true });
      }
      await patchReport.mutateAsync({
        status: "closed",
        closeReason,
      });
      setStatus("closed");
      setCloseOpen(false);
      setCloseNote("");
      toast.success(tClose("success"));
    } catch {
      // error already toasted
    }
  };

  const busy = patchReport.isPending || postMessage.isPending;

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("status")}
        </Label>
        <Select
          value={status}
          onValueChange={(v) => handleStatusChange(v as FeedbackStatus)}
          disabled={busy}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FEEDBACK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {tStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("priority")}
        </Label>
        <Select
          value={priority ?? "__unassigned__"}
          onValueChange={handlePriorityChange}
          disabled={busy}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unassigned__">{t("unassigned")}</SelectItem>
            {FEEDBACK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {tPriority(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("assignee")}
        </Label>
        <Popover
          open={assigneePopoverOpen}
          onOpenChange={setAssigneePopoverOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between"
              disabled={busy}
            >
              <span className="flex min-w-0 items-center gap-2">
                {assignee ? (
                  <>
                    <Avatar size="sm" className="size-5">
                      {assignee.avatarUrl ? (
                        <AvatarImage
                          src={assignee.avatarUrl}
                          alt={personLabel(assignee)}
                        />
                      ) : null}
                      <AvatarFallback>
                        {initial(assignee.name, assignee.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{personLabel(assignee)}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">{t("unassigned")}</span>
                )}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command>
              <CommandInput placeholder={t("searchAssignee")} />
              <CommandList>
                <CommandEmpty>{t("noMatches")}</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="__unassigned__"
                    onSelect={() => handleAssign(null)}
                  >
                    <div className="flex w-full items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <X className="h-3 w-3" />
                      </span>
                      <span>{t("unassigned")}</span>
                      {assignedToUserId === null && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </div>
                  </CommandItem>
                  {currentUserId && (
                    <CommandItem
                      value="__assign-to-me__"
                      onSelect={handleAssignToMe}
                    >
                      <div className="flex w-full items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        <span>{t("assignToMe")}</span>
                      </div>
                    </CommandItem>
                  )}
                </CommandGroup>
                <CommandGroup heading={t("adminsGroup")}>
                  {assigneeOptions.map((a) => (
                    <CommandItem
                      key={a.id}
                      value={`${a.name ?? ""} ${a.email ?? ""} ${a.id}`}
                      onSelect={() => handleAssign(a.id)}
                    >
                      <div className="flex w-full items-center gap-2">
                        <Avatar size="sm" className="size-5">
                          {a.avatarUrl ? (
                            <AvatarImage
                              src={a.avatarUrl}
                              alt={personLabel(a)}
                            />
                          ) : null}
                          <AvatarFallback>
                            {initial(a.name, a.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm">
                            {personLabel(a)}
                          </span>
                          {a.email && a.email !== personLabel(a) && (
                            <span className="truncate text-xs text-muted-foreground">
                              {a.email}
                            </span>
                          )}
                        </div>
                        {assignedToUserId === a.id && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("tags")}
        </Label>
        <div
          className={cn(
            "flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm",
            busy && "opacity-60"
          )}
        >
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                disabled={busy}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted-foreground/20"
                aria-label={t("removeTag", { tag })}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => tagInput.trim() && addTag(tagInput)}
            placeholder={tags.length === 0 ? t("tagsPlaceholder") : ""}
            disabled={busy}
            className="h-6 min-w-[80px] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">{t("tagsHint")}</p>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="default"
          onClick={() => setResolveOpen(true)}
          disabled={busy || status === "resolved"}
        >
          <Check className="mr-2 h-4 w-4" />
          {t("resolve")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setCloseOpen(true)}
          disabled={busy || status === "closed"}
        >
          <XCircle className="mr-2 h-4 w-4" />
          {t("close")}
        </Button>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tResolve("title")}</DialogTitle>
            <DialogDescription>{tResolve("description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="resolve-note">{tResolve("noteLabel")}</Label>
            <Textarea
              id="resolve-note"
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder={tResolve("notePlaceholder")}
              rows={5}
              maxLength={5000}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setResolveOpen(false)}
              disabled={busy}
            >
              {tResolve("cancel")}
            </Button>
            <Button onClick={runResolve} disabled={busy || !resolveNote.trim()}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {tResolve("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tClose("title")}</DialogTitle>
            <DialogDescription>{tClose("description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="close-reason">{tClose("reasonLabel")}</Label>
              <Select
                value={closeReason}
                onValueChange={(v) =>
                  setCloseReason(v as FeedbackCloseReason)
                }
              >
                <SelectTrigger id="close-reason" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_CLOSE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {tCloseReason(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="close-note"
                className="flex items-center gap-1.5"
              >
                <Lock className="h-3 w-3" /> {tClose("noteLabel")}
              </Label>
              <Textarea
                id="close-note"
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                placeholder={tClose("notePlaceholder")}
                rows={4}
                maxLength={5000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCloseOpen(false)}
              disabled={busy}
            >
              {tClose("cancel")}
            </Button>
            <Button onClick={runClose} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {tClose("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
