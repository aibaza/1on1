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
  reportName: string;
  sessionNumber: number;
  date: string;
  saveStatus: SaveStatus;
  hasUnsavedChanges: boolean;
}

export function WizardTopBar({
  seriesId,
  reportName,
  sessionNumber,
  date,
  saveStatus,
  hasUnsavedChanges,
}: WizardTopBarProps) {
  const t = useTranslations("sessions");
  const format = useFormatter();
  const router = useRouter();

  const handleExit = () => {
    router.push(`/sessions/${seriesId}`);
  };

  const formattedDate = format.dateTime(new Date(date), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const exitButton = (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <X className="h-4 w-4" />
      <span className="sr-only">{t("wizard.exitWizard")}</span>
    </Button>
  );

  return (
    <div className="flex h-14 items-center justify-between border-b px-4">
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
        <p className="text-sm font-medium">{reportName}</p>
        <p className="text-xs text-muted-foreground">
          Session #{sessionNumber} &middot; {formattedDate}
        </p>
      </div>

      {/* Right: Save status + Theme toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {saveStatus === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{t("wizard.saving")}</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span>{t("wizard.saved")}</span>
            </>
          )}
          {saveStatus === "error" && (
            <>
              <AlertCircle className="h-3 w-3 text-destructive" />
              <span className="text-destructive">{t("wizard.errorSaving")}</span>
            </>
          )}
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
