"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TrialBannerProps {
  /** Remaining trial days (0 = expired). Null/undefined = no trial. */
  daysRemaining: number | null;
  isExpired: boolean;
}

export function TrialBanner({ daysRemaining, isExpired }: TrialBannerProps) {
  const t = useTranslations("billing.trial");
  const [dismissed, setDismissed] = useState(false);

  // Nothing to show: no trial, or dismissed by user
  if (daysRemaining === null || dismissed) return null;
  // No trial and not expired — nothing to show
  if (!isExpired && daysRemaining === 0) return null;

  const isActive = !isExpired;

  const bgColor = isExpired
    ? "bg-destructive/10 border-destructive/20 text-destructive"
    : daysRemaining <= 2
      ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200"
      : daysRemaining <= 4
        ? "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/50 dark:border-yellow-800 dark:text-yellow-200"
        : "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/50 dark:border-green-800 dark:text-green-200";

  return (
    <div
      className={cn(
        "relative mb-4 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm",
        bgColor
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {isExpired
            ? t("expired")
            : daysRemaining === 1
              ? t("lastDay")
              : t("daysLeft", { days: daysRemaining })}
        </span>
        {isExpired && (
          <span className="text-muted-foreground text-xs">
            {t("expiredDescription")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/pricing">
            {t("upgradeNow")}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
        {isActive && (
          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
