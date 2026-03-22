"use client";

import { X, Check, Loader2, AlertCircle } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
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

  return (
    <header className="flex h-16 items-center justify-between px-6 bg-[var(--background)]/80 backdrop-blur-xl shadow-sm">
      {/* Left: Avatar + Report info + Save status */}
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-xs font-bold bg-[var(--editorial-secondary-container,var(--accent))] text-[var(--editorial-on-secondary-container,var(--accent-foreground))]">
            {getInitials(reportName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-lg font-bold font-headline text-foreground leading-tight">{reportName}</h1>
          <p className="text-xs text-muted-foreground font-medium">
            {t("wizard.sessionDate", { date: formattedDate })}
          </p>
        </div>

        {/* Save status pill */}
        <div className="ml-4">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("wizard.saving")}
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-[var(--color-success)] bg-[var(--color-success)]/10">
              <Check className="h-3 w-3" />
              {t("wizard.saved")}
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-destructive bg-destructive/10">
              <AlertCircle className="h-3 w-3" />
              {t("wizard.errorSaving")}
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="h-6 w-px bg-border mx-1" />
        {hasUnsavedChanges ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-muted text-foreground hover:bg-accent transition-colors"
              >
                {t("wizard.exitWizard")}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("wizard.exitTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("wizard.exitDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("wizard.continueEditing")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleExit}>{t("wizard.exitAnyway")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <button
            type="button"
            onClick={handleExit}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-muted text-foreground hover:bg-accent transition-colors"
          >
            {t("wizard.exitWizard")}
          </button>
        )}
      </div>
    </header>
  );
}
