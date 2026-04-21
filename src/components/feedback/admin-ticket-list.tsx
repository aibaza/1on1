"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PriorityBadge } from "@/components/feedback/priority-badge";
import { TypeBadge } from "@/components/feedback/type-badge";
import {
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  type FeedbackPriority,
  type FeedbackStatus,
  type FeedbackType,
} from "@/lib/validations/feedback";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export interface AdminFeedbackListItem {
  id: string;
  ticketNumber: number;
  type: FeedbackType;
  title: string;
  status: FeedbackStatus;
  priority: FeedbackPriority | null;
  tags: string[];
  updatedAt: string;
  createdAt: string;
  reporter: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  tenant: { id: string; name: string } | null;
  assignedTo: {
    id: string;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface AdminFeedbackListResponse {
  items: AdminFeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface TenantOption {
  id: string;
  name: string;
}
interface Assignee {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

interface AdminTicketListProps {
  initialData: AdminFeedbackListResponse;
  tenants: TenantOption[];
  selectedId?: string | null;
}

interface Filters {
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  type?: FeedbackType;
  tenantId?: string;
  assignedToUserId?: string;
  q?: string;
  page: number;
  pageSize: number;
}

function parseFilters(params: URLSearchParams): Filters {
  const status = params.get("status");
  const priority = params.get("priority");
  const type = params.get("type");
  const tenantId = params.get("tenantId") ?? undefined;
  const assignedToUserId = params.get("assignedToUserId") ?? undefined;
  const q = params.get("q") ?? undefined;
  const page = parseInt(params.get("page") ?? "1", 10) || 1;
  const pageSize = parseInt(params.get("pageSize") ?? "25", 10) || 25;
  return {
    status:
      status && (FEEDBACK_STATUSES as readonly string[]).includes(status)
        ? (status as FeedbackStatus)
        : undefined,
    priority:
      priority && (FEEDBACK_PRIORITIES as readonly string[]).includes(priority)
        ? (priority as FeedbackPriority)
        : undefined,
    type:
      type && (FEEDBACK_TYPES as readonly string[]).includes(type)
        ? (type as FeedbackType)
        : undefined,
    tenantId,
    assignedToUserId,
    q,
    page,
    pageSize,
  };
}

function buildQueryString(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.type) params.set("type", filters.type);
  if (filters.tenantId) params.set("tenantId", filters.tenantId);
  if (filters.assignedToUserId)
    params.set("assignedToUserId", filters.assignedToUserId);
  if (filters.q) params.set("q", filters.q);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  return params.toString();
}

function getInitials(name: string | null, email: string | null): string {
  if (name && name.trim().length > 0) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }
  if (email && email.length > 0) return email.charAt(0).toUpperCase();
  return "?";
}

const STATUS_DOT: Record<FeedbackStatus, string> = {
  new: "bg-primary",
  triaged: "bg-secondary-foreground/60",
  in_progress: "bg-amber-500",
  awaiting_user: "bg-amber-500",
  resolved: "bg-emerald-500",
  closed: "bg-muted-foreground",
};

export function AdminTicketList({
  initialData,
  tenants,
  selectedId,
}: AdminTicketListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tFilters = useTranslations("feedback.admin.filters");
  const tList = useTranslations("feedback.admin.list");
  const tStatus = useTranslations("feedback.status");
  const tPriority = useTranslations("feedback.priority");
  const tType = useTranslations("feedback.type");

  const filters = useMemo(
    () => parseFilters(searchParams ?? new URLSearchParams()),
    [searchParams]
  );

  // Debounced search input -> URL param
  const [searchInput, setSearchInput] = useState(filters.q ?? "");
  useEffect(() => {
    setSearchInput(filters.q ?? "");
  }, [filters.q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((filters.q ?? "") === searchInput) return;
      const next = { ...filters, q: searchInput || undefined, page: 1 };
      const qs = buildQueryString(next);
      router.replace(`/admin/feedback${qs ? `?${qs}` : ""}`, {
        scroll: false,
      });
    }, 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const assigneesQuery = useQuery<Assignee[]>({
    queryKey: ["admin-feedback-assignees"],
    queryFn: async () => {
      const res = await fetch("/api/admin/feedback/assignees");
      if (!res.ok) throw new Error("Failed to load assignees");
      return res.json();
    },
    staleTime: 60_000,
  });

  const listQuery = useQuery<AdminFeedbackListResponse>({
    queryKey: ["admin-feedback-list", filters],
    queryFn: async () => {
      const qs = buildQueryString(filters);
      const res = await fetch(`/api/admin/feedback${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to load feedback");
      return res.json();
    },
    initialData,
    staleTime: 10_000,
  });

  const setFilter = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...filters, ...patch, page: 1 };
      const qs = buildQueryString(next);
      router.replace(`/admin/feedback${qs ? `?${qs}` : ""}`, {
        scroll: false,
      });
    },
    [filters, router]
  );

  const setPage = useCallback(
    (page: number) => {
      const next = { ...filters, page };
      const qs = buildQueryString(next);
      router.replace(`/admin/feedback${qs ? `?${qs}` : ""}`, {
        scroll: false,
      });
    },
    [filters, router]
  );

  const clearAll = useCallback(() => {
    router.replace(`/admin/feedback`, { scroll: false });
    setSearchInput("");
  }, [router]);

  const data = listQuery.data ?? initialData;
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const hasAnyFilter =
    !!filters.status ||
    !!filters.priority ||
    !!filters.type ||
    !!filters.tenantId ||
    !!filters.assignedToUserId ||
    !!filters.q;

  const assigneeOptions = assigneesQuery.data ?? [];

  // Build a per-link href that preserves filters + sets selected id via route.
  const buildRowHref = (id: string) => {
    const qs = buildQueryString(filters);
    return `/admin/feedback/${id}${qs ? `?${qs}` : ""}`;
  };

  // Preserve current selection for back-navigation on pathname change
  // (nothing to do — React Router handles via URL directly). This effect
  // is a no-op hook to avoid removing structure if needed.
  void pathname;

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-col gap-2 border-b bg-muted/30 px-3 py-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tFilters("searchPlaceholder")}
            className="pl-8"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={filters.status ?? ALL}
            onValueChange={(v) =>
              setFilter({
                status: v === ALL ? undefined : (v as FeedbackStatus),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={tFilters("status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{tFilters("anyStatus")}</SelectItem>
              {FEEDBACK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {tStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.priority ?? ALL}
            onValueChange={(v) =>
              setFilter({
                priority: v === ALL ? undefined : (v as FeedbackPriority),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={tFilters("priority")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{tFilters("anyPriority")}</SelectItem>
              {FEEDBACK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {tPriority(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.type ?? ALL}
            onValueChange={(v) =>
              setFilter({ type: v === ALL ? undefined : (v as FeedbackType) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={tFilters("type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{tFilters("anyType")}</SelectItem>
              {FEEDBACK_TYPES.map((ty) => (
                <SelectItem key={ty} value={ty}>
                  {tType(ty)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.tenantId ?? ALL}
            onValueChange={(v) =>
              setFilter({ tenantId: v === ALL ? undefined : v })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={tFilters("tenant")} />
            </SelectTrigger>
            <SelectContent className="max-h-[320px]">
              <SelectItem value={ALL}>{tFilters("anyTenant")}</SelectItem>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.assignedToUserId ?? ALL}
            onValueChange={(v) =>
              setFilter({ assignedToUserId: v === ALL ? undefined : v })
            }
          >
            <SelectTrigger className="col-span-2 w-full">
              <SelectValue placeholder={tFilters("assignee")} />
            </SelectTrigger>
            <SelectContent className="max-h-[320px]">
              <SelectItem value={ALL}>{tFilters("anyAssignee")}</SelectItem>
              {assigneeOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name ?? a.email ?? a.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasAnyFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 self-end"
          >
            <X className="mr-1 h-3.5 w-3.5" /> {tFilters("clear")}
          </Button>
        )}
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {data.items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center text-sm text-muted-foreground">
            {hasAnyFilter ? tList("noResults") : tList("empty")}
          </div>
        ) : (
          <ul role="list" className="divide-y">
            {data.items.map((item) => {
              const active = selectedId === item.id;
              const updated = new Date(item.updatedAt);
              return (
                <li key={item.id}>
                  <Link
                    href={buildRowHref(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-col gap-2 border-l-2 px-3 py-3 transition-colors",
                      active
                        ? "border-l-primary bg-primary/5"
                        : "border-l-transparent hover:bg-accent/40"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <TypeBadge type={item.type} className="text-[10px]" />
                      <span className="font-mono text-[10.5px] text-muted-foreground">
                        FB-{item.ticketNumber}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "line-clamp-2 text-[13.5px] font-medium",
                        active ? "text-primary" : "text-foreground"
                      )}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            STATUS_DOT[item.status]
                          )}
                          aria-hidden
                        />
                        <span className="truncate text-[11px] text-muted-foreground">
                          {item.tenant?.name ?? tList("unknown")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityBadge
                          priority={item.priority}
                          className="text-[10px]"
                        />
                        {item.assignedTo ? (
                          <Avatar size="sm" className="h-5 w-5 text-[9px]">
                            {item.assignedTo.avatarUrl ? (
                              <AvatarImage
                                src={item.assignedTo.avatarUrl}
                                alt={
                                  item.assignedTo.name ??
                                  item.assignedTo.email ??
                                  ""
                                }
                              />
                            ) : null}
                            <AvatarFallback>
                              {getInitials(
                                item.assignedTo.name,
                                item.assignedTo.email
                              )}
                            </AvatarFallback>
                          </Avatar>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                      <span className="truncate">
                        {item.reporter?.name ??
                          item.reporter?.email ??
                          tList("unknown")}
                      </span>
                      <span>
                        {formatDistanceToNowStrict(updated, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {data.total > data.pageSize && (
        <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
          <span className="text-[11px] text-muted-foreground">
            {tList("pageOf", {
              page: data.page,
              totalPages,
            })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
              aria-label={tList("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={data.page >= totalPages}
              onClick={() => setPage(data.page + 1)}
              aria-label={tList("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
