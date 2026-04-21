"use client";

import { useTranslations } from "next-intl";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FeedbackCaptureForm } from "./feedback-capture-form";

interface FeedbackCaptureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshotDataUrl: string | null;
  onSubmitSuccess: (id: string) => void;
}

export function FeedbackCaptureSheet({
  open,
  onOpenChange,
  screenshotDataUrl,
  onSubmitSuccess,
}: FeedbackCaptureSheetProps) {
  const t = useTranslations("feedback.capture");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-4 pb-6"
      >
        <SheetHeader className="px-0">
          <SheetTitle>{t("sheetTitle")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        <FeedbackCaptureForm
          screenshotDataUrl={screenshotDataUrl}
          onSubmitSuccess={onSubmitSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
