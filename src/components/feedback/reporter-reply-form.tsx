"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Lock, RefreshCw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { FeedbackStatus } from "@/lib/validations/feedback";

interface ReporterReplyFormProps {
  feedbackId: string;
  currentStatus: FeedbackStatus;
}

type Action = "reply" | "reopen";

interface SendMessagePayload {
  body: string;
  action: Action;
}

export function ReporterReplyForm({
  feedbackId,
  currentStatus,
}: ReporterReplyFormProps) {
  const t = useTranslations("feedback.mine");
  const tCapture = useTranslations("feedback.capture");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState("");
  const [reopenBody, setReopenBody] = useState("");
  const [reopenOpen, setReopenOpen] = useState(false);

  const sendMessage = useMutation({
    mutationFn: async (payload: SendMessagePayload) => {
      const res = await fetch(`/api/feedback/${feedbackId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = t("errorSending");
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          // ignore JSON parse error
        }
        throw new Error(message);
      }

      return res.json();
    },
    onSuccess: (_data, variables) => {
      if (variables.action === "reply") {
        setReplyBody("");
      } else {
        setReopenBody("");
        setReopenOpen(false);
      }
      queryClient.invalidateQueries({
        queryKey: ["feedback", "mine", feedbackId],
      });
      router.refresh();
      toast.success(
        variables.action === "reopen" ? t("reopenSuccess") : t("sent")
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || t("errorSending"));
    },
  });

  const isResolved = currentStatus === "resolved";
  const isClosed = currentStatus === "closed";
  const pending = sendMessage.isPending;
  const pendingAction = sendMessage.variables?.action;

  if (isClosed) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-background/60 p-3 text-sm text-muted-foreground">
        <Lock className="h-4 w-4 shrink-0" aria-hidden />
        <span>{t("closedNotice")}</span>
      </div>
    );
  }

  if (isResolved) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
          <span>{t("resolvedBanner")}</span>
        </div>
        <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              {t("stillBroken")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("reopenTitle")}</DialogTitle>
              <DialogDescription>
                {t("reopenDescription")}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={reopenBody}
              onChange={(e) => setReopenBody(e.target.value)}
              placeholder={t("reopenBodyPlaceholder")}
              rows={5}
              disabled={pending && pendingAction === "reopen"}
              aria-label={t("replyLabel")}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReopenOpen(false)}
                disabled={pending && pendingAction === "reopen"}
              >
                {tCapture("cancel")}
              </Button>
              <Button
                type="button"
                onClick={() =>
                  sendMessage.mutate({
                    body: reopenBody.trim(),
                    action: "reopen",
                  })
                }
                disabled={
                  reopenBody.trim().length === 0 ||
                  (pending && pendingAction === "reopen")
                }
              >
                {pending && pendingAction === "reopen"
                  ? t("reopening")
                  : t("reopenDialogSubmit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const trimmedReply = replyBody.trim();
  const canSubmitReply = trimmedReply.length > 0 && !pending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmitReply) return;
        sendMessage.mutate({ body: trimmedReply, action: "reply" });
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="reporter-reply" className="sr-only">
        {t("replyLabel")}
      </label>
      <Textarea
        id="reporter-reply"
        value={replyBody}
        onChange={(e) => setReplyBody(e.target.value)}
        placeholder={t("replyPlaceholder")}
        rows={3}
        disabled={pending}
      />
      <div className="flex items-center justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!canSubmitReply}
          className="gap-2"
        >
          {pending && pendingAction === "reply"
            ? t("sending")
            : t("sendReply")}
          {!pending && <Send className="h-3.5 w-3.5" aria-hidden />}
        </Button>
      </div>
    </form>
  );
}
