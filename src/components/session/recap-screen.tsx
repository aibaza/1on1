"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, Circle, Clock } from "lucide-react";

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

interface ActionItem {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  category: string | null;
  assigneeId: string;
  createdAt: string;
}

interface RecapScreenProps {
  reportName: string;
  previousSessions: PreviousSession[];
  openActionItems: ActionItem[];
}

export function RecapScreen({
  reportName,
  previousSessions,
  openActionItems,
}: RecapScreenProps) {
  const t = useTranslations("sessions.recap");
  const format = useFormatter();
  const hasPrevious = previousSessions.length > 0;
  const lastSession = hasPrevious ? previousSessions[0] : null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasPrevious
              ? t("reviewLast", { name: reportName })
              : t("firstSession", { name: reportName })}
          </p>
        </div>

        {!hasPrevious ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-lg font-medium">{t("firstSessionTitle")}</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {t("firstSessionDesc", { name: reportName })}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Last session summary */}
            {lastSession && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Session #{lastSession.sessionNumber}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {lastSession.sessionScore != null && (
                        <Badge variant="secondary">
                          {t("score", { score: lastSession.sessionScore.toFixed(1) })}
                        </Badge>
                      )}
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
                </CardHeader>
                <CardContent className="space-y-4">
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
                                dangerouslySetInnerHTML={{ __html: content }}
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

                  <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    Score trend sparkline (Plan 03)
                  </div>
                </CardContent>
              </Card>
            )}

            {openActionItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("openActionItems")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {openActionItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-2">
                        {item.status === "in_progress" ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{item.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                item.status === "in_progress"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {item.status === "in_progress"
                                ? t("statusInProgress")
                                : t("statusOpen")}
                            </Badge>
                            {item.dueDate && (
                              <span className="text-xs text-muted-foreground">
                                {t("dueDateLabel", {
                                  date: format.dateTime(new Date(item.dueDate), {
                                    month: "short",
                                    day: "numeric",
                                  }),
                                })}
                              </span>
                            )}
                            {item.category && (
                              <span className="text-xs text-muted-foreground">
                                {item.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
