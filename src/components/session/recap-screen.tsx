"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { contentToHtml } from "@/lib/session/tiptap-render";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import { Calendar, Clock } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import {
  ActionItemPersonGroup,
  type ActionItemEntry,
} from "./action-item-list";

interface PreviousSession {
  id: string;
  sessionNumber: number;
  scheduledAt: string;
  completedAt: string | null;
  sessionScore: number | null;
  sharedNotes: Record<string, string> | null;
  answers: Array<{
    questionId: string;
    answerText: string | null;
    answerNumeric: number | null;
    answerJson: unknown;
    skipped: boolean;
  }>;
}

interface RecapScreenProps {
  reportName: string;
  managerName: string;
  managerId: string;
  reportId: string;
  previousSessions: PreviousSession[];
  openActionItems: ActionItemEntry[];
  currentUserId?: string;
  onToggleActionItem?: (actionItemId: string, currentStatus: string) => void;
}

export function RecapScreen({
  reportName,
  managerName,
  managerId,
  reportId,
  previousSessions,
  openActionItems,
  currentUserId,
  onToggleActionItem,
}: RecapScreenProps) {
  const t = useTranslations("sessions.recap");
  const format = useFormatter();
  const hasPrevious = previousSessions.length > 0;
  const lastSession = hasPrevious ? previousSessions[0] : null;

  // Split items by person
  const reportItems = useMemo(
    () => openActionItems.filter((ai) => ai.assigneeId === reportId),
    [openActionItems, reportId]
  );
  const managerItems = useMemo(
    () => openActionItems.filter((ai) => ai.assigneeId === managerId),
    [openActionItems, managerId]
  );

  return (
    <div>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold tracking-tight font-headline">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasPrevious
              ? t("reviewLast", { name: reportName })
              : t("firstSession", { name: reportName })}
          </p>
        </div>

        {!hasPrevious ? (
          <div className="bg-card rounded-2xl border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col items-center py-12 text-center px-6">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-lg font-bold font-headline">{t("firstSessionTitle")}</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {t("firstSessionDesc", { name: reportName })}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Last session summary */}
            {lastSession && (
              <div className="bg-card rounded-2xl border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <div className="px-6 pt-6 pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold font-headline">
                      Session #{lastSession.sessionNumber}
                    </h3>
                    <div className="flex items-center gap-2">
                      <StarRating score={lastSession.sessionScore} size="sm" />
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {lastSession.completedAt
                          ? format.dateTime(new Date(lastSession.completedAt), {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : t("notCompleted")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6 space-y-4">
                  {lastSession.sharedNotes &&
                    Object.entries(lastSession.sharedNotes).length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">{t("notes")}</h4>
                        {Object.entries(lastSession.sharedNotes).map(
                          ([category, content]) => (
                            <div
                              key={category}
                              className="rounded-md bg-muted/50 p-3"
                            >
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                {category}
                              </p>
                              <div
                                className="prose prose-sm max-w-none dark:prose-invert"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentToHtml(content)) }}
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}

                  {lastSession.answers.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">
                        {t("answersRecorded", { count: lastSession.answers.length })}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {t("answersAvailable")}
                      </p>
                    </div>
                  )}

                </div>
              </div>
            )}

            {openActionItems.length > 0 && (
              <div className="bg-card rounded-2xl border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <div className="px-5 pt-5 pb-2">
                  <h3 className="text-base font-bold font-headline">
                    {t("openActionItems")}
                  </h3>
                </div>
                <div className="px-5 pb-4">
                  {reportItems.length > 0 && (
                    <ActionItemPersonGroup
                      name={reportName}
                      items={reportItems}
                      showSessionGroups
                      currentUserId={currentUserId}
                      onToggle={onToggleActionItem}
                    />
                  )}
                  {managerItems.length > 0 && (
                    <ActionItemPersonGroup
                      name={managerName}
                      items={managerItems}
                      showSessionGroups
                      currentUserId={currentUserId}
                      onToggle={onToggleActionItem}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
