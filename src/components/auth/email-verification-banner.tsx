"use client";

import { useState } from "react";
import { resendVerificationEmailAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleResend() {
    setStatus("sending");
    const result = await resendVerificationEmailAction();
    setStatus(result.success ? "sent" : "error");
  }

  return (
    <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
      <div className="flex items-center justify-between gap-4">
        <p>
          Please verify your email address. Check your inbox for a verification link.
        </p>
        {status === "sent" ? (
          <span className="shrink-0 text-xs">Sent!</span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={status === "sending"}
            className="shrink-0 border-yellow-300 bg-transparent text-yellow-800 hover:bg-yellow-100 dark:border-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-900"
          >
            {status === "sending" ? "Sending..." : status === "error" ? "Retry" : "Resend"}
          </Button>
        )}
      </div>
    </div>
  );
}
