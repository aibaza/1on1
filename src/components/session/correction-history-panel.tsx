"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, History, RotateCcw } from "lucide-react";

export interface CorrectionEntry {
  id: string;
  sessionAnswerId: string;
  correctedById: string;
  correctorFirstName: string;
  correctorLastName: string;
  originalAnswerText: string | null;
  originalAnswerNumeric: number | null;
  originalAnswerJson: unknown;
  originalSkipped: boolean;
  correctionReason: string;
  createdAt: string; // ISO string
  questionText: string;
  answerType: string;
  afterAnswerText: string | null;
  afterAnswerNumeric: number | null;
  afterAnswerJson: unknown;
  afterSkipped: boolean;
}

interface CorrectionHistoryPanelProps {
  corrections: CorrectionEntry[];
  isManager: boolean;
  isAdmin: boolean;
  sessionId: string;
}

/** Plain-text representation of an answer value for the history diff display. */
function formatAnswerValue(
  answerType: string,
  text: string | null,
  numeric: number | null,
  _json: unknown,
  skipped: boolean
): string {
  if (skipped) return "Skipped";
  switch (answerType) {
    case "yes_no":
      if (numeric === 1) return "Yes";
      if (numeric === 0) return "No";
      return text ?? "—";
    case "rating":
    case "mood":
    case "numeric":
      return numeric !== null ? String(numeric) : "—";
    case "text":
    case "long_text":
      return text ?? "—";
    default:
      return text ?? (numeric !== null ? String(numeric) : "—");
  }
}

interface RevertState {
  entryId: string;
  status: "confirming" | "loading" | "error";
  errorMessage?: string;
}

export function CorrectionHistoryPanel({
  corrections,
  isManager,
  isAdmin,
  sessionId,
}: CorrectionHistoryPanelProps) {
  const router = useRouter();
  const hasCorrectionHistory = corrections.length > 0;
  const [historyOpen, setHistoryOpen] = useState(hasCorrectionHistory);
  const [revertState, setRevertState] = useState<RevertState | null>(null);

  // Ensure the panel opens if corrections arrive after initial render (streaming hydration).
  // This syncs local UI state from a prop-derived value — cannot be replaced with useMemo
  // because `historyOpen` is independently togglable by the user via the collapsible trigger.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- safe: one-way sync from prop change, not cascading from own render
    if (hasCorrectionHistory) setHistoryOpen(true);
  }, [hasCorrectionHistory]);

  async function handleRevertConfirm(entryId: string) {
    setRevertState({ entryId, status: "loading" });
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/corrections/revert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historyId: entryId }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setRevertState({
          entryId,
          status: "error",
          errorMessage: (body as { error?: string }).error ?? "Revert failed",
        });
        return;
      }
      setRevertState(null);
      router.refresh();
    } catch {
      setRevertState({
        entryId,
        status: "error",
        errorMessage: "Network error — please try again",
      });
    }
  }

  return (
    <div className="mt-6 mb-6">
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-1 py-2 hover:bg-muted/50 transition-colors">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Correction History
            {hasCorrectionHistory && (
              <Badge variant="outline" className="text-xs">
                {corrections.length}
              </Badge>
            )}
          </h2>
          {historyOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3">
            {hasCorrectionHistory ? (
              <div className="space-y-3">
                {corrections.map((entry) => {
                  const date = new Date(entry.createdAt);
                  const dateLabel = date.toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  });

                  const beforeLabel = formatAnswerValue(
                    entry.answerType,
                    entry.originalAnswerText,
                    entry.originalAnswerNumeric,
                    entry.originalAnswerJson,
                    entry.originalSkipped
                  );
                  const afterLabel = formatAnswerValue(
                    entry.answerType,
                    entry.afterAnswerText,
                    entry.afterAnswerNumeric,
                    entry.afterAnswerJson,
                    entry.afterSkipped
                  );

                  const isConfirming =
                    revertState?.entryId === entry.id &&
                    revertState.status === "confirming";
                  const isLoading =
                    revertState?.entryId === entry.id &&
                    revertState.status === "loading";
                  const hasError =
                    revertState?.entryId === entry.id &&
                    revertState.status === "error";

                  return (
                    <div
                      key={entry.id}
                      className="rounded-md border px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium">
                          {entry.correctorFirstName} {entry.correctorLastName}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {dateLabel}
                        </span>
                      </div>

                      {/* Question label */}
                      <p className="text-xs text-muted-foreground mb-2 italic">
                        {entry.questionText}
                      </p>

                      {/* Before / After */}
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <span className="rounded bg-red-50 dark:bg-red-950/30 px-2 py-0.5 text-red-700 dark:text-red-400 line-through">
                          {beforeLabel}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="rounded bg-green-50 dark:bg-green-950/30 px-2 py-0.5 text-green-700 dark:text-green-400">
                          {afterLabel}
                        </span>
                      </div>

                      {isManager && (
                        <p className="text-muted-foreground mt-1">
                          <span className="font-medium text-foreground">
                            Reason:{" "}
                          </span>
                          {entry.correctionReason}
                        </p>
                      )}

                      {/* Revert — admin only */}
                      {isAdmin && (
                        <div className="mt-2">
                          {!isConfirming && !isLoading && !hasError && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 gap-1 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setRevertState({
                                  entryId: entry.id,
                                  status: "confirming",
                                })
                              }
                            >
                              <RotateCcw className="h-3 w-3" />
                              Revert
                            </Button>
                          )}

                          {isConfirming && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                Restore answer to this before-value?
                              </span>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() =>
                                  handleRevertConfirm(entry.id)
                                }
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => setRevertState(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}

                          {isLoading && (
                            <span className="text-xs text-muted-foreground">
                              Reverting…
                            </span>
                          )}

                          {hasError && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-destructive">
                                {revertState.errorMessage}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => setRevertState(null)}
                              >
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No corrections have been made to this session.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
