"use client";

import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveStatusProps {
  status: "saved" | "saving" | "error";
}

/**
 * Small status indicator component for the wizard top bar.
 * Shows the current save state with icon and label.
 */
export function SaveStatus({ status }: SaveStatusProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-opacity duration-200",
        status === "error" ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span>All changes saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3" />
          <span>Error saving</span>
        </>
      )}
    </div>
  );
}
