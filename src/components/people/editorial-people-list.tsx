"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Search, ChevronRight, Mail, Briefcase, Users, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleSelect } from "./role-select";
import { UserActionsMenu } from "./user-actions-menu";
import { ProfileSheet } from "./profile-sheet";
import type { UserRow } from "./people-table-columns";

interface EditorialPeopleListProps {
  initialData: UserRow[];
  currentUserRole: string;
  currentUserId: string;
  availableTeams: { id: string; name: string }[];
}

function getInitials(first: string, last: string): string {
  if (!first && !last) return "?";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active"
      ? "bg-[var(--color-success)]"
      : status === "pending"
        ? "bg-[var(--color-warning)]"
        : "bg-muted-foreground/40";
  return (
    <span
      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${color}`}
      title={status}
    />
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles =
    role === "admin"
      ? "text-primary bg-primary/8"
      : role === "manager"
        ? "text-[var(--color-success)] bg-[var(--color-success)]/8"
        : "text-muted-foreground bg-muted";
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${styles}`}>
      {role}
    </span>
  );
}

type FilterRole = "all" | "admin" | "manager" | "member";
type FilterStatus = "all" | "active" | "pending" | "deactivated";

export function EditorialPeopleList({
  initialData,
  currentUserRole,
  currentUserId,
  availableTeams,
}: EditorialPeopleListProps) {
  const t = useTranslations("people");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<FilterRole>("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: users } = useQuery<UserRow[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    initialData,
  });

  const isAdmin = currentUserRole === "admin";

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
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (teamFilter !== "all" && !u.teams.some((t) => t.id === teamFilter)) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, teamFilter, statusFilter]);

  // Group by role for display
  const admins = filtered.filter((u) => u.role === "admin");
  const managers = filtered.filter((u) => u.role === "manager");
  const members = filtered.filter((u) => u.role === "member");

  const selectedUser = useMemo(
    () => (users ?? []).find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const hasActiveFilters = roleFilter !== "all" || teamFilter !== "all" || statusFilter !== "all";

  return (
    <div className="space-y-8">
      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("table.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-full text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role filter pills */}
          {(["all", "admin", "manager", "member"] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                roleFilter === role
                  ? "bg-primary text-white shadow-sm"
                  : "bg-[var(--editorial-surface-container,var(--muted))] text-muted-foreground hover:text-foreground"
              }`}
            >
              {role === "all" ? t("table.allRoles") : t(`table.${role}`)}
            </button>
          ))}

          {/* Team filter */}
          {availableTeams.length > 0 && (
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-full bg-[var(--editorial-surface-container,var(--muted))] text-muted-foreground border-none focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
            >
              <option value="all">{t("table.allTeams")}</option>
              {availableTeams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          )}

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="px-3 py-2 text-xs font-bold rounded-full bg-[var(--editorial-surface-container,var(--muted))] text-muted-foreground border-none focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
          >
            <option value="all">{t("table.allStatus")}</option>
            <option value="active">{t("table.active")}</option>
            <option value="pending">{t("table.pending")}</option>
            <option value="deactivated">{t("table.deactivated")}</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => { setRoleFilter("all"); setTeamFilter("all"); setStatusFilter("all"); }}
              className="text-xs font-bold text-primary hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          {filtered.length} {filtered.length === 1 ? "person" : "people"}
        </p>
      </div>

      {/* People cards by role group */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <UserCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">{t("table.noUsers")}</p>
        </div>
      ) : (
        <div className="space-y-12">
          {admins.length > 0 && (
            <PeopleGroup
              label="Leadership"
              users={admins}
              isAdmin={isAdmin}
              currentUserRole={currentUserRole}
              currentUserId={currentUserId}
              onSelect={setSelectedUserId}
            />
          )}
          {managers.length > 0 && (
            <PeopleGroup
              label="Managers"
              users={managers}
              isAdmin={isAdmin}
              currentUserRole={currentUserRole}
              currentUserId={currentUserId}
              onSelect={setSelectedUserId}
            />
          )}
          {members.length > 0 && (
            <PeopleGroup
              label="Team Members"
              users={members}
              isAdmin={isAdmin}
              currentUserRole={currentUserRole}
              currentUserId={currentUserId}
              onSelect={setSelectedUserId}
            />
          )}
        </div>
      )}

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

function PeopleGroup({
  label,
  users,
  isAdmin,
  currentUserRole,
  currentUserId,
  onSelect,
}: {
  label: string;
  users: UserRow[];
  isAdmin: boolean;
  currentUserRole: string;
  currentUserId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-lg font-extrabold font-headline text-foreground">{label}</h3>
        <span className="text-[10px] font-bold text-muted-foreground bg-[var(--editorial-surface-container,var(--muted))] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          {users.length}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {users.map((user) => (
          <PersonCard
            key={user.id}
            user={user}
            isAdmin={isAdmin}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            onClick={() => onSelect(user.id)}
          />
        ))}
      </div>
    </section>
  );
}

function PersonCard({
  user,
  isAdmin,
  currentUserRole,
  currentUserId,
  onClick,
}: {
  user: UserRow;
  isAdmin: boolean;
  currentUserRole: string;
  currentUserId: string;
  onClick: () => void;
}) {
  const isDeactivated = user.status === "deactivated";

  return (
    <div
      onClick={onClick}
      className={`group bg-card rounded-2xl p-6 border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-pointer hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:border-[var(--editorial-outline-variant,var(--border))]/80 ${
        isDeactivated ? "opacity-50 hover:opacity-80" : ""
      }`}
      data-deactivated={isDeactivated || undefined}
    >
      {/* Top row: avatar + name + actions */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-12 w-12 rounded-xl">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={`${user.firstName} ${user.lastName}`} className="rounded-xl" />
              <AvatarFallback className="rounded-xl text-sm font-bold">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <StatusDot status={user.status} />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-foreground truncate">
              {user.firstName} {user.lastName}
              {user.id === currentUserId && (
                <span className="ml-1.5 text-muted-foreground font-normal text-xs">(you)</span>
              )}
            </h4>
            {user.jobTitle && (
              <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                {user.jobTitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <RoleSelect
            userId={user.id}
            currentRole={user.role}
            disabled={!isAdmin || user.status === "pending"}
          />
          <UserActionsMenu
            user={user}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
          />
        </div>
      </div>

      {/* Details grid */}
      <div className="space-y-3">
        {/* Email */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{user.email}</span>
        </div>

        {/* Manager */}
        {user.managerName && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Reports to <span className="font-semibold text-foreground">{user.managerName}</span></span>
          </div>
        )}

        {/* Teams */}
        {user.teams.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {user.teams.map((team) => (
                <span
                  key={team.id}
                  className="px-2 py-0.5 rounded-md bg-[var(--editorial-surface-container,var(--muted))] text-[10px] font-bold uppercase tracking-wider"
                >
                  {team.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hover reveal: View Profile */}
      <div className="mt-5 pt-4 border-t border-[var(--editorial-outline-variant,var(--border))]/30 flex items-center justify-between">
        <RoleBadge role={user.role} />
        <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          View Profile <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
