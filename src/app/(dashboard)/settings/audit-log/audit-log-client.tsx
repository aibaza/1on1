"use client";

import { Fragment, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


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

export function AuditLogClient() {
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
    return (
      ACTION_LABEL_MAP.get(action) ??
      action
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    );
  }

  function formatMetadata(
    action: string,
    metadata: Record<string, unknown>
  ): { key: string; value: string }[] {
    const entries: { key: string; value: string }[] = [];

    if (action === "role_changed") {
      if (metadata.previousRole || metadata.newRole) {
        entries.push({
          key: t("auditLog.metadata.roleChange"),
          value: `${metadata.previousRole ?? "unknown"} -> ${metadata.newRole ?? "unknown"}`,
        });
      }
    } else if (action === "manager_assigned") {
      entries.push({
        key: t("auditLog.metadata.managerChange"),
        value: `${metadata.previousManagerId ?? "None"} -> ${metadata.newManagerId ?? "None"}`,
      });
    } else if (action === "team_lead_changed") {
      entries.push({
        key: t("auditLog.metadata.leadChange"),
        value: `${metadata.previousLeadId ?? "None"} -> ${metadata.newLeadId ?? "None"}`,
      });
    } else {
      for (const [key, value] of Object.entries(metadata)) {
        entries.push({
          key: key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase()),
          value:
            typeof value === "object" ? JSON.stringify(value) : String(value),
        });
      }
    }

    return entries;
  }

  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", "50");
  if (action && action !== "all") queryParams.set("action", action);
  if (fromDate) queryParams.set("from", fromDate);
  if (toDate) queryParams.set("to", toDate);
  if (search.trim()) queryParams.set("search", search.trim());

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ["audit-log", action, fromDate, toDate, search, page],
    queryFn: async () => {
      const res = await fetch(`/api/audit-log?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit log");
      return res.json();
    },
  });

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("auditLog.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>

        <Select
          value={action}
          onValueChange={(v) => {
            setAction(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("auditLog.allActions")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("auditLog.allActions")}</SelectItem>
            {ACTION_TYPES.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-[150px]"
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">{t("auditLog.to")}</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="w-[150px]"
            placeholder="To"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {t("auditLog.loading")}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState heading={t("auditLog.empty")} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>{t("auditLog.timestamp")}</TableHead>
                <TableHead>{t("auditLog.actor")}</TableHead>
                <TableHead>{t("auditLog.action")}</TableHead>
                <TableHead>{t("auditLog.target")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const isExpanded = expandedRows.has(entry.id);
                const metadata = (entry.metadata ?? {}) as Record<
                  string,
                  unknown
                >;
                const hasMetadata = Object.keys(metadata).length > 0;
                const metadataEntries = hasMetadata
                  ? formatMetadata(entry.action, metadata)
                  : [];

                return (
                  <Fragment key={entry.id}>
                    <TableRow
                      className={
                        hasMetadata ? "cursor-pointer hover:bg-accent/50" : ""
                      }
                      onClick={() => hasMetadata && toggleRow(entry.id)}
                    >
                      <TableCell className="px-2">
                        {hasMetadata &&
                          (isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ))}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format.dateTime(new Date(entry.createdAt), {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {entry.actorName}
                          </span>
                          {entry.actorEmail && (
                            <span className="text-xs text-muted-foreground">
                              {entry.actorEmail}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatActionLabel(entry.action)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.resourceType}
                        {entry.resourceId
                          ? `: ${entry.resourceId.slice(0, 8)}...`
                          : ""}
                      </TableCell>
                    </TableRow>

                    {isExpanded && hasMetadata && (
                      <TableRow key={`${entry.id}-details`}>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {t("auditLog.details")}
                            </p>
                            {metadataEntries.map((m, i) => (
                              <div
                                key={i}
                                className="flex gap-2 text-sm"
                              >
                                <span className="font-medium min-w-[120px]">
                                  {m.key}:
                                </span>
                                <span className="text-muted-foreground">
                                  {m.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("auditLog.showing", { from: (page - 1) * 50 + 1, to: Math.min(page * 50, total), total })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              {t("auditLog.previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("auditLog.pageOf", { page, total: totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              {t("auditLog.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
