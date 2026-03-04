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
  const router = useRouter();

  const handleExit = () => {
    router.push(`/sessions/${seriesId}`);
  };

  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const exitButton = (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <X className="h-4 w-4" />
      <span className="sr-only">Exit wizard</span>
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
                <AlertDialogTitle>Exit session wizard?</AlertDialogTitle>
                <AlertDialogDescription>
                  You have unsaved changes. Your progress is auto-saved, but any
                  changes made in the last few seconds may not be saved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continue editing</AlertDialogCancel>
                <AlertDialogAction onClick={handleExit}>
                  Exit anyway
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

      {/* Right: Save status */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {saveStatus === "saving" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <Check className="h-3 w-3 text-green-500" />
            <span>All changes saved</span>
          </>
        )}
        {saveStatus === "error" && (
          <>
            <AlertCircle className="h-3 w-3 text-destructive" />
            <span className="text-destructive">Error saving</span>
          </>
        )}
      </div>
    </div>
  );
}
