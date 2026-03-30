"use client";

import { useTransition, useSyncExternalStore } from "react";
import { Globe } from "lucide-react";

function getLocaleFromCookie(): string {
  if (typeof document === "undefined") return "en";
  return (
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("NEXT_LOCALE="))
      ?.split("=")[1] ?? "en"
  );
}

// Cookie doesn't emit change events, so subscribe is a no-op
const subscribe = () => () => {};

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const currentLocale = useSyncExternalStore(subscribe, getLocaleFromCookie, () => "en");

  function switchLocale(locale: string) {
    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${365 * 24 * 60 * 60}`;
      window.location.reload();
    });
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border/50 px-2 py-1">
      <Globe className="h-3.5 w-3.5 text-muted-foreground mr-1" />
      <button
        onClick={() => switchLocale("en")}
        disabled={isPending}
        className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${
          currentLocale === "en"
            ? "bg-primary text-white font-bold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchLocale("ro")}
        disabled={isPending}
        className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${
          currentLocale === "ro"
            ? "bg-primary text-white font-bold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        RO
      </button>
    </div>
  );
}
