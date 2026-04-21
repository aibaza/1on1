"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Lock, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AdminReplyFormProps {
  reportId: string;
}

export function AdminReplyForm({ reportId }: AdminReplyFormProps) {
  const t = useTranslations("feedback.admin.reply");
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async (payload: { body: string; isInternal: boolean }) => {
      const res = await fetch(`/api/admin/feedback/${reportId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("error"));
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(isInternal ? t("sentInternal") : t("sent"));
      setBody("");
      queryClient.invalidateQueries({
        queryKey: ["admin-feedback", reportId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-feedback-list"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    sendMessage.mutate({ body: trimmed, isInternal });
  };

  const disabled = sendMessage.isPending || body.trim().length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 transition-colors",
        isInternal ? "border-amber-500/30 bg-amber-500/5" : "border-border"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Label
          htmlFor={`reply-mode-${reportId}`}
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          {isInternal ? (
            <>
              <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-700 dark:text-amber-400">
                {t("internalHint")}
              </span>
            </>
          ) : (
            <span>{t("publicHint")}</span>
          )}
        </Label>
        <div className="flex items-center gap-2">
          <Label
            htmlFor={`reply-mode-${reportId}`}
            className="text-xs text-muted-foreground"
          >
            {t("internalToggle")}
          </Label>
          <Switch
            id={`reply-mode-${reportId}`}
            checked={isInternal}
            onCheckedChange={setIsInternal}
          />
        </div>
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          isInternal ? t("internalPlaceholder") : t("placeholder")
        }
        rows={4}
        maxLength={5000}
        disabled={sendMessage.isPending}
      />
      <div className="flex items-center justify-end">
        <Button type="submit" disabled={disabled} size="sm">
          {sendMessage.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {isInternal ? t("addNote") : t("send")}
        </Button>
      </div>
    </form>
  );
}
