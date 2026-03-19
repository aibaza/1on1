"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VersionDiffList } from "./version-diff-list";
import type { TemplateVersionSnapshot } from "@/lib/templates/snapshot";
import type { VersionChange } from "@/lib/templates/version-diff";

interface VersionPreviewProps {
  snapshot: TemplateVersionSnapshot;
  changes: VersionChange[] | null;
  showDiff: boolean;
  onToggleDiff: () => void;
}

const answerTypeLabels: Record<string, string> = {
  text: "Text",
  rating_1_5: "Rating (1-5)",
  rating_1_10: "Rating (1-10)",
  yes_no: "Yes/No",
  multiple_choice: "Multiple Choice",
  mood: "Mood",
};

export function VersionPreview({
  snapshot,
  changes,
  showDiff,
  onToggleDiff,
}: VersionPreviewProps) {
  const t = useTranslations("templates");

  return (
    <div className="space-y-4">
      {/* Template header */}
      <div>
        <h3 className="text-lg font-semibold">{snapshot.name}</h3>
        {snapshot.description && (
          <p className="text-sm text-muted-foreground">{snapshot.description}</p>
        )}
      </div>

      {/* Diff toggle */}
      {changes !== null && (
        <div>
          <Button variant="ghost" size="sm" onClick={onToggleDiff}>
            {showDiff ? t("history.hideChanges") : t("history.showChanges")}
          </Button>
          {showDiff && (
            <div className="mt-2 rounded-md border p-3 bg-muted/30">
              <VersionDiffList changes={changes} />
            </div>
          )}
        </div>
      )}

      {changes === null && (
        <p className="text-sm text-muted-foreground italic">
          {t("history.noPrevious")}
        </p>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {snapshot.sections.map((section) => (
          <div key={section.id} className="rounded-lg border p-4 space-y-2">
            <h4 className="font-medium">{section.name}</h4>
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}
            {section.questions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No questions</p>
            ) : (
              <ul className="space-y-2">
                {section.questions.map((q) => (
                  <li key={q.id} className="flex items-start gap-2">
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium">
                        {q.questionText}
                        {q.isRequired && (
                          <span className="ml-1 text-destructive">*</span>
                        )}
                      </p>
                      {q.helpText && (
                        <p className="text-xs text-muted-foreground">{q.helpText}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {answerTypeLabels[q.answerType] ?? q.answerType}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
