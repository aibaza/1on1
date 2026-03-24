"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { resendVerificationEmailAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";

export function EmailVerificationBanner() {
  const t = useTranslations("auth");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleResend() {
    setStatus("sending");
    const result = await resendVerificationEmailAction();
    setStatus(result.success ? "sent" : "error");
  }

  return (
    <InlineAlert variant="warning" className="mb-6">
      <div className="flex items-center justify-between gap-4 w-full">
        <p>{t("verificationBanner.message")}</p>
        {status === "sent" ? (
          <span className="shrink-0 text-xs font-medium">{t("verificationBanner.sent")}</span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={status === "sending"}
            className="shrink-0 border-amber-300 bg-transparent text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
          >
            {status === "sending"
              ? t("verificationBanner.sending")
              : status === "error"
                ? t("verificationBanner.retry")
                : t("verificationBanner.resend")}
          </Button>
        )}
      </div>
    </InlineAlert>
  );
}
