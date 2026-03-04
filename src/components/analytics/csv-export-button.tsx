"use client";

import { useState, useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { PeriodValue } from "@/components/analytics/period-selector";
import { cn } from "@/lib/utils";

interface CsvExportButtonProps {
  type: string;
  userId?: string;
  teamId?: string;
  period: PeriodValue;
  label?: string;
  /** "icon" for subtle per-chart button, "full" for prominent export-all */
  variant?: "icon" | "full";
  className?: string;
}

export function CsvExportButton({
  type,
  userId,
  teamId,
  period,
  label,
  variant = "icon",
  className,
}: CsvExportButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleExport = useCallback(async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ type });
      if (userId) params.set("userId", userId);
      if (teamId) params.set("teamId", teamId);

      if (period.preset === "custom") {
        params.set("startDate", period.startDate.toISOString().split("T")[0]!);
        params.set("endDate", period.endDate.toISOString().split("T")[0]!);
      } else {
        params.set("period", period.preset);
      }

      const res = await fetch(`/api/analytics/export?${params}`);
      if (!res.ok) {
        throw new Error(res.statusText);
      }

      // Get filename from Content-Disposition or generate one
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `1on1-analytics-${type}.csv`;

      // Trigger browser download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export downloaded");
    } catch (error) {
      console.error("[csv-export] Error:", error);
      toast.error("Failed to export data");
    } finally {
      setDownloading(false);
    }
  }, [type, userId, teamId, period]);

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 text-muted-foreground", className)}
        onClick={handleExport}
        disabled={downloading}
        title={label ?? "Export CSV"}
      >
        {downloading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={handleExport}
      disabled={downloading}
    >
      {downloading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {label ?? "Export All Data"}
    </Button>
  );
}
