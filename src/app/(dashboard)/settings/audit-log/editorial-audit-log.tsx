"use client";

import { Fragment, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronDown, ChevronRight, ChevronLeft, Download, Info } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AuditEntry {
  id: string;
  actorName: string;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const ACTION_BADGE_STYLES: Record<string, string> = {
  role_changed: "bg-[var(--editorial-secondary-container,var(--accent))] text-[var(--editorial-on-secondary-container,var(--accent-foreground))]",
  manager_assigned: "bg-[var(--editorial-secondary-container,var(--accent))] text-[var(--editorial-on-secondary-container,var(--accent-foreground))]",
  user_deactivated: "bg-destructive/10 text-destructive",
  user_reactivated: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  invite_sent: "bg-[var(--editorial-tertiary,var(--color-success))]/10 text-[var(--editorial-tertiary,var(--color-success))]",
  invite_accepted: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  invite_resent: "bg-[var(--editorial-tertiary,var(--color-success))]/10 text-[var(--editorial-tertiary,var(--color-success))]",
  org_settings_changed: "bg-primary/10 text-primary",
  team_created: "bg-primary/10 text-primary",
  team_updated: "bg-primary/10 text-primary",
  team_deleted: "bg-destructive/10 text-destructive",
  profile_updated: "bg-[var(--editorial-secondary-container,var(--accent))] text-[var(--editorial-on-secondary-container,var(--accent-foreground))]",
};

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function EditorialAuditLog() {
  const t = useTranslations("settings");
  const format = useFormatter();

  const ACTION_TYPES = [
    { value: "invite_sent", label: t("auditLog.actions.inviteSent") },
    { value: "invite_accepted", label: t("auditLog.actions.inviteAccepted") },
    { value: "invite_resent", label: t("auditLog.actions.inviteResent") },
    { value: "role_changed", label: t("auditLog.actions.roleChanged") },
    { value: "manager_assigned", label: t("auditLog.actions.managerAssigned") },
    { value: "user_deactivated", label: t("auditLog.actions.userDeactivated") },
    { value: "user_reactivated", label: t("auditLog.actions.userReactivated") },
    { value: "profile_updated", label: t("auditLog.actions.profileUpdated") },
    { value: "team_created", label: t("auditLog.actions.teamCreated") },
    { value: "team_updated", label: t("auditLog.actions.teamUpdated") },
    { value: "team_deleted", label: t("auditLog.actions.teamDeleted") },
    { value: "member_added_to_team", label: t("auditLog.actions.memberAdded") },
    { value: "member_removed_from_team", label: t("auditLog.actions.memberRemoved") },
    { value: "team_lead_changed", label: t("auditLog.actions.leadChanged") },
    { value: "org_settings_changed", label: t("auditLog.actions.orgSettingsChanged") },
  ];

  const ACTION_LABEL_MAP = new Map(ACTION_TYPES.map((a) => [a.value, a.label]));

  function formatActionLabel(action: string): string {
    return ACTION_LABEL_MAP.get(action) ?? action.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  function formatMetadataShort(action: string, metadata: Record<string, unknown>): string | null {
    if (action === "role_changed" && metadata.previousRole && metadata.newRole) {
      return `${t("auditLog.metadata.roleChange")}: ${metadata.previousRole} → ${metadata.newRole}`;
    }
    if (action === "manager_assigned") {
      return `${t("auditLog.metadata.managerChange")}: ${metadata.previousManagerId ?? "None"} → ${metadata.newManagerId ?? "None"}`;
    }
    const keys = Object.keys(metadata);
    if (keys.length === 0) return null;
    const first = keys[0];
    return `${first}: ${String(metadata[first])}`;
  }

  const [searchInput, setSearchInput] = useState("");
  const [action, setAction] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", "50");
  if (action !== "all") queryParams.set("action", action);
  if (fromDate) queryParams.set("from", fromDate);
  if (toDate) queryParams.set("to", toDate);
  if (searchInput.trim()) queryParams.set("search", searchInput.trim());

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ["audit-log", action, fromDate, toDate, searchInput, page],
    queryFn: async () => {
      const res = await fetch(`/api/audit-log?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit log");
      return res.json();
    },
  });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-8">
      {/* Filter Bar */}
      <div className="bg-card rounded-xl p-6 border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-12 md:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              {t("auditLog.searchPlaceholder")}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
                placeholder={t("auditLog.searchPlaceholder")}
                className="w-full bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg py-3 pl-10 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>
          </div>
          <div className="col-span-6 md:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              {t("auditLog.actionType")}
            </label>
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="w-full bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg py-3 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
            >
              <option value="all">{t("auditLog.allActions")}</option>
              {ACTION_TYPES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-6 md:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              {t("auditLog.dateRange")}
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="flex-1 bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg py-3 px-3 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="flex-1 bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg py-3 px-3 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>
          </div>
          <div className="col-span-12 md:col-span-2">
            <button
              type="button"
              className="w-full text-white font-headline font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
              style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
            >
              <Download className="h-4 w-4" />
              {t("auditLog.exportCsv")}
            </button>
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-card rounded-2xl border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">{t("auditLog.loading")}</div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">{t("auditLog.empty")}</div>
        ) : (
          <>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--editorial-surface-container-low,var(--muted))]/50">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t("auditLog.timestamp")}</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t("auditLog.actor")}</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t("auditLog.action")}</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">{t("auditLog.target")}</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right hidden md:table-cell">{t("auditLog.details")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--editorial-outline-variant,var(--border))]/20">
                {entries.map((entry) => {
                  const isExpanded = expandedRows.has(entry.id);
                  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
                  const hasMetadata = Object.keys(metadata).length > 0;
                  const shortMeta = formatMetadataShort(entry.action, metadata);
                  const badgeStyle = ACTION_BADGE_STYLES[entry.action] ?? "bg-[var(--editorial-surface-container,var(--muted))] text-muted-foreground";

                  return (
                    <Fragment key={entry.id}>
                      <tr
                        className={`hover:bg-[var(--editorial-surface-container-low,var(--muted))] transition-colors group ${hasMetadata ? "cursor-pointer" : ""}`}
                        onClick={() => hasMetadata && setExpandedRows((prev) => {
                          const next = new Set(prev);
                          next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id);
                          return next;
                        })}
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="text-xs font-medium text-foreground">
                            {format.dateTime(new Date(entry.createdAt), { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {format.dateTime(new Date(entry.createdAt), { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-[10px] font-bold">{getInitials(entry.actorName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-semibold text-foreground">{entry.actorName}</div>
                              {entry.actorEmail && (
                                <div className="text-[11px] text-muted-foreground">{entry.actorEmail}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${badgeStyle}`}>
                            {formatActionLabel(entry.action)}
                          </span>
                        </td>
                        <td className="px-6 py-5 hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {entry.resourceType}
                            {entry.resourceId && (
                              <> · <code className="text-xs bg-[var(--editorial-surface-container,var(--muted))] px-1 rounded">{entry.resourceId.slice(0, 8)}</code></>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right hidden md:table-cell">
                          {shortMeta && (
                            <span className="text-xs text-muted-foreground italic">{shortMeta}</span>
                          )}
                          {hasMetadata && (
                            <span className="ml-2 inline-block">
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground inline" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground inline" />}
                            </span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasMetadata && (
                        <tr>
                          <td colSpan={5} className="bg-[var(--editorial-surface-container-low,var(--muted))]/50 px-6 py-4">
                            <div className="space-y-1.5 ml-11">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{t("auditLog.details")}</p>
                              {Object.entries(metadata).map(([key, value]) => (
                                <div key={key} className="flex gap-2 text-sm">
                                  <span className="font-medium min-w-[120px] text-foreground">{key}:</span>
                                  <span className="text-muted-foreground">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-[var(--editorial-surface-container-low,var(--muted))]/30 border-t border-[var(--editorial-outline-variant,var(--border))]/20 flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">
                  {t("auditLog.showing", { from: (page - 1) * 50 + 1, to: Math.min(page * 50, total), total })}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg hover:bg-[var(--editorial-surface-container,var(--muted))] text-muted-foreground disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                        page === p
                          ? "bg-[var(--editorial-primary-container,var(--primary))] text-white"
                          : "text-muted-foreground hover:bg-[var(--editorial-surface-container,var(--muted))]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-[var(--editorial-surface-container,var(--muted))] text-muted-foreground disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Retention info */}
      <div className="p-6 rounded-xl bg-primary/5 flex items-start gap-4">
        <Info className="h-5 w-5 text-[var(--editorial-primary-container,var(--primary))] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-primary mb-1">{t("auditLog.retentionTitle")}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{t("auditLog.retentionDesc")}</p>
        </div>
      </div>
    </div>
  );
}
