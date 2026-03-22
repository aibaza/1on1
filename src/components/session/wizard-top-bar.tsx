"use client";

import { X, Check, Loader2, AlertCircle } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslations, useFormatter } from "next-intl";

export type SaveStatus = "saved" | "saving" | "error";

interface WizardTopBarProps {
  seriesId: string;
  sessionId: string;
  reportName: string;
  sessionNumber: number;
  date: string;
  templateName?: string | null;
  saveStatus: SaveStatus;
  hasUnsavedChanges: boolean;
  hasAnswers: boolean;
}

export function WizardTopBar({
  seriesId,
  sessionId,
  reportName,
  sessionNumber,
  date,
  templateName,
  saveStatus,
  hasUnsavedChanges,
  hasAnswers,
}: WizardTopBarProps) {
  const t = useTranslations("sessions");
  const format = useFormatter();
  const router = useRouter();

  const handleExit = () => {
    if (!hasAnswers) {
      fetch(`/api/sessions/${sessionId}/revert`, { method: "POST" }).catch(() => {});
    }
    router.push(`/sessions/${seriesId}`);
  };

  const formattedDate = format.dateTime(new Date(date), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const exitButton = (
    <button
      type="button"
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--editorial-surface-container,var(--muted))] transition-all"
      aria-label={t("wizard.exitWizard")}
    >
      <X className="h-4 w-4" />
    </button>
  );

  return (
    <div className="flex h-16 items-center justify-between px-6 bg-[var(--background)]/80 backdrop-blur-xl shadow-sm">
      {/* Left: Exit button */}
      <div className="flex items-center">
        {hasUnsavedChanges ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>{exitButton}</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("wizard.exitTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("wizard.exitDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("wizard.continueEditing")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleExit}>
                  {t("wizard.exitAnyway")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div onClick={handleExit}>{exitButton}</div>
        )}
      </div>

      {/* Center: Session info */}
      <div className="text-center">
        <p className="text-sm font-bold font-headline text-foreground">{reportName}</p>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          Session #{sessionNumber} &middot; {formattedDate}
          {templateName && <> &middot; {templateName}</>}
        </p>
      </div>

      {/* Right: Save status + Theme toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("wizard.saving")}
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-[var(--color-success)]">
              <Check className="h-3 w-3" />
              {t("wizard.saved")}
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1.5 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {t("wizard.errorSaving")}
            </span>
          )}
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
