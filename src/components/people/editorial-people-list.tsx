"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, Shield, UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { UserActionsMenu } from "./user-actions-menu";
import { ProfileSheet } from "./profile-sheet";
import type { UserRow } from "./people-table-columns";

interface EditorialPeopleListProps {
  initialData: UserRow[];
  currentUserLevel: string;
  currentUserId: string;
  availableTeams: { id: string; name: string }[];
}

function getInitials(first: string, last: string): string {
  if (!first && !last) return "?";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

type FilterLevel = "all" | "admin" | "manager" | "member";
type FilterStatus = "all" | "active" | "pending" | "deactivated";

const PAGE_SIZE = 20;

export function EditorialPeopleList({
  initialData,
  currentUserLevel,
  currentUserId,
  availableTeams,
}: EditorialPeopleListProps) {
  const t = useTranslations("people");
  const format = useFormatter();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<FilterLevel>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRolePicker, setBulkRolePicker] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const queryClient = useQueryClient();

  const { data: users } = useQuery<UserRow[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    initialData,
  });

  const isAdmin = currentUserLevel === "admin";

  const bulkLevelMutation = useMutation({
    mutationFn: async (newLevel: string) => {
      const ids = [...selectedIds];
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/users/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level: newLevel }),
          }).then((res) => {
            if (!res.ok) throw new Error(`Failed for user ${id}`);
            return res.json();
          })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelectedIds(new Set());
      setBulkRolePicker(false);
      if (failed === 0) {
        toast.success(`Level updated for ${succeeded} member${succeeded !== 1 ? "s" : ""}`);
      } else {
        toast.warning(`${succeeded} updated, ${failed} failed`);
      }
    },
    onError: () => {
      toast.error("Failed to update levels");
    },
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: async () => {
      const ids = [...selectedIds].filter((id) => id !== currentUserId);
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/users/${id}`, { method: "DELETE" }).then((res) => {
            if (!res.ok) throw new Error(`Failed for user ${id}`);
            return res.json();
          })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelectedIds(new Set());
      setConfirmDeactivate(false);
      if (failed === 0) {
        toast.success(`${succeeded} member${succeeded !== 1 ? "s" : ""} deactivated`);
      } else {
        toast.warning(`${succeeded} deactivated, ${failed} failed`);
      }
    },
    onError: () => {
      toast.error("Failed to deactivate members");
    },
  });

  const filtered = useMemo(() => {
    return (users ?? []).filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.jobTitle?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      if (levelFilter !== "all" && u.level !== levelFilter) return false;
      if (teamFilter !== "all" && u.teamName !== teamFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, levelFilter, teamFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selectedUser = useMemo(
    () => (users ?? []).find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const allOnPageSelected = pageData.length > 0 && pageData.every((u) => selectedIds.has(u.id));

  function toggleAll() {
    if (allOnPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageData.map((u) => u.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-8">
      {/* Filter & Search Section */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/50">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Search */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("table.searchPlaceholder")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-12 pr-4 py-3 bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg focus:ring-2 focus:ring-primary/40 focus:outline-none text-sm transition-all placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Role pills */}
          <div className="lg:col-span-5 flex items-center gap-2 overflow-x-auto py-1">
            {(["all", "admin", "manager", "member"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => { setLevelFilter(lvl); setPage(0); }}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  levelFilter === lvl
                    ? "bg-primary text-white"
                    : "bg-[var(--editorial-surface-container,var(--muted))] text-muted-foreground hover:bg-[var(--editorial-surface-container-high,var(--accent))]"
                }`}
              >
                {lvl === "all" ? t("table.allRoles") : t(`table.${lvl}`)}
              </button>
            ))}
          </div>

          {/* Filter & Sort */}
          <div className="lg:col-span-3 flex items-center justify-end gap-2">
            {availableTeams.length > 0 && (
              <select
                value={teamFilter}
                onChange={(e) => { setTeamFilter(e.target.value); setPage(0); }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-[var(--editorial-surface-container,var(--muted))] rounded-lg border-none bg-transparent focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
              >
                <option value="all">{t("table.allTeams")}</option>
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            )}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as FilterStatus); setPage(0); }}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-[var(--editorial-surface-container,var(--muted))] rounded-lg border-none bg-transparent focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
            >
              <option value="all">{t("table.allStatus")}</option>
              <option value="active">{t("table.active")}</option>
              <option value="pending">{t("table.pending")}</option>
              <option value="deactivated">{t("table.deactivated")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* People Table */}
      <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/50">
        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="bg-[var(--editorial-primary-fixed,var(--accent))] text-foreground px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold">{selectedIds.size === 1 ? t("editorial.membersSelected", { count: selectedIds.size }) : t("editorial.membersSelectedPlural", { count: selectedIds.size })}</span>
              <div className="h-4 w-px bg-foreground/20" />

              {/* Change role — inline picker */}
              <div className="relative">
                <button
                  className="text-xs font-bold flex items-center gap-1 hover:underline"
                  type="button"
                  onClick={() => { setBulkRolePicker((v) => !v); setConfirmDeactivate(false); }}
                >
                  <Shield className="h-3.5 w-3.5" /> {t("editorial.changeRole")}
                </button>
                {bulkRolePicker && (
                  <div className="absolute top-full left-0 mt-2 bg-card rounded-xl shadow-xl border border-[var(--editorial-outline-variant,var(--border))]/50 p-2 z-10 min-w-[140px]">
                    {(["admin", "manager", "member"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        disabled={bulkLevelMutation.isPending}
                        onClick={() => bulkLevelMutation.mutate(lvl)}
                        className="w-full text-left px-3 py-2 text-xs font-bold capitalize rounded-lg hover:bg-[var(--editorial-surface-container,var(--muted))] transition-colors disabled:opacity-50"
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Deactivate — with confirmation */}
              <div className="relative">
                <button
                  className="text-xs font-bold flex items-center gap-1 hover:underline text-destructive"
                  type="button"
                  onClick={() => { setConfirmDeactivate((v) => !v); setBulkRolePicker(false); }}
                >
                  <UserX className="h-3.5 w-3.5" /> {t("actions.deactivate")}
                </button>
                {confirmDeactivate && (
                  <div className="absolute top-full left-0 mt-2 bg-card rounded-xl shadow-xl border border-destructive/20 p-4 z-10 min-w-[220px]">
                    <p className="text-xs text-muted-foreground mb-3">
                      Deactivate {selectedIds.size} member{selectedIds.size !== 1 ? "s" : ""}? This will revoke their access.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeactivate(false)}
                        className="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--editorial-surface-container,var(--muted))] hover:bg-[var(--editorial-surface-container-high,var(--accent))] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={bulkDeactivateMutation.isPending}
                        onClick={() => bulkDeactivateMutation.mutate()}
                        className="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-destructive text-white hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {bulkDeactivateMutation.isPending ? "..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedIds(new Set()); setBulkRolePicker(false); setConfirmDeactivate(false); }}
              className="text-xs font-bold hover:underline"
            >
              {t("editorial.clearSelection")}
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--editorial-surface-container-low,var(--muted))]/50">
                {isAdmin && (
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      className="rounded border-[var(--editorial-outline-variant,var(--border))] text-primary focus:ring-primary w-4 h-4"
                    />
                  </th>
                )}
                <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("table.name")}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("table.role")}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest hidden lg:table-cell">{t("table.teams")}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest hidden lg:table-cell">{t("table.manager")}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest hidden md:table-cell">{t("table.status")}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest hidden xl:table-cell">{t("editorial.joined")}</th>
                <th className="px-6 py-4 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--editorial-surface-container,var(--border))]/50">
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-6 py-16 text-center text-muted-foreground">
                    {t("table.noUsers")}
                  </td>
                </tr>
              ) : (
                pageData.map((user) => {
                  const isDeactivated = user.status === "deactivated";
                  const isChecked = selectedIds.has(user.id);
                  return (
                    <tr
                      key={user.id}
                      className={`group transition-all cursor-pointer ${
                        isDeactivated
                          ? "opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                          : "hover:bg-[var(--editorial-surface-container-low,var(--muted))]"
                      }`}
                      onClick={() => setSelectedUserId(user.id)}
                      data-deactivated={isDeactivated || undefined}
                    >
                      {isAdmin && (
                        <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOne(user.id)}
                            className="rounded border-[var(--editorial-outline-variant,var(--border))] text-primary focus:ring-primary w-4 h-4"
                          />
                        </td>
                      )}
                      {/* Member */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={getAvatarUrl(`${user.firstName} ${user.lastName}`, user.avatarUrl, null, user.level)} alt={`${user.firstName} ${user.lastName}`} />
                            <AvatarFallback className="text-xs font-bold">
                              {getInitials(user.firstName, user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Role */}
                      <td className="px-6 py-5">
                        <LevelPill level={user.level} />
                      </td>
                      {/* Team */}
                      <td className="px-6 py-5 hidden lg:table-cell">
                        <span className="text-sm font-medium text-muted-foreground">
                          {user.teamName ?? "—"}
                        </span>
                      </td>
                      {/* Reports to */}
                      <td className="px-6 py-5 hidden lg:table-cell">
                        {user.managerName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-[var(--editorial-primary-container,var(--primary))] text-[8px] flex items-center justify-center text-white font-bold">
                              {user.managerName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <span className="text-xs text-foreground font-medium">{user.managerName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-6 py-5 hidden md:table-cell">
                        <StatusIndicator status={user.status} label={user.status === "active" ? t("table.active") : user.status === "pending" ? t("editorial.invited") : t("table.deactivated")} />
                      </td>
                      {/* Joined */}
                      <td className="px-6 py-5 hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground font-medium">
                          {user.createdAt
                            ? format.relativeTime(new Date(user.createdAt))
                            : "—"}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <UserActionsMenu
                            user={user}
                            currentUserLevel={currentUserLevel}
                            currentUserId={currentUserId}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="px-6 py-4 flex items-center justify-between bg-[var(--editorial-surface-container-low,var(--muted))]/30">
            <p className="text-xs text-muted-foreground font-medium">
              {t("editorial.showingMembers", { from: page * PAGE_SIZE + 1, to: Math.min((page + 1) * PAGE_SIZE, filtered.length), total: filtered.length })}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded-lg hover:bg-[var(--editorial-surface-container,var(--muted))] text-muted-foreground disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    page === i
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-[var(--editorial-surface-container,var(--muted))]"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="p-1 rounded-lg hover:bg-[var(--editorial-surface-container,var(--muted))] text-muted-foreground disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Sheet */}
      <ProfileSheet
        user={selectedUser}
        open={!!selectedUserId}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
      />
    </div>
  );
}

function LevelPill({ level }: { level: string }) {
  const styles =
    level === "admin"
      ? "bg-[var(--editorial-secondary-container,var(--accent))] text-[var(--editorial-on-secondary-container,var(--accent-foreground))]"
      : level === "manager"
        ? "bg-[var(--editorial-secondary-container,var(--accent))] text-[var(--editorial-on-secondary-container,var(--accent-foreground))]"
        : "bg-[var(--editorial-surface-container-high,var(--muted))] text-muted-foreground";
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles}`}>
      {level}
    </span>
  );
}

function StatusIndicator({ status, label }: { status: string; label: string }) {
  const dotColor =
    status === "active"
      ? "bg-[var(--editorial-tertiary,var(--color-success))]"
      : status === "pending"
        ? "bg-[var(--editorial-primary-container,var(--primary))]"
        : "bg-muted-foreground/40";
  const textColor =
    status === "active"
      ? "text-[var(--editorial-tertiary,var(--color-success))]"
      : status === "pending"
        ? "text-[var(--editorial-primary-container,var(--primary))]"
        : "text-muted-foreground";

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className={`text-xs font-bold ${textColor}`}>{label}</span>
    </div>
  );
}
