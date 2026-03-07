"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ExportButtonProps {
  templateId: string;
  /** "icon" for compact card menu, "full" for toolbar with label */
  variant?: "icon" | "full";
  className?: string;
}

export function ExportButton({ templateId, variant = "full", className }: ExportButtonProps) {
  const t = useTranslations("templates");
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/templates/${templateId}/export`);
      if (!res.ok) throw new Error(res.statusText);

      // Extract filename from Content-Disposition header (set by the API route)
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `template-${templateId}.json`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t("export.downloaded"));
    } catch (error) {
      console.error("[template-export] Error:", error);
      toast.error(t("export.failed"));
    } finally {
      setExporting(false);
    }
  }, [templateId, t]);

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={className}
        onClick={handleExport}
        disabled={exporting}
        title={t("export.button")}
      >
        {exporting ? (
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
      disabled={exporting}
    >
      {exporting ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {exporting ? t("export.exporting") : t("export.button")}
    </Button>
  );
}
