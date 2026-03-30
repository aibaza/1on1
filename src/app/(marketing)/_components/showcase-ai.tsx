"use client";

import { useTranslations } from "next-intl";
import { Sparkles, Check, Pencil, X, User } from "lucide-react";

/**
 * Static replica of AISuggestionsSection for landing page showcase.
 * Uses exact same card structure and icon buttons as the real component.
 */
export function ShowcaseAI() {
  const t = useTranslations("landing.showcase.ai");

  return (
    <div className="bg-card p-6 rounded-3xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/5">
      {/* Suggestions */}
      <div className="mb-6 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">AI</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary">
            2
          </span>
        </div>

        {/* Suggestion 1 */}
        <div className="rounded-lg border border-[var(--editorial-outline-variant,var(--border))]/50 p-4 transition-colors hover:bg-muted/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{t("suggestion1Title")}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{t("suggestion1Desc")}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                  <User className="h-2.5 w-2.5" />
                  {t("suggestion1Assignee")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-1.5 italic">{t("suggestion1Reasoning")}</p>
            </div>
            {/* Action buttons — matching real component */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="h-8 w-8 flex items-center justify-center rounded-md text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30">
                <Check className="h-4 w-4" />
              </span>
              <span className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </span>
              <span className="h-8 w-8 flex items-center justify-center rounded-md text-red-500">
                <X className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>

        {/* Suggestion 2 */}
        <div className="rounded-lg border border-[var(--editorial-outline-variant,var(--border))]/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{t("suggestion2Title")}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{t("suggestion2Desc")}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                  <User className="h-2.5 w-2.5" />
                  {t("suggestion2Assignee")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-1.5 italic">{t("suggestion2Reasoning")}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="h-8 w-8 flex items-center justify-center rounded-md text-green-600">
                <Check className="h-4 w-4" />
              </span>
              <span className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </span>
              <span className="h-8 w-8 flex items-center justify-center rounded-md text-red-500">
                <X className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <h3 className="font-[family-name:var(--font-manrope)] text-2xl font-bold mb-3">
          {t("title")}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t("description")}
        </p>
      </div>
    </div>
  );
}
