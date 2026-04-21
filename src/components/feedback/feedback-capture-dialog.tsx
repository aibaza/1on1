"use client";

import { Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackCaptureForm } from "./feedback-capture-form";

interface FeedbackCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshotDataUrl: string | null;
  onSubmitSuccess: (id: string) => void;
}

export function FeedbackCaptureDialog({
  open,
  onOpenChange,
  screenshotDataUrl,
  onSubmitSuccess,
}: FeedbackCaptureDialogProps) {
  const t = useTranslations("feedback.capture");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-5 text-primary" aria-hidden />
            {t("dialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <FeedbackCaptureForm
          screenshotDataUrl={screenshotDataUrl}
          onSubmitSuccess={onSubmitSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
