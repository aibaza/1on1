"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { useTranslations, useFormatter } from "next-intl";
import { Check, Pencil, Sparkles, CalendarIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemedAvatarImage } from "@/components/ui/themed-avatar-image";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface FormValues {
  reportId: string;
  cadence: "weekly" | "biweekly" | "monthly" | "custom";
  cadenceCustomDays?: number;
  defaultTemplateId: string;
  preferredDay: string;
  preferredTime: string;
  defaultDurationMinutes: number;
  nextSessionDate: string; // ISO date string YYYY-MM-DD
}

const createFormSchema = z.object({
  reportId: z.string().min(1, "Please select a report"),
  cadence: z.enum(["weekly", "biweekly", "monthly", "custom"]),
  cadenceCustomDays: z.number().int().min(1).max(365).optional(),
  defaultTemplateId: z.string().min(1, "Please select a template"),
  preferredDay: z.string().min(1, "Please select a day"),
  preferredTime: z.string().min(1, "Please select a time"),
  defaultDurationMinutes: z.number().int().min(15).max(180),
  nextSessionDate: z.string().min(1, "Please select a date"),
});

const editFormSchema = z.object({
  reportId: z.string(),
  cadence: z.enum(["weekly", "biweekly", "monthly", "custom"]),
  cadenceCustomDays: z.number().int().min(1).max(365).optional(),
  defaultTemplateId: z.string().optional(),
  preferredDay: z.string().optional(),
  preferredTime: z.string().optional(),
  defaultDurationMinutes: z.number().int().min(15).max(180),
  nextSessionDate: z.string().optional(),
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

/** Data for pre-populating the form in edit mode */
export interface SeriesEditData {
  id: string;
  reportId: string;
  reportName: string;
  cadence: string;
  cadenceCustomDays: number | null;
  defaultTemplateId: string | null;
  preferredDay: string | null;
  preferredTime: string | null;
  defaultDurationMinutes: number;
  nextSessionAt: string | null;
}

interface EditorialSeriesFormProps {
  userGroups: [string, User[]][];
  templates: Template[];
  /** If provided, form is in edit mode */
  editData?: SeriesEditData;
}

function extractDate(isoString: string | null): string {
  if (!isoString) return "";
  return isoString.slice(0, 10);
}

export function EditorialSeriesForm({ userGroups, templates, editData }: EditorialSeriesFormProps) {
  const t = useTranslations("sessions");
  const format = useFormatter();
  const { showApiError } = useApiErrorToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!editData;

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

  const [selectedTemplate, setSelectedTemplate] = useState<string>(editData?.defaultTemplateId ?? "");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver with conditional schema produces incompatible Resolver type
    resolver: zodResolver(isEdit ? editFormSchema : createFormSchema) as any,
    defaultValues: {
      reportId: editData?.reportId ?? "",
      cadence: (editData?.cadence as FormValues["cadence"]) ?? "biweekly",
      cadenceCustomDays: editData?.cadenceCustomDays ?? undefined,
      defaultTemplateId: editData?.defaultTemplateId ?? "",
      preferredDay: editData?.preferredDay ?? "",
      preferredTime: editData?.preferredTime?.slice(0, 5) ?? "",
      defaultDurationMinutes: editData?.defaultDurationMinutes ?? 30,
      nextSessionDate: extractDate(editData?.nextSessionAt ?? null),
    },
  });

  const cadence = form.watch("cadence");
  const reportId = form.watch("reportId");
  const nextSessionDate = form.watch("nextSessionDate");
  const preferredTime = form.watch("preferredTime");

  // Combine date + time into ISO string for API
  function buildNextSessionAt(date: string, time: string): string | null {
    if (!date) return null;
    const timeStr = time || "09:00";
    return new Date(`${date}T${timeStr}:00`).toISOString();
  }

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (values.cadence === "custom" && !values.cadenceCustomDays) {
        throw new Error("Custom interval days is required for custom cadence");
      }

      const nextSessionAt = buildNextSessionAt(values.nextSessionDate, values.preferredTime);

      const payload: Record<string, unknown> = {
        cadence: values.cadence,
        defaultDurationMinutes: values.defaultDurationMinutes,
        preferredDay: values.preferredDay || null,
        preferredTime: values.preferredTime || null,
        defaultTemplateId: values.defaultTemplateId || null,
      };

      if (values.cadenceCustomDays) payload.cadenceCustomDays = values.cadenceCustomDays;
      if (nextSessionAt) payload.nextSessionAt = nextSessionAt;

      if (isEdit) {
        // PATCH existing
        const res = await fetch(`/api/series/${editData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update series");
        }
        return res.json();
      } else {
        // POST new
        payload.reportId = values.reportId;
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
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? t("detail.seriesUpdated") : t("form.created"));
      queryClient.invalidateQueries({ queryKey: ["series"] });
      if (isEdit) {
        router.refresh();
        router.back();
      } else {
        router.push("/sessions");
      }
    },
    onError: (error: Error) => {
      showApiError(error);
    },
  });

  const selectedTemplateName = templates.find((tmpl) => tmpl.id === selectedTemplate)?.name;

  const inputClass = "w-full bg-[var(--editorial-surface-container-low,var(--muted))] border-0 rounded-xl p-4 font-medium text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer";

  return (
    <form
      onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
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

        {isEdit ? (
          // In edit mode, show the fixed report (not changeable)
          <div className="flex items-center gap-4 p-4 rounded-xl text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}>
            <Avatar className="h-12 w-12 shrink-0 rounded-full border-2 border-white/30">
              <AvatarFallback className="text-xs font-bold">{editData.reportName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <div className="text-left min-w-0">
              <p className="font-bold leading-tight truncate">{editData.reportName}</p>
            </div>
            <Check className="h-5 w-5 ml-auto shrink-0" />
          </div>
        ) : (
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
                    <ThemedAvatarImage name={fullName} uploadedUrl={user.avatarUrl} role={user.level} />
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
        )}

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
                className={inputClass}
                value={form.watch("preferredDay")}
                onChange={(e) => form.setValue("preferredDay", e.target.value, { shouldValidate: true })}
              >
                <option value="">{t("form.selectDay")}</option>
                {dayOptions.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
              {form.formState.errors.preferredDay && (
                <p className="mt-1 text-sm text-destructive">{form.formState.errors.preferredDay.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                {t("form.preferredTime")}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="bg-[var(--editorial-surface-container-low,var(--muted))] border-0 rounded-xl p-4 font-medium text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
                  value={(() => { const v = preferredTime; return v ? v.split(":")[0] : ""; })()}
                  onChange={(e) => {
                    const h = e.target.value;
                    if (!h) { form.setValue("preferredTime", "", { shouldValidate: true }); return; }
                    const currentMin = preferredTime?.split(":")[1] ?? "00";
                    form.setValue("preferredTime", `${h}:${currentMin}`, { shouldValidate: true });
                  }}
                >
                  <option value="">{t("form.hour")}</option>
                  {Array.from({ length: 13 }, (_, i) => {
                    const h = String(i + 6).padStart(2, "0");
                    return <option key={h} value={h}>{h}</option>;
                  })}
                </select>
                <select
                  className="bg-[var(--editorial-surface-container-low,var(--muted))] border-0 rounded-xl p-4 font-medium text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
                  value={(() => { const v = preferredTime; return v ? v.split(":")[1] : ""; })()}
                  onChange={(e) => {
                    const m = e.target.value;
                    const currentHour = preferredTime?.split(":")[0] ?? "09";
                    form.setValue("preferredTime", `${currentHour}:${m}`, { shouldValidate: true });
                  }}
                  disabled={!preferredTime}
                >
                  <option value="">{t("form.minute")}</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = String(i * 5).padStart(2, "0");
                    return <option key={m} value={m}>{m}</option>;
                  })}
                </select>
              </div>
              {form.formState.errors.preferredTime && (
                <p className="mt-1 text-sm text-destructive">{form.formState.errors.preferredTime.message}</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Section 3: Next Session Date (Calendar) */}
      <section className="bg-card p-8 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-[var(--editorial-outline-variant,var(--border))]/50">
        <label className="block font-headline text-lg font-bold text-foreground mb-1">
          {isEdit ? t("form.nextSessionDate") : t("form.firstSessionDate")}
        </label>
        <p className="text-xs text-muted-foreground mb-4">
          {t("form.sessionDateDesc")}
        </p>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                inputClass,
                "flex items-center justify-between text-left",
                !nextSessionDate && "text-muted-foreground"
              )}
            >
              <span>
                {nextSessionDate
                  ? format.dateTime(new Date(nextSessionDate + "T12:00:00"), { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                  : t("form.selectDate")}
              </span>
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Calendar
              mode="single"
              selected={nextSessionDate ? new Date(nextSessionDate + "T12:00:00") : undefined}
              onSelect={(date) => {
                if (date) {
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, "0");
                  const d = String(date.getDate()).padStart(2, "0");
                  form.setValue("nextSessionDate", `${y}-${m}-${d}`, { shouldValidate: true });
                } else {
                  form.setValue("nextSessionDate", "", { shouldValidate: true });
                }
                setCalendarOpen(false);
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              defaultMonth={nextSessionDate ? new Date(nextSessionDate + "T12:00:00") : new Date()}
            />
          </PopoverContent>
        </Popover>
        {nextSessionDate && preferredTime && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("form.sessionAtTime", {
              date: format.dateTime(new Date(nextSessionDate + "T12:00:00"), { weekday: "short", month: "short", day: "numeric" }),
              time: preferredTime,
            })}
          </p>
        )}
        {form.formState.errors.nextSessionDate && (
          <p className="mt-1 text-sm text-destructive">{form.formState.errors.nextSessionDate.message}</p>
        )}
      </section>

      {/* Section 4: Template */}
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
                  form.setValue("defaultTemplateId", e.target.value, { shouldValidate: true });
                }}
              >
                <option value="">{t("form.selectTemplate")}</option>
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                ))}
              </select>
            </div>
            {form.formState.errors.defaultTemplateId && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.defaultTemplateId.message}</p>
            )}
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
          disabled={saveMutation.isPending}
          className="text-white px-10 py-4 rounded-xl font-headline font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
        >
          {saveMutation.isPending
            ? (isEdit ? t("detail.saving") : t("form.creating"))
            : (isEdit ? t("detail.save") : t("form.createSeries"))}
        </button>
      </footer>
    </form>
  );
}
