"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();

  function switchLocale(locale: string) {
    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${365 * 24 * 60 * 60}`;
      window.location.reload();
    });
  }

  // Read current locale from cookie
  const currentLocale =
    (typeof document !== "undefined" &&
      document.cookie
        .split("; ")
        .find((c) => c.startsWith("NEXT_LOCALE="))
        ?.split("=")[1]) ||
    "en";

  return (
    <div className="flex items-center gap-1.5">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <button
        onClick={() => switchLocale("en")}
        disabled={isPending}
        className={`text-xs font-medium transition-colors ${
          currentLocale === "en"
            ? "text-foreground font-bold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <span className="text-muted-foreground text-xs">/</span>
      <button
        onClick={() => switchLocale("ro")}
        disabled={isPending}
        className={`text-xs font-medium transition-colors ${
          currentLocale === "ro"
            ? "text-foreground font-bold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        RO
      </button>
    </div>
  );
}
