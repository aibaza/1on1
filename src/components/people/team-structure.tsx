"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import type { UserRow } from "./people-table-columns";

interface TeamStructureProps {
  users: UserRow[];
  currentUserId: string;
  currentUserLevel: string;
}

interface ManagerNode {
  user: UserRow;
  reports: UserRow[];
}

function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function buildTree(
  users: UserRow[],
  currentUserId: string,
  currentUserLevel: string
): { roots: ManagerNode[]; unassigned: UserRow[] } {
  const activeUsers = users.filter((u) => u.status !== "deactivated");
  const byId = new Map(activeUsers.map((u) => [u.id, u]));

  // Find managers (users who have at least one report)
  const managerIds = new Set(activeUsers.filter((u) => u.managerId).map((u) => u.managerId!));
  const allRoots: ManagerNode[] = [];

  for (const managerId of managerIds) {
    const manager = byId.get(managerId);
    if (!manager) continue;
    const reports = activeUsers.filter((u) => u.managerId === managerId);
    allRoots.push({ user: manager, reports });
  }

  // For managers: show only their own tree node
  // For admins: show all trees
  let roots: ManagerNode[];
  if (currentUserLevel === "admin") {
    roots = allRoots;
  } else {
    roots = allRoots.filter((node) => node.user.id === currentUserId);
  }

  // Sort: admins first, then by name
  roots.sort((a, b) => {
    if (a.user.level === "admin" && b.user.level !== "admin") return -1;
    if (a.user.level !== "admin" && b.user.level === "admin") return 1;
    return `${a.user.lastName} ${a.user.firstName}`.localeCompare(`${b.user.lastName} ${b.user.firstName}`);
  });

  // Users without a manager who aren't a manager themselves (admin view only)
  let unassigned: UserRow[] = [];
  if (currentUserLevel === "admin") {
    const allManagedOrManagers = new Set([...managerIds, ...activeUsers.filter((u) => u.managerId).map((u) => u.id)]);
    unassigned = activeUsers.filter((u) => !allManagedOrManagers.has(u.id));
  }

  return { roots, unassigned };
}

function RoleBadge({ user }: { user: UserRow }) {
  const t = useTranslations("people.table");
  const label = user.jobTitle
    ? user.jobTitle
    : user.level === "admin" ? t("admin") : user.level === "manager" ? t("manager") : t("member");
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
  );
}

export function TeamStructure({ users, currentUserId, currentUserLevel }: TeamStructureProps) {
  const t = useTranslations("people.teamStructure");
  const [expanded, setExpanded] = useState(true);
  const { roots, unassigned } = buildTree(users, currentUserId, currentUserLevel);

  if (roots.length === 0) return null;

  return (
    <section className="mt-12 bg-muted/50 rounded-2xl p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-extrabold text-foreground font-headline">{t("title")}</h3>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-primary font-bold text-xs flex items-center gap-1 hover:underline"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {expanded ? t("collapse") : t("expand")}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-4">
          {roots.map((node) => (
            <div key={node.user.id} className="relative pl-8 border-l-2 border-border/30">
              {/* Manager node */}
              <div className="absolute -left-[9px] top-4 w-4 h-4 rounded-full bg-primary border-4 border-background" />
              <div className="flex items-center gap-4 bg-card p-4 rounded-xl shadow-sm max-w-sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getAvatarUrl(`${node.user.firstName} ${node.user.lastName}`, node.user.avatarUrl, null, node.user.level)} alt={`${node.user.firstName} ${node.user.lastName}`} />
                  <AvatarFallback className="text-xs">{getInitials(node.user.firstName, node.user.lastName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-foreground">{node.user.firstName} {node.user.lastName}</p>
                  <RoleBadge user={node.user} />
                </div>
              </div>

              {/* Reports */}
              {node.reports.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {node.reports.map((report) => (
                    <div key={report.id} className="relative pl-8 border-l-2 border-border/30">
                      <div className="absolute -left-[5px] top-2.5 w-2 h-2 rounded-full bg-border" />
                      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-card transition-colors">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={getAvatarUrl(`${report.firstName} ${report.lastName}`, report.avatarUrl, null, report.level)} alt={`${report.firstName} ${report.lastName}`} />
                          <AvatarFallback className="text-[8px]">{getInitials(report.firstName, report.lastName)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-foreground">{report.firstName} {report.lastName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {unassigned.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                {t("noManager", { count: unassigned.length })}
              </p>
              <div className="flex flex-wrap gap-2">
                {unassigned.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 bg-card px-3 py-2 rounded-lg">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={getAvatarUrl(`${u.firstName} ${u.lastName}`, u.avatarUrl, null, u.level)} />
                      <AvatarFallback className="text-[8px]">{getInitials(u.firstName, u.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{u.firstName} {u.lastName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
