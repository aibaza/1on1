"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useTranslations, useFormatter } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  ClipboardList,
  FilterX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { getAvatarUrl } from "@/lib/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// --- Types ---

interface HistorySession {
  id: string;
  sessionNumber: number;
  scheduledAt: string;
  completedAt: string | null;
  status: string;
  sessionScore: number | null;
  durationMinutes: number | null;
  seriesId: string;
  reportFirstName: string;
  reportLastName: string;
  reportAvatarUrl: string | null;
  reportRole: string;
  managerFirstName: string;
  managerLastName: string;
}

interface SeriesOption {
  id: string;
  reportName: string;
  managerName: string;
}

interface HistoryPageProps {
  initialSessions: HistorySession[];
  initialSeriesScores: Record<string, number[]>;
  initialHasMore: boolean;
  initialNextCursor: string | null;
  seriesOptions: SeriesOption[];
}

interface HistoryApiResponse {
  sessions: HistorySession[];
  seriesScores: Record<string, number[]>;
  hasMore: boolean;
  nextCursor: string | null;
}

interface SearchSessionResult {
  sessionId: string;
  sessionNumber: number;
  snippet: string;
  seriesId: string;
  reportName: string;
  scheduledAt: string;
}

// --- Helpers ---

function getScoreColor(score: number): string {
  const pct = score * 20;
  if (pct >= 70)
    return "text-[var(--editorial-tertiary,var(--color-success))]";
  if (pct >= 50)
    return "text-[var(--editorial-on-secondary-container,var(--secondary-foreground))]";
  return "text-destructive";
}

// --- Component ---

