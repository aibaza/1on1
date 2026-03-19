"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { formatDistanceToNow } from "date-fns";
import { History, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VersionPreview } from "./version-preview";
import { computeVersionDiff } from "@/lib/templates/version-diff";
import type { TemplateVersionSnapshot } from "@/lib/templates/snapshot";

interface VersionListItem {
  versionNumber: number;
  createdAt: string;
  createdByName: string;
  questionCount: number;
}

interface VersionDetail {
  versionNumber: number;
  createdAt: string;
  createdByName: string;
  snapshot: TemplateVersionSnapshot;
}

interface VersionHistoryTabProps {
  templateId: string;
}

export function VersionHistoryTab({ templateId }: VersionHistoryTabProps) {
  const t = useTranslations("templates");
  const { showApiError } = useApiErrorToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  // Fetch version list
  const { data, isLoading } = useQuery({
    queryKey: ["template-versions", templateId],
    queryFn: async () => {
      const res = await fetch(`/api/templates/${templateId}/versions`);
      if (!res.ok) throw new Error("Failed to fetch versions");
      return res.json() as Promise<{ versions: VersionListItem[] }>;
    },
  });

  // Fetch selected version detail
  const { data: versionDetail } = useQuery<VersionDetail>({
    queryKey: ["template-version", templateId, selectedVersion],
    queryFn: async () => {
      const res = await fetch(
        `/api/templates/${templateId}/versions/${selectedVersion}`
      );
      if (!res.ok) throw new Error("Failed to fetch version");
      return res.json();
    },
    enabled: selectedVersion !== null,
  });

  // Fetch previous version detail for diff (when showDiff is true and selectedVersion > 1)
  const { data: prevVersionDetail } = useQuery<VersionDetail>({
    queryKey: ["template-version-prev", templateId, selectedVersion ? selectedVersion - 1 : null],
    queryFn: async () => {
      const res = await fetch(
        `/api/templates/${templateId}/versions/${selectedVersion! - 1}`
      );
      if (!res.ok) throw new Error("Failed to fetch previous version");
      return res.json();
    },
    enabled: showDiff && selectedVersion !== null && selectedVersion > 1,
  });

  // Compute diff
  const changes =
    versionDetail && prevVersionDetail
      ? computeVersionDiff(prevVersionDetail.snapshot, versionDetail.snapshot)
      : versionDetail && selectedVersion === 1
        ? null // First version, no previous to diff against
        : showDiff && versionDetail && selectedVersion && selectedVersion > 1 && !prevVersionDetail
          ? [] // Loading previous version
          : null;

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (vNum: number) => {
      const res = await fetch(
        `/api/templates/${templateId}/versions/${vNum}/restore`,
        { method: "POST" }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to restore");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({
        queryKey: ["template-versions", templateId],
      });
      toast.success(t("history.restoreSuccess"));
      router.refresh();
    },
    onError: (error) => showApiError(error),
  });

  const versions = data?.versions ?? [];
  const latestVersion = versions.length > 0 ? versions[0]?.versionNumber : null;
  const isLatestSelected = selectedVersion === latestVersion;

  // Empty state
  if (!isLoading && versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold">{t("history.emptyTitle")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("history.emptyDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("history.title")}</h2>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Left: Version list */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {versions.map((v) => {
            const isSelected = selectedVersion === v.versionNumber;
            return (
              <button
                key={v.versionNumber}
                type="button"
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  isSelected
                    ? "border-primary bg-accent"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => {
                  setSelectedVersion(v.versionNumber);
                  setShowDiff(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">v{v.versionNumber}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("history.questionCount", { count: v.questionCount })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}</span>
                  <span>&middot;</span>
                  <span>{v.createdByName}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Preview or placeholder */}
        <div className="min-h-[200px]">
          {selectedVersion && versionDetail ? (
            <div className="space-y-4">
              {/* Restore button - only visible for non-latest versions */}
              {!isLatestSelected && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRestoreDialogOpen(true)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t("history.restoreButton")}
                  </Button>
                </div>
              )}
              <VersionPreview
                snapshot={versionDetail.snapshot}
                changes={changes}
                showDiff={showDiff}
                onToggleDiff={() => setShowDiff(!showDiff)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              {t("history.selectVersion")}
            </div>
          )}
        </div>
      </div>

      {/* Restore confirmation dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("history.restoreTitle", { number: selectedVersion ?? 0 })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("history.restoreDescription", { number: selectedVersion ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("history.restoreCancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedVersion) {
                  restoreMutation.mutate(selectedVersion);
                  setRestoreDialogOpen(false);
                }
              }}
            >
              {t("history.restoreConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
