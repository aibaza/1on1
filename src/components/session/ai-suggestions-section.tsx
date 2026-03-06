"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

const AI_POLLING_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Check,
  X,
  Pencil,
  User,
  CheckCircle2,
} from "lucide-react";
import type { AIActionSuggestions } from "@/lib/ai/schemas/action-items";

interface AISuggestionsSectionProps {
  sessionId: string;
  seriesId: string;
  managerId: string;
  reportId: string;
  managerName: string;
  reportName: string;
  isManager: boolean;
}

interface SuggestionsResponse {
  status: string | null;
  suggestions: AIActionSuggestions | null;
}

export function AISuggestionsSection({
  sessionId,
  managerId,
  reportId,
  managerName,
  reportName,
  isManager,
}: AISuggestionsSectionProps) {
  const t = useTranslations("sessions.aiSuggestions");
  const queryClient = useQueryClient();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  // Timeout polling after 2 minutes
  useEffect(() => {
    const timer = setTimeout(() => setPollingTimedOut(true), AI_POLLING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const { data, isLoading } = useQuery<SuggestionsResponse>({
    queryKey: ["ai-suggestions", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/ai-suggestions`);
      if (!res.ok) throw new Error("Failed to fetch AI suggestions");
      return res.json();
    },
    refetchInterval: (query) => {
      if (pollingTimedOut) return false;
      const status = query.state.data?.status;
      if (status === "pending" || status === "generating") return 3000;
      return false;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (params: {
      suggestionIndex: number;
      action: "accept" | "skip";
      edits?: { title?: string; description?: string; assigneeId?: string };
    }) => {
      const res = await fetch(`/api/sessions/${sessionId}/ai-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Failed to process suggestion");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ai-suggestions", sessionId],
      });
      setEditingIndex(null);
    },
  });

  const status = data?.status;
  const suggestions = data?.suggestions?.suggestions;

  // Timed-out state
  if (
    pollingTimedOut &&
    (status === "pending" || status === "generating")
  ) {
    return null; // AI summary section already shows the timeout/retry UI
  }

  // Loading / generating state
  if (isLoading || status === "pending" || status === "generating") {
    return (
      <div className="mb-8 rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="font-medium">{t("title")}</h3>
          <Badge variant="outline" className="text-xs">
            {t("generating")}
          </Badge>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Failed or no suggestions
  if (status === "failed" || !suggestions) {
    return null;
  }

  // All suggestions handled
  if (suggestions.length === 0) {
    return (
      <div className="mb-8 rounded-lg border border-dashed p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <h3 className="font-medium">{t("title")}</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("allHandled")}
        </p>
      </div>
    );
  }

  const startEditing = (index: number) => {
    const suggestion = suggestions[index];
    setEditingIndex(index);
    setEditTitle(suggestion.title);
    setEditDescription(suggestion.description);
    setEditAssigneeId(
      suggestion.suggestedAssignee === "manager" ? managerId : reportId
    );
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditTitle("");
    setEditDescription("");
    setEditAssigneeId("");
  };

  return (
    <div className="mb-8 rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-medium">{t("title")}</h3>
        <Badge variant="outline" className="text-xs">
          {t("remaining", { count: suggestions.length })}
        </Badge>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => {
          const isEditing = editingIndex === index;
          const assigneeName =
            suggestion.suggestedAssignee === "manager"
              ? managerName
              : reportName;

          if (isEditing) {
            return (
              <div
                key={index}
                className="rounded-lg border-2 border-primary/20 bg-muted/30 p-4"
              >
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      {t("labelTitle")}
                    </label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder={t("titlePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      {t("labelDescription")}
                    </label>
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder={t("descriptionPlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">
                      {t("labelAssignee")}
                    </label>
                    <Select
                      value={editAssigneeId}
                      onValueChange={setEditAssigneeId}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={managerId}>
                          {managerName}
                        </SelectItem>
                        <SelectItem value={reportId}>
                          {reportName}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        actionMutation.mutate({
                          suggestionIndex: index,
                          action: "accept",
                          edits: {
                            title: editTitle,
                            description: editDescription,
                            assigneeId: editAssigneeId,
                          },
                        })
                      }
                      disabled={actionMutation.isPending}
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      {t("accept")}
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={index}
              className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{suggestion.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {suggestion.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <User className="h-2.5 w-2.5" />
                      {assigneeName}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-1.5 italic">
                    {suggestion.reasoning}
                  </p>
                </div>

                {isManager && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                      title={t("accept")}
                      onClick={() =>
                        actionMutation.mutate({
                          suggestionIndex: index,
                          action: "accept",
                        })
                      }
                      disabled={actionMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title={t("editAccept")}
                      onClick={() => startEditing(index)}
                      disabled={actionMutation.isPending}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title={t("skip")}
                      onClick={() =>
                        actionMutation.mutate({
                          suggestionIndex: index,
                          action: "skip",
                        })
                      }
                      disabled={actionMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
