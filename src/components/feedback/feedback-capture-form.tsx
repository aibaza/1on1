"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bug, Image as ImageIcon, Lightbulb, Send } from "lucide-react";

import {
  createFeedbackSchema,
  type CreateFeedbackInput,
} from "@/lib/validations/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

interface FeedbackCaptureFormProps {
  screenshotDataUrl: string | null;
  onSubmitSuccess: (id: string) => void;
  onCancel: () => void;
}

type FormValues = CreateFeedbackInput;

export function FeedbackCaptureForm({
  screenshotDataUrl,
  onSubmitSuccess,
  onCancel,
}: FeedbackCaptureFormProps) {
  const t = useTranslations("feedback.capture");
  // Compute defaults safely on the client — these are only used for the
  // very first render; the useEffect below re-syncs on mount in case the
  // component was rendered during hydration mismatch edge-cases.
  const initialDefaults = useMemo<FormValues>(
    () => ({
      type: "bug",
      title: "",
      description: "",
      pageUrl:
        typeof window !== "undefined" ? window.location.href : "http://unknown",
      viewport: {
        w: typeof window !== "undefined" ? window.innerWidth : 1,
        h: typeof window !== "undefined" ? window.innerHeight : 1,
      },
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
      screenshotDataUrl: screenshotDataUrl ?? undefined,
    }),
    // We intentionally only want to seed defaults once; attachScreenshot
    // is a separate UI-only toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(createFeedbackSchema),
    defaultValues: initialDefaults,
  });

  // Re-sync window-derived fields on mount (SSR safety) and keep
  // screenshotDataUrl in sync if it's produced asynchronously.
  useEffect(() => {
    if (typeof window !== "undefined") {
      form.setValue("pageUrl", window.location.href);
      form.setValue("viewport", {
        w: window.innerWidth,
        h: window.innerHeight,
      });
      form.setValue("userAgent", window.navigator.userAgent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI-only toggle for attaching the screenshot.
  // When OFF, we strip screenshotDataUrl from the payload.
  // Defaults to true if we have a data URL available.
  const attachScreenshot = form.watch("screenshotDataUrl") !== undefined;

  const type = form.watch("type");

  const submit = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.status === 429) {
        throw new Error(t("rateLimit"));
      }

      if (!res.ok) {
        let message = t("submitError");
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      return (await res.json()) as { id: string };
    },
    onSuccess: (data) => {
      toast.success(t("submitSuccess"));
      onSubmitSuccess(data.id);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onToggleAttach = (checked: boolean) => {
    if (checked && screenshotDataUrl) {
      form.setValue("screenshotDataUrl", screenshotDataUrl);
    } else {
      form.setValue("screenshotDataUrl", undefined);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => submit.mutate(values))}
        className="flex flex-col gap-5"
      >
        {/* Type segmented control */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("typeLabel")}
              </FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => field.onChange("bug")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      type === "bug"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={type === "bug"}
                  >
                    <Bug className="size-4 text-primary" />
                    {t("typeBug")}
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange("suggestion")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      type === "suggestion"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={type === "suggestion"}
                  >
                    <Lightbulb className="size-4 text-primary" />
                    {t("typeSuggestion")}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("titleLabel")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("titlePlaceholder")}
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("descriptionLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("descriptionPlaceholder")}
                  rows={5}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Attach Screenshot toggle + preview */}
        <div className="rounded-md border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ImageIcon className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {t("attachScreenshot")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {screenshotDataUrl
                    ? t("attachScreenshotHint")
                    : t("screenshotError")}
                </span>
              </div>
            </div>
            <Switch
              checked={attachScreenshot}
              onCheckedChange={onToggleAttach}
              disabled={!screenshotDataUrl}
              aria-label={t("attachScreenshot")}
            />
          </div>

          {attachScreenshot && screenshotDataUrl && (
            <div className="mt-3 overflow-hidden rounded-md border border-border bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotDataUrl}
                alt={t("currentScreen")}
                className="block max-h-52 w-full object-cover object-top"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submit.isPending}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? t("submitting") : t("submit")}
            {!submit.isPending && <Send className="size-4" />}
          </Button>
        </div>
      </form>
    </Form>
  );
}
