"use client";

import { useTranslations } from "next-intl";
import { Plus, Minus, Pencil } from "lucide-react";
import type { VersionChange } from "@/lib/templates/version-diff";

interface VersionDiffListProps {
  changes: VersionChange[];
}

export function VersionDiffList({ changes }: VersionDiffListProps) {
  const t = useTranslations("templates");

  if (changes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("history.noChanges")}</p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {changes.map((change, i) => {
        const icon =
          change.type === "added" ? (
            <Plus className="h-3.5 w-3.5" />
          ) : change.type === "removed" ? (
            <Minus className="h-3.5 w-3.5" />
          ) : (
            <Pencil className="h-3.5 w-3.5" />
          );

        const colorClass =
          change.type === "added"
            ? "text-green-600 dark:text-green-400"
            : change.type === "removed"
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400";

        const entityLabel =
          change.entity === "section"
            ? t("history.section")
            : t("history.question");

        return (
          <li key={i} className={`flex items-start gap-2 text-sm ${colorClass}`}>
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span>
              {entityLabel}: &ldquo;{change.name}&rdquo;
              {change.details && (
                <span className="text-muted-foreground"> ({change.details})</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
