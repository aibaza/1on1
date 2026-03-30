"use client";

import { useTranslations } from "next-intl";
import { Sparkles, Check, Pencil, X, User } from "lucide-react";

/**
 * Static replica of AISuggestionsSection for landing page showcase.
 * Full-width text layout with compact action buttons below.
 */
export function ShowcaseAI() {
  const t = useTranslations("landing.showcase.ai");

  return (
    <div className="bg-card p-6 rounded-3xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/5 flex flex-col">
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

        {/* Suggestion 1 — full width text, buttons below */}
        <div className="rounded-lg border border-[var(--editorial-outline-variant,var(--border))]/50 p-4 hover:bg-muted/30 transition-colors">
          <p className="font-medium text-sm">{t("suggestion1Title")}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{t("suggestion1Desc")}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
              <User className="h-2.5 w-2.5" />
              {t("suggestion1Assignee")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1.5 italic">{t("suggestion1Reasoning")}</p>
          {/* Action buttons — compact row below content */}
          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-[var(--editorial-outline-variant,var(--border))]/30">
            <button className="h-7 px-2.5 flex items-center gap-1 rounded-md text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors cursor-pointer">
              <Check className="h-3.5 w-3.5" />
              <span>Accept</span>
            </button>
            <button className="h-7 px-2.5 flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
              <Pencil className="h-3 w-3" />
              <span>Edit</span>
            </button>
            <button className="h-7 px-2.5 flex items-center gap-1 rounded-md text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer">
              <X className="h-3.5 w-3.5" />
              <span>Skip</span>
            </button>
          </div>
        </div>

        {/* Suggestion 2 */}
        <div className="rounded-lg border border-[var(--editorial-outline-variant,var(--border))]/50 p-4 hover:bg-muted/30 transition-colors">
          <p className="font-medium text-sm">{t("suggestion2Title")}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{t("suggestion2Desc")}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
              <User className="h-2.5 w-2.5" />
              {t("suggestion2Assignee")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1.5 italic">{t("suggestion2Reasoning")}</p>
          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-[var(--editorial-outline-variant,var(--border))]/30">
            <button className="h-7 px-2.5 flex items-center gap-1 rounded-md text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors cursor-pointer">
              <Check className="h-3.5 w-3.5" />
              <span>Accept</span>
            </button>
            <button className="h-7 px-2.5 flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
              <Pencil className="h-3 w-3" />
              <span>Edit</span>
            </button>
            <button className="h-7 px-2.5 flex items-center gap-1 rounded-md text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer">
              <X className="h-3.5 w-3.5" />
              <span>Skip</span>
            </button>
          </div>
        </div>
      </div>

      <div className="text-center mt-auto">
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
