"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { Search, X } from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog";

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

interface EditorialMemberPickerProps {
  teamId: string;
  existingMemberIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditorialMemberPicker({
  teamId,
  existingMemberIds,
  open,
  onOpenChange,
  onSuccess,
}: EditorialMemberPickerProps) {
  const t = useTranslations("people.memberPicker");
  const { showApiError } = useApiErrorToast();
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setSearchQuery("");
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

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const q = searchQuery.toLowerCase();
    return availableUsers.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [availableUsers, searchQuery]);

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

      toast.success(t("added", { count: selectedIds.size }));
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
      <DialogContent showCloseButton={false} className="bg-card w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[870px] p-0 gap-0">
        {/* Header */}
        <div className="px-8 py-8 border-b border-[var(--editorial-surface-container,var(--border))]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-headline text-2xl font-bold text-foreground mb-1">
                {t("title")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("description")}
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg py-3.5 pl-12 pr-4 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[var(--editorial-primary-container,var(--ring))] transition-shadow"
            />
          </div>
        </div>

        {/* Scrollable user list */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {t("loading")}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {t("noUsersAvailable")}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => {
                const fullName = `${user.firstName} ${user.lastName}`;
                const isSelected = selectedIds.has(user.id);

                return (
                  <label
                    key={user.id}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-[var(--editorial-surface-container-high,var(--accent))] transition-colors cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUser(user.id)}
                      className="w-5 h-5 rounded border-[var(--editorial-outline-variant,var(--border))] text-primary focus:ring-[var(--editorial-primary-container,var(--ring))]"
                    />
                    <img
                      src={getAvatarUrl(fullName, user.avatarUrl)}
                      alt={fullName}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-[var(--editorial-surface-container-low,var(--muted))] flex justify-between items-center border-t border-[var(--editorial-surface-container,var(--border))]">
          <p className="text-sm font-medium text-muted-foreground">
            <span className="text-primary font-bold">{selectedIds.size}</span>{" "}
            {t("membersSelected")}
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => onOpenChange(false)}
              className="px-6 py-2.5 rounded-lg font-semibold text-muted-foreground hover:bg-accent transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedIds.size === 0 || isAdding}
              className="px-8 py-2.5 rounded-lg font-headline font-bold text-primary-foreground bg-gradient-to-r from-primary to-[var(--editorial-primary-container,var(--primary))] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-primary/40"
            >
              {isAdding ? t("adding") : t("addSelected", { count: selectedIds.size })}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
