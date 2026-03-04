"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Lock,
  TrendingUp,
  Lightbulb,
  ListChecks,
} from "lucide-react";
import type { AISummary } from "@/lib/ai/schemas/summary";
import type { AIManagerAddendum } from "@/lib/ai/schemas/addendum";

interface AISummarySectionProps {
  sessionId: string;
  isManager: boolean;
  initialStatus: string | null;
  initialSummary: AISummary | null;
  initialAddendum: AIManagerAddendum | null;
}

interface AISummaryResponse {
  status: string | null;
  summary: AISummary | null;
  addendum: AIManagerAddendum | null;
  completedAt: string | null;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  neutral: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  mixed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  concerning: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function AISummarySection({
  sessionId,
  isManager,
  initialStatus,
  initialSummary,
  initialAddendum,
}: AISummarySectionProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AISummaryResponse>({
    queryKey: ["ai-summary", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/ai-summary`);
      if (!res.ok) throw new Error("Failed to fetch AI summary");
      return res.json();
    },
    initialData: {
      status: initialStatus,
      summary: initialSummary,
      addendum: initialAddendum,
      completedAt: null,
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll every 3s while pending or generating
      if (status === "pending" || status === "generating") return 3000;
      return false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/ai-retry`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to retry AI pipeline");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-summary", sessionId] });
    },
  });

  const status = data?.status;
  const summary = data?.summary;
  const addendum = data?.addendum;

  // Loading / generating state
  if (
    isLoading ||
    status === "pending" ||
    status === "generating"
  ) {
    return (
      <div className="mb-8 rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="font-medium">AI Summary</h3>
          <Badge variant="outline" className="text-xs">
            Generating...
          </Badge>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  // Failed state
  if (status === "failed") {
    return (
      <div className="mb-8 rounded-lg border border-dashed p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="font-medium">AI Summary</h3>
          </div>
          {isManager && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${retryMutation.isPending ? "animate-spin" : ""}`}
              />
              {retryMutation.isPending ? "Retrying..." : "Retry"}
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          AI summary generation failed. {isManager ? "Click retry to try again." : "The manager can retry generation."}
        </p>
      </div>
    );
  }

  // No summary available (null status or no data)
  if (!summary) {
    return null;
  }

  // Completed state: render full summary
  return (
    <div className="mb-8 space-y-4">
      {/* Shared Summary */}
      <div className="rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-medium">AI Summary</h3>
          <Badge
            className={`text-xs ${SENTIMENT_COLORS[summary.overallSentiment] ?? ""}`}
          >
            {summary.overallSentiment}
          </Badge>
        </div>

        {/* Key Takeaways */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Key Takeaways</h4>
          </div>
          <ul className="space-y-1 pl-5">
            {summary.keyTakeaways.map((takeaway, i) => (
              <li key={i} className="text-sm text-muted-foreground list-disc">
                {takeaway}
              </li>
            ))}
          </ul>
        </div>

        {/* Discussion Highlights */}
        {summary.discussionHighlights.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Discussion Highlights</h4>
            </div>
            <div className="space-y-3">
              {summary.discussionHighlights.map((highlight, i) => (
                <div key={i}>
                  <p className="text-sm font-medium">{highlight.category}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {highlight.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-Up Items */}
        {summary.followUpItems.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Follow-Up Items</h4>
            </div>
            <ul className="space-y-1 pl-5">
              {summary.followUpItems.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-muted-foreground list-disc"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Manager Addendum (manager-only) */}
      {isManager && addendum && (
        <div className="rounded-lg border border-dashed p-6 bg-muted/10">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Manager Addendum</h3>
            <Badge variant="outline" className="text-xs gap-1">
              <Lock className="h-2.5 w-2.5" />
              Manager Only
            </Badge>
          </div>

          {/* Sentiment Analysis */}
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-1">Sentiment Analysis</h4>
            <p className="text-sm text-muted-foreground">
              {addendum.sentimentAnalysis}
            </p>
          </div>

          {/* Patterns */}
          {addendum.patterns.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium mb-1">Patterns</h4>
              <ul className="space-y-1 pl-5">
                {addendum.patterns.map((pattern, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground list-disc"
                  >
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coaching Suggestions */}
          {addendum.coachingSuggestions.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium mb-1">
                Coaching Suggestions
              </h4>
              <ul className="space-y-1 pl-5">
                {addendum.coachingSuggestions.map((suggestion, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground list-disc"
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-Up Priority */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Follow-Up Priority:</span>
            <Badge
              className={`text-xs ${PRIORITY_COLORS[addendum.followUpPriority] ?? ""}`}
            >
              {addendum.followUpPriority}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
