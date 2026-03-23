"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

interface MemberPickerProps {
  teamId: string;
  existingMemberIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MemberPicker({
  teamId,
  existingMemberIds,
  open,
  onOpenChange,
  onSuccess,
}: MemberPickerProps) {
  const t = useTranslations("people");
  const { showApiError } = useApiErrorToast();
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setIsLoading(true);
      fetch("/api/users")
        .then((res) => res.json())
        .then(
          (
            data: Array<{
              id: string;
              firstName: string;
              lastName: string;
              email: string;
              avatarUrl: string | null;
              isActive: boolean;
              status: string;
            }>
          ) => {
            // Filter out existing members and inactive users
            const existing = new Set(existingMemberIds);
            const filtered = data.filter(
              (u) => !existing.has(u.id) && u.isActive && u.status !== "pending"
            );
            setAvailableUsers(
              filtered.map((u) => ({
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                avatarUrl: u.avatarUrl,
              }))
            );
          }
        )
        .catch(() => {
          showApiError(new Error("Failed to load users"));
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, existingMemberIds]);

  function toggleUser(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  async function handleAdd() {
    if (selectedIds.size === 0) return;
    setIsAdding(true);

    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to add members");
      }

      toast.success(t("memberPicker.added", { count: selectedIds.size }));
      setSelectedIds(new Set());
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      showApiError(error);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("memberPicker.title")}</DialogTitle>
          <DialogDescription>
            {t("memberPicker.description")}
          </DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border">
          <CommandInput placeholder={t("memberPicker.searchPlaceholder")} />
          <CommandList className="max-h-[300px]">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("memberPicker.loading")}
              </div>
            ) : (
              <>
                <CommandEmpty>{t("memberPicker.noUsersAvailable")}</CommandEmpty>
                <CommandGroup>
                  {availableUsers.map((user) => {
                    const isSelected = selectedIds.has(user.id);
                    const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

                    return (
                      <CommandItem
                        key={user.id}
                        value={`${user.firstName} ${user.lastName} ${user.email}`}
                        onSelect={() => toggleUser(user.id)}
                        className="cursor-pointer"
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground opacity-50"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <Avatar className="mr-2 h-6 w-6">
                          <AvatarImage
                            src={getAvatarUrl(`${user.firstName} ${user.lastName}`, user.avatarUrl)}
                            alt={`${user.firstName} ${user.lastName}`}
                          />
                          <AvatarFallback className="text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {user.firstName} {user.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("memberPicker.cancel")}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedIds.size === 0 || isAdding}
          >
            {isAdding
              ? t("memberPicker.adding")
              : t("memberPicker.addSelected", { count: selectedIds.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