export function EditorialHistoryPage({
  initialSessions,
  initialSeriesScores,
  initialHasMore,
  initialNextCursor,
  seriesOptions,
}: HistoryPageProps) {
  const t = useTranslations("history");
  const format = useFormatter();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read filter state from URL
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") ?? "all"
  );
  const [fromDate, setFromDate] = useState(searchParams.get("from") ?? "");
  const [toDate, setToDate] = useState(searchParams.get("to") ?? "");
  const [seriesFilter, setSeriesFilter] = useState(
    searchParams.get("seriesId") ?? "all"
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    SearchSessionResult[] | null
  >(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accumulated sessions for "Load more" behavior
  const [allSessions, setAllSessions] =
    useState<HistorySession[]>(initialSessions);
  const [allSeriesScores, setAllSeriesScores] =
    useState<Record<string, number[]>>(initialSeriesScores);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  // Check if any filter is active
  const hasActiveFilters =
    statusFilter !== "all" || fromDate || toDate || seriesFilter !== "all";

  // Build query params string
  const buildQueryString = useCallback(
    (overrides?: { cursor?: string }) => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (seriesFilter !== "all") params.set("seriesId", seriesFilter);
      if (overrides?.cursor) params.set("cursor", overrides.cursor);
      return params.toString();
    },
    [statusFilter, fromDate, toDate, seriesFilter]
  );

  // Apply filters and update URL
  const applyFilters = useCallback(
    (newStatus: string, newFrom: string, newTo: string, newSeries: string) => {
      setStatusFilter(newStatus);
      setFromDate(newFrom);
      setToDate(newTo);
      setSeriesFilter(newSeries);

      // Update URL search params
      const params = new URLSearchParams();
      if (newStatus !== "all") params.set("status", newStatus);
      if (newFrom) params.set("from", newFrom);
      if (newTo) params.set("to", newTo);
      if (newSeries !== "all") params.set("seriesId", newSeries);

      const qs = params.toString();
      router.push(`/history${qs ? `?${qs}` : ""}`, { scroll: false });

      // Fetch new data
      setIsFiltering(true);
      const fetchUrl = `/api/history${qs ? `?${qs}` : ""}`;
      fetch(fetchUrl)
        .then((res) => res.json())
        .then((data: HistoryApiResponse) => {
          setAllSessions(data.sessions);
          setAllSeriesScores(data.seriesScores);
          setHasMore(data.hasMore);
          setNextCursor(data.nextCursor);
        })
        .catch(console.error)
        .finally(() => setIsFiltering(false));
    },
    [router]
  );

  // Load more handler
  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const qs = buildQueryString({ cursor: nextCursor });
      const res = await fetch(`/api/history${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to load more");
      const data: HistoryApiResponse = await res.json();
      setAllSessions((prev) => [...prev, ...data.sessions]);
      setAllSeriesScores((prev) => ({ ...prev, ...data.seriesScores }));
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, buildQueryString]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    applyFilters("all", "", "", "all");
  }, [applyFilters]);

  // Search handler with debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=20`
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setSearchResults(data.results.sessions);
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults(null);
    setIsSearching(false);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
  }, []);

  // Group sessions by series
  const groupedSessions = useMemo(() => {
    const groups = new Map<
      string,
      {
        seriesId: string;
        reportName: string;
        reportAvatarUrl: string | null;
        reportRole: string;
        managerName: string;
        sessions: HistorySession[];
      }
    >();

    for (const s of allSessions) {
      if (!groups.has(s.seriesId)) {
        groups.set(s.seriesId, {
          seriesId: s.seriesId,
          reportName: `${s.reportFirstName} ${s.reportLastName}`.trim(),
          reportAvatarUrl: s.reportAvatarUrl,
          reportRole: s.reportRole,
          managerName: `${s.managerFirstName} ${s.managerLastName}`.trim(),
          sessions: [],
        });
      }
      groups.get(s.seriesId)!.sessions.push(s);
    }

    return Array.from(groups.values());
  }, [allSessions]);

  const isShowingSearch = searchResults !== null || isSearching;

  // Suppress unused variable warning — isFiltering is set but only used
  // to track fetch state; the UI doesn't currently show a filtering indicator.
  void isFiltering;

  return (
    <div className="space-y-8">
      {/* Description */}
      <div className="mb-10">
        <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
          {t("description")}
        </p>
      </div>

      {/* Search bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground">
          <Search className="h-5 w-5" />
        </div>
        <input
          className="w-full pl-12 pr-32 py-4 bg-[var(--editorial-surface-container-low,var(--muted))] rounded-xl border-none focus:ring-2 focus:ring-[var(--editorial-primary-container,var(--ring))] transition-all text-foreground font-medium placeholder:text-muted-foreground/60 shadow-sm outline-none"
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <div className="absolute inset-y-0 right-4 flex items-center">
          {searchQuery ? (
            <button
              onClick={clearSearch}
              className="p-1 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status dropdown */}
        <div className="relative">
          <select
            className="appearance-none bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg pl-4 pr-10 py-2.5 text-sm font-semibold text-muted-foreground focus:ring-2 focus:ring-[var(--editorial-primary-container,var(--ring))] cursor-pointer outline-none"
            value={statusFilter}
            onChange={(e) =>
              applyFilters(e.target.value, fromDate, toDate, seriesFilter)
            }
          >
            <option value="all">{t("allStatus")}</option>
            <option value="completed">{t("completed")}</option>
            <option value="in_progress">{t("inProgress")}</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Date range */}
        <div className="flex items-center bg-[var(--editorial-surface-container-low,var(--muted))] rounded-lg px-3 py-1.5 gap-2">
          <input
            type="date"
            className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0 w-32 cursor-pointer outline-none"
            value={fromDate}
            onChange={(e) =>
              applyFilters(statusFilter, e.target.value, toDate, seriesFilter)
            }
          />
          <span className="text-muted-foreground/60 text-xs">{t("to")}</span>
          <input
            type="date"
            className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0 w-32 cursor-pointer outline-none"
            value={toDate}
            onChange={(e) =>
              applyFilters(statusFilter, fromDate, e.target.value, seriesFilter)
            }
          />
        </div>

        {/* Series dropdown */}
        <div className="relative">
          <select
            className="appearance-none bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-lg pl-4 pr-10 py-2.5 text-sm font-semibold text-muted-foreground focus:ring-2 focus:ring-[var(--editorial-primary-container,var(--ring))] cursor-pointer outline-none"
            value={seriesFilter}
            onChange={(e) =>
              applyFilters(statusFilter, fromDate, toDate, e.target.value)
            }
          >
            <option value="all">{t("allSeries")}</option>
            {(() => {
              const grouped = new Map<string, SeriesOption[]>();
              for (const opt of seriesOptions) {
                const group = grouped.get(opt.managerName) ?? [];
                group.push(opt);
                grouped.set(opt.managerName, group);
              }
              return Array.from(grouped.entries()).map(([manager, opts]) => (
                <optgroup key={manager} label={manager}>
                  {opts.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.reportName}
                    </option>
                  ))}
                </optgroup>
              ));
            })()}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto text-sm font-bold text-primary hover:text-primary/70 transition-colors flex items-center gap-1 px-4 py-2"
          >
            <FilterX className="h-4 w-4" />
            {t("clear")}
          </button>
        )}
      </div>

      {/* Search results */}
      {isSearching && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("searching")}
        </div>
      )}

      {!isSearching &&
        isShowingSearch &&
        searchResults &&
        searchResults.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              {t("noSearchResults", { query: searchQuery.trim() })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("noSearchResultsDesc")}
            </p>
          </div>
        )}

      {!isSearching &&
        isShowingSearch &&
        searchResults &&
        searchResults.length > 0 && (
          <div className="space-y-2">
            <div className="px-3 py-1 bg-accent rounded-lg text-xs font-bold text-muted-foreground inline-block">
              {t("sessionsFound", { count: searchResults.length })}
            </div>
            <div className="bg-card rounded-xl shadow-sm overflow-hidden divide-y divide-[var(--editorial-outline-variant,var(--border))]/10">
              {searchResults.map((r) => (
                <Link key={r.sessionId} href={`/sessions/${r.sessionId}/summary`}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-accent transition-colors cursor-pointer">
                    <span className="font-medium tabular-nums text-sm">
                      #{r.sessionNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {r.reportName}
                      </p>
                      <p
                        className="text-xs text-muted-foreground truncate"
                        dangerouslySetInnerHTML={{ __html: r.snippet }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format.dateTime(new Date(r.scheduledAt), {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      {/* Session groups (hidden during search) */}
      {!isShowingSearch && (
        <>
          {groupedSessions.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              heading={
                hasActiveFilters ? t("noFilterResults") : t("noSessions")
              }
              description={
                hasActiveFilters
                  ? t("noFilterResultsDesc")
                  : t("noSessionsDesc")
              }
              action={
                hasActiveFilters ? (
                  <button
                    onClick={clearFilters}
                    className="text-sm font-bold text-primary hover:text-primary/70 transition-colors"
                  >
                    {t("clearFilters")}
                  </button>
                ) : (
                  <Link
                    href="/sessions"
                    className="text-sm font-bold text-primary hover:text-primary/70 transition-colors"
                  >
                    {t("goToSessions")}
                  </Link>
                )
              }
            />
          ) : (
            <div className="space-y-10">
              {groupedSessions.map((group) => (
                <section key={group.seriesId}>
                  {/* Group header */}
                  <div className="flex items-end justify-between mb-6 px-2">
                    <div className="flex items-center gap-4">
                      <img
                        src={getAvatarUrl(group.reportName, group.reportAvatarUrl, null, group.reportRole)}
                        alt={group.reportName}
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 block">
                          {t("series")}
                        </span>
                        <h3 className="font-headline text-xl font-bold text-foreground">
                          {group.reportName}
                        </h3>
                      </div>
                    </div>
                    {/* Score trend sparkline */}
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--editorial-tertiary,var(--color-success))] mb-1">
                        {t("scoreTrend")}
                      </span>
                      <div className="w-28 h-10 flex items-end gap-px overflow-hidden">
                        {(allSeriesScores[group.seriesId] ?? []).map(
                          (score, i) => (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "flex-1 min-w-[3px] max-w-3 rounded-t-sm cursor-default hover:opacity-80 transition-opacity",
                                    score >= 3.5 ? "bg-emerald-400/60" : score >= 2.5 ? "bg-amber-400/60" : "bg-red-400/60"
                                  )}
                                  style={{
                                    height: `${Math.max(8, (score / 5) * 100)}%`,
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {score.toFixed(1)}/5
                              </TooltipContent>
                            </Tooltip>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Session rows card */}
                  <div className="bg-card rounded-xl shadow-sm overflow-hidden">
                    {group.sessions.map((s, i) => {
                      const isCompleted = s.status === "completed";
                      const isInProgress = s.status === "in_progress";
                      const isClickable = isCompleted || isInProgress;
                      const isStatic = !isClickable;

                      const row = (
                        <div
                          className={cn(
                            "flex items-center gap-6 p-5 transition-colors",
                            i > 0 &&
                              "border-t border-[var(--editorial-outline-variant,var(--border))]/10",
                            isClickable &&
                              "group hover:bg-accent cursor-pointer",
                            isStatic &&
                              "bg-[var(--editorial-surface-container-low,var(--muted))]/30 cursor-default"
                          )}
                        >
                          {/* Session number */}
                          <div
                            className={cn(
                              "w-10 font-medium text-sm",
                              isStatic
                                ? "text-muted-foreground/50"
                                : "text-muted-foreground"
                            )}
                          >
                            #{s.sessionNumber}
                          </div>

                          {/* Date + manager */}
                          <div className="flex-1">
                            <p
                              className={cn(
                                "font-bold",
                                isStatic
                                  ? "text-foreground/50"
                                  : "text-foreground"
                              )}
                            >
                              {format.dateTime(new Date(s.scheduledAt), {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            <p
                              className={cn(
                                "text-xs",
                                isStatic
                                  ? "text-muted-foreground/50"
                                  : "text-muted-foreground"
                              )}
                            >
                              {t("withManager", {
                                name: `${s.managerFirstName} ${s.managerLastName}`,
                              })}
                            </p>
                          </div>

                          {/* Status badge */}
                          <div className="w-32">
                            <span
                              className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5",
                                s.status === "completed" &&
                                  "bg-[var(--editorial-tertiary-container,#00665f)] text-[var(--on-tertiary-container,#7ee4d9)]",
                                s.status === "in_progress" &&
                                  "bg-[var(--editorial-secondary-container,var(--secondary))] text-[var(--editorial-on-secondary-container,var(--secondary-foreground))]",
                                s.status === "scheduled" &&
                                  "bg-[var(--editorial-surface-container-highest,var(--muted))] text-muted-foreground",
                                (s.status === "cancelled" ||
                                  s.status === "missed") &&
                                  "bg-destructive/10 text-destructive"
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  s.status === "completed" &&
                                    "bg-[var(--editorial-tertiary,var(--color-success))]",
                                  s.status === "in_progress" &&
                                    "bg-[var(--editorial-secondary,var(--secondary-foreground))] animate-pulse",
                                  s.status === "scheduled" &&
                                    "bg-muted-foreground",
                                  (s.status === "cancelled" ||
                                    s.status === "missed") &&
                                    "bg-destructive"
                                )}
                              />
                              {t(
                                `status_${s.status}` as Parameters<typeof t>[0]
                              )}
                            </span>
                          </div>

                          {/* Score */}
                          <div className="w-24 text-center">
                            {s.sessionScore !== null ? (
                              <div className="inline-flex items-baseline gap-0.5">
                                <span
                                  className={cn(
                                    "text-lg font-bold",
                                    getScoreColor(s.sessionScore)
                                  )}
                                >
                                  {(s.sessionScore * 20).toFixed(0)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  /100
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-muted-foreground/40 italic">
                                {isInProgress
                                  ? t("pending")
                                  : isStatic
                                    ? "--"
                                    : ""}
                              </span>
                            )}
                          </div>

                          {/* Duration */}
                          <div
                            className={cn(
                              "w-20 text-right text-sm font-medium",
                              isStatic
                                ? "text-muted-foreground/50"
                                : "text-muted-foreground"
                            )}
                          >
                            {s.durationMinutes
                              ? `${s.durationMinutes} min`
                              : "-- min"}
                          </div>

                          {/* Chevron for clickable rows */}
                          <div className="w-10 flex justify-end">
                            {isClickable && (
                              <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                            )}
                          </div>
                        </div>
                      );

                      if (isCompleted)
                        return (
                          <Link key={s.id} href={`/sessions/${s.id}/summary`}>
                            {row}
                          </Link>
                        );
                      if (isInProgress)
                        return (
                          <Link key={s.id} href={`/wizard/${s.id}`}>
                            {row}
                          </Link>
                        );
                      return <div key={s.id}>{row}</div>;
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="mt-16 flex flex-col items-center gap-6">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-10 py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("loading")}
                  </>
                ) : (
                  <>
                    {t("loadMore")}
                    <ChevronDown className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
