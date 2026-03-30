"use client";

import { useState, useEffect, useTransition } from "react";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const [currentLocale, setCurrentLocale] = useState("en");

  // Read locale from cookie only on client to avoid hydration mismatch
  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith("NEXT_LOCALE="))
      ?.split("=")[1];
    if (cookie) setCurrentLocale(cookie);
  }, []);

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
