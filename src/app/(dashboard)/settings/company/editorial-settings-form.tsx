"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Building2, Clock, Globe, Palette, Brain, Save } from "lucide-react";
import { THEME_PRESETS } from "@/lib/theme-presets";

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "America/Anchorage", label: "Alaska Time (US)" },
  { value: "America/Toronto", label: "Eastern Time (Canada)" },
  { value: "America/Vancouver", label: "Pacific Time (Canada)" },
  { value: "America/Sao_Paulo", label: "Brasilia Time" },
  { value: "America/Mexico_City", label: "Central Time (Mexico)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)" },
  { value: "Europe/Bucharest", label: "Bucharest (EET/EEST)" },
  { value: "Europe/Helsinki", label: "Helsinki (EET/EEST)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
];

const DURATION_OPTIONS = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 120];

interface EditorialSettingsFormProps {
  initialData: {
    name: string;
    slug: string;
    orgType: string;
    settings: {
      timezone?: string;
      defaultCadence?: string;
      defaultDurationMinutes?: number;
      preferredLanguage?: string;
      colorTheme?: string;
      companyContext?: string;
    };
  };
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-2xl border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="px-8 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
          <h3 className="text-lg font-bold font-headline text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground ml-12">{description}</p>
      </div>
      <div className="px-8 pb-8">
        {children}
      </div>
    </section>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 ml-1">
      {children}
    </label>
  );
}

function EditorialInput({
  id,
  value,
  onChange,
  readOnly,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <input
      id={id}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      className="w-full px-4 py-3 bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all placeholder:text-muted-foreground/60 read-only:opacity-60 read-only:cursor-not-allowed"
      {...props}
    />
  );
}

