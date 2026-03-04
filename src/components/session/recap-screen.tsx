"use client";

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

const CATEGORY_LABELS: Record<string, string> = {
  check_in: "Check-in",
  wellbeing: "Wellbeing",
  engagement: "Engagement",
  performance: "Performance",
  career: "Career",
  feedback: "Feedback",
  recognition: "Recognition",
  goals: "Goals",
  custom: "Custom",
};

export function RecapScreen({
  reportName,
  previousSessions,
  openActionItems,
}: RecapScreenProps) {
  const hasPrevious = previousSessions.length > 0;
  const lastSession = hasPrevious ? previousSessions[0] : null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Session Recap
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasPrevious
              ? `Review what happened in your last session with ${reportName}`
              : `This is your first session with ${reportName}`}
          </p>
        </div>

        {!hasPrevious ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-lg font-medium">First Session</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                This is your first 1:1 session with {reportName}. Take this
                opportunity to set the tone and establish expectations.
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
                          Score: {lastSession.sessionScore.toFixed(1)}
                        </Badge>
                      )}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {lastSession.completedAt
                          ? new Date(
                              lastSession.completedAt
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Not completed"}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Shared notes by category */}
                  {lastSession.sharedNotes &&
                    Object.entries(lastSession.sharedNotes).length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Notes</h4>
                        {Object.entries(lastSession.sharedNotes).map(
                          ([category, content]) => (
                            <div
                              key={category}
                              className="rounded-md bg-muted/50 p-3"
                            >
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                {CATEGORY_LABELS[category] ?? category}
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

                  {/* Answers summary */}
                  {lastSession.answers.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium">
                        {lastSession.answers.length} answer
                        {lastSession.answers.length !== 1 ? "s" : ""} recorded
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Answer details are available in the context panel during
                        the session.
                      </p>
                    </div>
                  )}

                  {/* Score trend placeholder */}
                  <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    Score trend sparkline (Plan 03)
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Open action items */}
            {openActionItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Open Action Items
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
                              {item.status.replace("_", " ")}
                            </Badge>
                            {item.dueDate && (
                              <span className="text-xs text-muted-foreground">
                                Due{" "}
                                {new Date(item.dueDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                            )}
                            {item.category && (
                              <span className="text-xs text-muted-foreground">
                                {CATEGORY_LABELS[item.category] ?? item.category}
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
