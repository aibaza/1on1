"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  User,
} from "lucide-react";

// --- Types ---

interface SessionSearchResult {
  sessionId: string;
  sessionNumber: number;
  snippet: string;
  seriesId: string;
  reportName: string;
  scheduledAt: string;
}

interface ActionItemSearchResult {
  id: string;
  title: string;
  snippet: string;
  status: string;
  sessionId: string;
  seriesId: string;
}

interface TemplateSearchResult {
  id: string;
  name: string;
  snippet: string;
}

interface PeopleSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
}

interface SearchResults {
  sessions: SessionSearchResult[];
  actionItems: ActionItemSearchResult[];
  templates: TemplateSearchResult[];
  people: PeopleSearchResult[];
}

// --- Component ---

export function CommandPalette() {
  const t = useTranslations("search");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Register Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Clear state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      setIsLoading(false);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }
  }, [open]);

  // Debounced search on query change
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=5`
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data.results);
      } catch (err) {
        console.error("Search error:", err);
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  // Navigate to a result and close the dialog
  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  const hasResults =
    results &&
    (results.sessions.length > 0 ||
      results.actionItems.length > 0 ||
      results.templates.length > 0 ||
      results.people.length > 0);

  const statusVariant: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    open: "outline",
    in_progress: "secondary",
    completed: "default",
  };

  if (!mounted) return null;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("title")}
      description={t("description")}
      showCloseButton={false}
      shouldFilter={false}
    >
      <CommandInput
        placeholder={t("placeholder")}
        value={query}
        onValueChange={handleQueryChange}
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("searching")}
          </div>
        )}

        {!isLoading && query.trim() && !hasResults && (
          <CommandEmpty>
            {t("noResults", { query: query.trim() })}
          </CommandEmpty>
        )}

        {!isLoading && results && results.sessions.length > 0 && (
          <CommandGroup heading={t("sessions")}>
            {results.sessions.map((s) => (
              <CommandItem
                key={s.sessionId}
                value={`session-${s.sessionId}-${s.reportName}-${s.snippet}`}
                onSelect={() =>
                  handleSelect(`/sessions/${s.sessionId}/summary`)
                }
              >
                <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      #{s.sessionNumber}
                    </span>
                    <span className="text-muted-foreground">
                      {s.reportName}
                    </span>
                  </div>
                  <p
                    className="truncate text-xs text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: s.snippet }}
                  />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!isLoading &&
          results &&
          results.sessions.length > 0 &&
          results.actionItems.length > 0 && <CommandSeparator />}

        {!isLoading && results && results.actionItems.length > 0 && (
          <CommandGroup heading={t("actionItems")}>
            {results.actionItems.map((item) => (
              <CommandItem
                key={item.id}
                value={`action-${item.id}-${item.title}`}
                onSelect={() => handleSelect("/action-items")}
              >
                <CheckCircle2 className="mr-2 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {item.title}
                    </span>
                    <Badge
                      variant={statusVariant[item.status] ?? "outline"}
                      className="shrink-0 text-xs"
                    >
                      {item.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p
                    className="truncate text-xs text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: item.snippet }}
                  />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!isLoading &&
          results &&
          (results.sessions.length > 0 || results.actionItems.length > 0) &&
          results.templates.length > 0 && <CommandSeparator />}

        {!isLoading && results && results.templates.length > 0 && (
          <CommandGroup heading={t("templates")}>
            {results.templates.map((t) => (
              <CommandItem
                key={t.id}
                value={`template-${t.id}-${t.name}`}
                onSelect={() => handleSelect(`/templates/${t.id}`)}
              >
                <FileText className="mr-2 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{t.name}</span>
                  {t.snippet && (
                    <p className="truncate text-xs text-muted-foreground">
                      {t.snippet}
                    </p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!isLoading &&
          results &&
          (results.sessions.length > 0 ||
            results.actionItems.length > 0 ||
            results.templates.length > 0) &&
          results.people.length > 0 && <CommandSeparator />}

        {!isLoading && results && results.people.length > 0 && (
          <CommandGroup heading={t("people")}>
            {results.people.map((p) => (
              <CommandItem
                key={p.id}
                value={`person-${p.id}-${p.firstName}-${p.lastName}`}
                onSelect={() => handleSelect(`/people/${p.id}`)}
              >
                <User className="mr-2 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {p.jobTitle ?? p.email}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Trigger button for the command palette.
 * Shows in the header with keyboard shortcut hint.
 */
export function SearchTrigger() {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);

  // Sync with command palette open state via keyboard event dispatch
  const handleClick = useCallback(() => {
    // Dispatch a synthetic Cmd+K event to toggle the command palette
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      })
    );
  }, []);

  return (
    <button
      onClick={handleClick}
      className="inline-flex h-8 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <span className="hidden sm:inline">{t("trigger")}</span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">&#8984;</span>K
      </kbd>
    </button>
  );
}