function EditorialSelect({
  id,
  value,
  onChange,
  children,
  className = "",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-4 py-3 bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all cursor-pointer ${className}`}
    >
      {children}
    </select>
  );
}

export function EditorialSettingsForm({ initialData }: EditorialSettingsFormProps) {
  const t = useTranslations("settings");
  const [name, setName] = useState(initialData.name);
  const [timezone, setTimezone] = useState(initialData.settings?.timezone || "UTC");
  const [cadence, setCadence] = useState(initialData.settings?.defaultCadence || "biweekly");
  const [duration, setDuration] = useState(String(initialData.settings?.defaultDurationMinutes || 30));
  const [language, setLanguage] = useState(initialData.settings?.preferredLanguage || "en");
  const [colorTheme, setColorTheme] = useState(initialData.settings?.colorTheme || "neutral");
  const [companyContext, setCompanyContext] = useState(initialData.settings?.companyContext || "");
  const [saving, setSaving] = useState(false);

  const orgTypeLabel = initialData.orgType === "non_profit" ? t("orgDetails.nonprofit") : t("orgDetails.forprofit");

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timezone,
          defaultCadence: cadence,
          defaultDurationMinutes: parseInt(duration, 10),
          preferredLanguage: language,
          colorTheme,
          companyContext: companyContext || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }
      toast.success(t("saved"));
      const root = document.documentElement;
      if (colorTheme && colorTheme !== "neutral") {
        root.setAttribute("data-color-theme", colorTheme);
      } else {
        root.removeAttribute("data-color-theme");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Organization Details */}
      <SectionCard icon={Building2} title={t("orgDetails.title")} description={t("orgDetails.description")}>
        <div className="space-y-5">
          <div>
            <FieldLabel htmlFor="org-name">{t("orgDetails.name")}</FieldLabel>
            <EditorialInput id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <FieldLabel>{t("orgDetails.type")}</FieldLabel>
              <div className="flex items-center h-12 px-4 bg-[var(--editorial-surface-container-low,var(--muted))] rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-[var(--editorial-surface-container,var(--accent))] px-2.5 py-1 rounded-md">
                  {orgTypeLabel}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">{t("orgDetails.typeNote")}</p>
            </div>
            <div>
              <FieldLabel>{t("orgDetails.slug")}</FieldLabel>
              <div className="flex items-center h-12 px-4 bg-[var(--editorial-surface-container-low,var(--muted))] rounded-xl">
                <code className="text-sm text-muted-foreground font-mono">{initialData.slug}</code>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">{t("orgDetails.slugNote")}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Meeting Defaults */}
      <SectionCard icon={Clock} title={t("meetingDefaults.title")} description={t("meetingDefaults.description")}>
        <div className="space-y-6">
          <div>
            <FieldLabel htmlFor="timezone">{t("orgDetails.timezone")}</FieldLabel>
            <EditorialSelect id="timezone" value={timezone} onChange={setTimezone} className="w-full">
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </EditorialSelect>
          </div>

          <div>
            <FieldLabel>{t("meetingDefaults.cadence")}</FieldLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { value: "weekly", label: t("meetingDefaults.weekly") },
                { value: "biweekly", label: t("meetingDefaults.biweekly") },
                { value: "monthly", label: t("meetingDefaults.monthly") },
                { value: "custom", label: t("meetingDefaults.custom") },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCadence(option.value)}
                  className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    cadence === option.value
                      ? "bg-primary text-white shadow-sm"
                      : "bg-[var(--editorial-surface-container-low,var(--muted))] text-muted-foreground hover:bg-[var(--editorial-surface-container,var(--accent))] hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="duration">{t("meetingDefaults.duration")}</FieldLabel>
            <EditorialSelect id="duration" value={duration} onChange={setDuration} className="w-[200px]">
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={String(d)}>{t("meetingDefaults.minutes", { count: d })}</option>
              ))}
            </EditorialSelect>
          </div>
        </div>
      </SectionCard>

      {/* Language */}
      <SectionCard icon={Globe} title={t("language.title")} description={t("language.description")}>
        <div>
          <FieldLabel htmlFor="language">{t("language.label")}</FieldLabel>
          <EditorialSelect id="language" value={language} onChange={setLanguage} className="w-[240px]">
            {[
              { value: "en", label: t("language.english") },
              { value: "ro", label: t("language.romanian") },
              { value: "de", label: t("language.german") },
              { value: "fr", label: t("language.french") },
              { value: "es", label: t("language.spanish") },
              { value: "pt", label: t("language.portuguese") },
            ].map((lang) => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </EditorialSelect>
        </div>
      </SectionCard>

      {/* Color Theme */}
      <SectionCard icon={Palette} title={t("theme.title")} description={t("theme.description")}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setColorTheme(preset.id)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                colorTheme === preset.id
                  ? "bg-primary/8 border-2 border-primary text-foreground font-bold"
                  : "bg-[var(--editorial-surface-container-low,var(--muted))] border-2 border-transparent text-muted-foreground hover:bg-[var(--editorial-surface-container,var(--accent))] hover:text-foreground"
              }`}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-full shadow-sm border border-black/10"
                style={{ backgroundColor: preset.swatch }}
              />
              <span className="truncate">{preset.name}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* AI Context / Manifesto */}
      <SectionCard icon={Brain} title={t("aiContext.title")} description={t("aiContext.description")}>
        <div>
          <FieldLabel htmlFor="company-context">{t("aiContext.label")}</FieldLabel>
          <textarea
            id="company-context"
            value={companyContext}
            onChange={(e) => setCompanyContext(e.target.value)}
            placeholder={t("aiContext.placeholder")}
            rows={5}
            maxLength={2000}
            className="w-full px-4 py-3 bg-[var(--editorial-surface-container-low,var(--muted))] border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all placeholder:text-muted-foreground/60 resize-none"
          />
          <p className="text-[10px] text-muted-foreground text-right mt-1.5 font-medium">
            {companyContext.length}/2,000
          </p>
        </div>
      </SectionCard>

      {/* Save */}
      <div className="flex justify-end pt-4 pb-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3.5 rounded-xl font-bold font-headline text-sm text-white shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
        >
          <Save className="h-4 w-4" />
          {saving ? t("saving") : t("saveChanges")}
        </button>
      </div>
    </div>
  );
}
