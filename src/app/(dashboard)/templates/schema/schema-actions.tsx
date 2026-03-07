"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check } from "lucide-react";

interface SchemaActionsProps {
  schemaJson: string;
  copyLabel: string;
  copiedLabel: string;
  downloadLabel: string;
}

/**
 * Client component: copy-to-clipboard and download buttons for the JSON schema block.
 * Receives translated labels as props from the Server Component parent.
 */
export function SchemaActions({
  schemaJson,
  copyLabel,
  copiedLabel,
  downloadLabel,
}: SchemaActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(schemaJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([schemaJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "1on1-template-schema-v1.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleCopy}>
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            {copiedLabel}
          </>
        ) : (
          <>
            <Copy className="mr-2 h-4 w-4" />
            {copyLabel}
          </>
        )}
      </Button>
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Download className="mr-2 h-4 w-4" />
        {downloadLabel}
      </Button>
    </div>
  );
}
