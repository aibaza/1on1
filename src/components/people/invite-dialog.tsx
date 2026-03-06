"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";

// Client-side form schema: emails as raw string, role selection
const inviteFormSchema = z.object({
  emails: z.string().min(1, "Enter at least one email address"),
  role: z.enum(["admin", "manager", "member"]),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteDialog({
  open,
  onOpenChange,
  onSuccess,
}: InviteDialogProps) {
  const t = useTranslations("people");
  const { showApiError } = useApiErrorToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      emails: "",
      role: "member",
    },
  });

  async function onSubmit(values: InviteFormValues) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: values.emails,
          role: values.role,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        showApiError(new Error(data.error || "Failed to send invites"));
        return;
      }

      const data = await response.json();

      if (data.sent > 0) {
        toast.success(t("invite.success", { count: data.sent }));
      }

      if (data.skipped?.length > 0) {
        const skippedMessages = data.skipped
          .map(
            (s: { email: string; reason: string }) =>
              `${s.email}: ${s.reason}`
          )
          .join("\n");
        toast.warning(t("invite.skipped"), {
          description: skippedMessages,
          duration: 8000,
        });
      }

      if (data.sent > 0) {
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch {
      toast.error(t("invite.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invite.title")}</DialogTitle>
          <DialogDescription>{t("invite.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="emails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("invite.emailLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("invite.emailPlaceholder")}
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t("invite.emailDesc")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("invite.roleLabel")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("invite.rolePlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">{t("table.member")}</SelectItem>
                      <SelectItem value="manager">{t("table.manager")}</SelectItem>
                      <SelectItem value="admin">{t("table.admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>{t("invite.roleDesc")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("invite.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("invite.sending") : t("invite.send")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
