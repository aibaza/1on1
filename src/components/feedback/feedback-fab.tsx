"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, MessageCircleWarning } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { captureViewport } from "@/lib/feedback/capture-screenshot";
import { FeedbackCaptureDialog } from "./feedback-capture-dialog";
import { FeedbackCaptureSheet } from "./feedback-capture-sheet";

const MOBILE_QUERY = "(max-width: 767px)";

export function FeedbackFab() {
  const router = useRouter();
  const tFab = useTranslations("feedback.fab");
  const tCapture = useTranslations("feedback.capture");

  const [open, setOpen] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(
    null,
  );
  const [capturing, setCapturing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Track viewport size via matchMedia.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia(MOBILE_QUERY);
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    // Initial value
    handleChange(mql);

    // Modern browsers
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handleChange);
      return () => mql.removeEventListener("change", handleChange);
    }

    // Safari < 14 fallback
    mql.addListener(handleChange);
    return () => mql.removeListener(handleChange);
  }, []);

  const handleClick = useCallback(async () => {
    if (capturing || open) return;
    setCapturing(true);
    try {
      const dataUrl = await captureViewport();
      setScreenshotDataUrl(dataUrl);
    } catch {
      // Screenshot capture failed — still let the user submit feedback.
      setScreenshotDataUrl(null);
      toast.warning(tCapture("screenshotError"));
    } finally {
      setCapturing(false);
      setOpen(true);
    }
  }, [capturing, open, tCapture]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      // Clear captured data when the modal closes so the next open re-captures.
      setScreenshotDataUrl(null);
    }
  }, []);

  const handleSubmitSuccess = useCallback(
    (id: string) => {
      setOpen(false);
      setScreenshotDataUrl(null);
      router.push(`/feedback/mine/${id}`);
    },
    [router],
  );

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 print:hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon-lg"
              onClick={handleClick}
              disabled={capturing}
              aria-label={tFab("label")}
              className="rounded-full shadow-lg"
            >
              {capturing ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <MessageCircleWarning className="size-5" aria-hidden />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{tFab("tooltip")}</TooltipContent>
        </Tooltip>
      </div>

      {isMobile ? (
        <FeedbackCaptureSheet
          open={open}
          onOpenChange={handleOpenChange}
          screenshotDataUrl={screenshotDataUrl}
          onSubmitSuccess={handleSubmitSuccess}
        />
      ) : (
        <FeedbackCaptureDialog
          open={open}
          onOpenChange={handleOpenChange}
          screenshotDataUrl={screenshotDataUrl}
          onSubmitSuccess={handleSubmitSuccess}
        />
      )}
    </>
  );
}
