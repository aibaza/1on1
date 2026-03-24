"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { useTranslations } from "next-intl";
import { Check, Pencil, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface FormValues {
  reportId: string;
  cadence: "weekly" | "biweekly" | "monthly" | "custom";
  cadenceCustomDays?: number;
  defaultTemplateId?: string;
  preferredDay?: string;
  preferredTime?: string;
  defaultDurationMinutes: number;
}

const formSchema = z.object({
  reportId: z.string().min(1, "Please select a report"),
  cadence: z.enum(["weekly", "biweekly", "monthly", "custom"]),
  cadenceCustomDays: z.number().int().min(1).max(365).optional(),
  defaultTemplateId: z.string().optional(),
  preferredDay: z.string().optional(),
  preferredTime: z.string().optional(),
  defaultDurationMinutes: z.number().int().min(15).max(180),
});

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string | null;
  avatarUrl?: string | null;
  level?: string | null;
}

interface Template {
  id: string;
  name: string;
}

interface EditorialSeriesFormProps {
  userGroups: [string, User[]][];
  templates: Template[];
}

export function EditorialSeriesForm({ userGroups, templates }: EditorialSeriesFormProps) {
  const t = useTranslations("sessions");
  const { showApiError } = useApiErrorToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const allUsers = userGroups.flatMap(([, members]) => members);

  const cadenceOptions = [
    { value: "weekly", label: t("form.weekly") },
    { value: "biweekly", label: t("form.biweekly") },
    { value: "monthly", label: t("form.monthly") },
    { value: "custom", label: t("form.custom") },
  ] as const;

  const dayOptions = [
    { value: "mon", label: t("form.monday") },
    { value: "tue", label: t("form.tuesday") },
    { value: "wed", label: t("form.wednesday") },
    { value: "thu", label: t("form.thursday") },
    { value: "fri", label: t("form.friday") },
  ] as const;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportId: "",
      cadence: "biweekly",
      defaultDurationMinutes: 30,
    },
  });

  const cadence = form.watch("cadence");
  const reportId = form.watch("reportId");

  const createSeries = useMutation({
    mutationFn: async (values: FormValues) => {
      if (values.cadence === "custom" && !values.cadenceCustomDays) {
        throw new Error("Custom interval days is required for custom cadence");
      }

      const payload: Record<string, unknown> = {
        reportId: values.reportId,
        cadence: values.cadence,
        defaultDurationMinutes: values.defaultDurationMinutes,
      };

      if (values.cadenceCustomDays) payload.cadenceCustomDays = values.cadenceCustomDays;
      if (values.defaultTemplateId) payload.defaultTemplateId = values.defaultTemplateId;
      if (values.preferredDay) payload.preferredDay = values.preferredDay;
      if (values.preferredTime) payload.preferredTime = values.preferredTime;

      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create series");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success(t("form.created"));
      queryClient.invalidateQueries({ queryKey: ["series"] });
      router.push("/sessions");
    },
    onError: (error: Error) => {
      showApiError(error);
    },
  });

  const selectedUser = allUsers.find((u) => u.id === reportId);
  const selectedTemplateName = templates.find((t) => t.id === selectedTemplate)?.name;

  return (
    <form
      onSubmit={form.handleSubmit((values) => createSeries.mutate(values))}
      className="space-y-10"
    >
      {/* Section 1: The Who (Hero) */}
      <section className="bg-card p-8 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-[var(--editorial-outline-variant,var(--border))]/50 hover:shadow-md transition-shadow">
        <div className="mb-6">
          <label className="block font-headline text-xl font-bold text-foreground mb-1">
            {t("form.report")}
          </label>
          <p className="text-sm text-muted-foreground mb-6">
            {t("form.reportDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allUsers.map((user) => {
            const fullName = `${user.firstName} ${user.lastName}`;
            const isSelected = reportId === user.id;
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => form.setValue("reportId", user.id, { shouldValidate: true })}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl transition-all active:scale-[0.98]",
                  isSelected
                    ? "text-white shadow-lg ring-4 ring-primary/10"
                    : "bg-[var(--editorial-surface-container-low,var(--muted))] hover:bg-[var(--editorial-surface-container,var(--accent))]"
                )}
                style={isSelected ? { background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" } : undefined}
              >
                <Avatar className="h-12 w-12 shrink-0 rounded-full border-2 border-white/30">
                  <AvatarImage src={getAvatarUrl(fullName, user.avatarUrl, null, user.level)} alt={fullName} />
                  <AvatarFallback className="text-xs font-bold">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0">
                  <p className="font-bold leading-tight truncate">{fullName}</p>
                  {user.jobTitle && (
                    <p className={cn("text-xs truncate", isSelected ? "opacity-80" : "text-muted-foreground")}>
                      {user.jobTitle}
                    </p>
                  )}
                </div>
                {isSelected && <Check className="h-5 w-5 ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>

        {form.formState.errors.reportId && (
          <p className="mt-3 text-sm text-destructive">{form.formState.errors.reportId.message}</p>
        )}
      </section>

      {/* Section 2: Cadence & Timing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cadence */}
        <section className="bg-card p-8 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-[var(--editorial-outline-variant,var(--border))]/50 flex flex-col justify-between">
          <div>
            <label className="block font-headline text-lg font-bold text-foreground mb-1">
              {t("form.cadence")}
            </label>
            <p className="text-xs text-muted-foreground mb-6">
              {t("form.cadenceDesc")}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {cadenceOptions.map((option) => {
                const isActive = cadence === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => form.setValue("cadence", option.value as FormValues["cadence"])}
                    className={cn(
                      "py-3 px-4 rounded-xl text-sm font-medium transition-all active:scale-95",
                      isActive
                        ? "text-white font-bold shadow-md"
                        : "bg-[var(--editorial-surface-container-low,var(--muted))] text-foreground hover:bg-[var(--editorial-surface-container-high,var(--accent))]"
                    )}
                    style={isActive ? { background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" } : undefined}
                  >
                    {option.value === "custom" && <Pencil className="h-3 w-3 inline mr-1" />}
                    {option.label}
                  </button>
                );
              })}
            </div>

            {cadence === "custom" && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  {t("form.customDays")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  placeholder={t("form.customPlaceholder")}
                  className="w-full bg-[var(--editorial-surface-container-low,var(--muted))] border-0 rounded-xl p-3 text-foreground font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  value={form.watch("cadenceCustomDays") ?? ""}
                  onChange={(e) => form.setValue("cadenceCustomDays", e.target.value ? parseInt(e.target.value, 10) : undefined)}
                />
                {form.formState.errors.cadenceCustomDays && (
                  <p className="mt-1 text-sm text-destructive">{form.formState.errors.cadenceCustomDays.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="relative pt-4 border-t border-[var(--editorial-outline-variant,var(--border))]/20">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              {t("form.duration")}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min={15}
                max={180}
                step={5}
                className="w-24 bg-[var(--editorial-surface-container-low,var(--muted))] border-0 rounded-xl p-3 text-lg font-bold text-primary focus:ring-2 focus:ring-primary/40 focus:outline-none"
                value={form.watch("defaultDurationMinutes")}
                onChange={(e) => form.setValue("defaultDurationMinutes", e.target.value ? parseInt(e.target.value, 10) : 30)}
              />
              <span className="text-muted-foreground font-medium">{t("form.minutes")}</span>
            </div>
          </div>
        </section>

        {/* Schedule Preference */}
        <section className="bg-card p-8 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-[var(--editorial-outline-variant,var(--border))]/50">
          <label className="block font-headline text-lg font-bold text-foreground mb-1">
            {t("form.schedulePreference")}
          </label>
          <p className="text-xs text-muted-foreground mb-6">
            {t("form.schedulePreferenceDesc")}
          </p>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                {t("form.preferredDay")}
              </label>
              <select
                className="w-full bg-[var(--editorial-surface-container-low,var(--muted))] border-0 rounded-xl p-4 font-medium text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
                value={form.watch("preferredDay") ?? ""}
                onChange={(e) => form.setValue("preferredDay", e.target.value || undefined)}
              >
                <option value="">{t("form.noPreference")}</option>
                {dayOptions.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                {t("form.preferredTime")}
              </label>
              <select
                className="w-full bg-[var(--editorial-surface-container-low,var(--muted))] border-0 rounded-xl p-4 font-medium text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
                value={form.watch("preferredTime") ?? ""}
                onChange={(e) => form.setValue("preferredTime", e.target.value || undefined)}
              >
                <option value="">{t("form.noPreference")}</option>
                {Array.from({ length: 23 }, (_, i) => {
                  const hour = Math.floor(i / 2) + 8;
                  const min = i % 2 === 0 ? "00" : "30";
                  if (hour > 19) return null;
                  const val = `${String(hour).padStart(2, "0")}:${min}`;
                  return <option key={val} value={val}>{val}</option>;
                })}
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* Section 3: Template */}
      <section className="bg-card p-8 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-[var(--editorial-outline-variant,var(--border))]/50">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <label className="block font-headline text-lg font-bold text-foreground mb-1">
              {t("form.defaultTemplate")}
            </label>
            <p className="text-sm text-muted-foreground mb-4">
              {t("form.templateDesc")}
            </p>
            <div className="relative">
              <select
                className="w-full bg-[var(--editorial-surface-container-low,var(--muted))] border-0 rounded-xl p-4 font-bold text-primary focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer appearance-none"
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  form.setValue("defaultTemplateId", e.target.value || undefined);
                }}
              >
                <option value="">{t("form.noTemplate")}</option>
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                ))}
              </select>
            </div>
          </div>
          {selectedTemplateName && (
            <div className="w-full md:w-64 bg-[var(--color-success,#004c47)]/10 p-4 rounded-xl border border-[var(--color-success,#004c47)]/10">
              <div className="flex items-center gap-2 mb-2" style={{ color: "var(--color-success, #004c47)" }}>
                <Sparkles className="h-4 w-4" />
                <span className="font-bold text-sm">{t("form.templateTip")}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("form.templateTipDesc", { name: selectedTemplateName })}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Actions */}
      <footer className="flex items-center justify-end gap-6 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-muted-foreground font-bold hover:text-foreground px-6 py-3 transition-colors active:scale-95"
        >
          {t("form.cancel")}
        </button>
        <button
          type="submit"
          disabled={createSeries.isPending}
          className="text-white px-10 py-4 rounded-xl font-headline font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
        >
          {createSeries.isPending ? t("form.creating") : t("form.createSeries")}
        </button>
      </footer>
    </form>
  );
}
