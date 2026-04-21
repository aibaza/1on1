"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ScreenshotViewerProps {
  url: string;
  alt?: string;
}

export function ScreenshotViewer({ url, alt }: ScreenshotViewerProps) {
  const tMine = useTranslations("feedback.mine");
  const tCapture = useTranslations("feedback.capture");
  const [open, setOpen] = useState(false);
  const fallbackAlt = tCapture("currentScreen");
  const imageAlt = alt ?? fallbackAlt;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group block overflow-hidden rounded-md border border-border bg-muted transition-colors hover:border-ring focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={tMine("viewFull")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={imageAlt}
            className="max-h-64 w-auto object-contain transition-opacity group-hover:opacity-90"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] p-2 sm:max-w-4xl">
        <DialogTitle className="sr-only">{tMine("screenshot")}</DialogTitle>
        <div className="flex w-full items-center justify-center overflow-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={imageAlt}
            className="h-auto max-h-[85vh] w-auto max-w-full rounded object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
