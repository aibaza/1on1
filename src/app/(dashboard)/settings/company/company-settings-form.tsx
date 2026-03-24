"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { THEME_PRESETS } from "@/lib/theme-presets";
import { InlineAlert } from "@/components/ui/inline-alert";

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

// LANGUAGES labels are derived from t() inside the component

interface CompanySettingsFormProps {
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

export function CompanySettingsForm({ initialData }: CompanySettingsFormProps) {
  const t = useTranslations("settings");
  const [name, setName] = useState(initialData.name);
  const [timezone, setTimezone] = useState(
    initialData.settings?.timezone || "UTC"
  );
  const [cadence, setCadence] = useState(
    initialData.settings?.defaultCadence || "biweekly"
  );
  const [duration, setDuration] = useState(
    String(initialData.settings?.defaultDurationMinutes || 30)
  );
  const [language, setLanguage] = useState(
    initialData.settings?.preferredLanguage || "en"
  );
  const [colorTheme, setColorTheme] = useState(
    initialData.settings?.colorTheme || "neutral"
  );
  const [companyContext, setCompanyContext] = useState(
    initialData.settings?.companyContext || ""
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

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

      setMessage({ type: "success", text: t("saved") });

      // Apply color theme immediately without requiring a page refresh
      const root = document.documentElement;
      if (colorTheme && colorTheme !== "neutral") {
        root.setAttribute("data-color-theme", colorTheme);
      } else {
        root.removeAttribute("data-color-theme");
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  }

  const orgTypeLabel =
    initialData.orgType === "non_profit"
      ? t("orgDetails.nonprofit")
      : t("orgDetails.forprofit");

  return (
    <div className="space-y-6">
      {message && (
        <InlineAlert variant={message.type === "success" ? "success" : "error"}>
          {message.text}
        </InlineAlert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("orgDetails.title")}</CardTitle>
          <CardDescription>
            {t("orgDetails.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">{t("orgDetails.name")}</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("orgDetails.type")}</Label>
              <div className="flex h-9 items-center">
                <Badge variant="secondary">{orgTypeLabel}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("orgDetails.typeNote")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("orgDetails.slug")}</Label>
              <div className="flex h-9 items-center">
                <code className="rounded bg-muted px-2 py-1 text-sm">
                  {initialData.slug}
                </code>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("orgDetails.slugNote")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("meetingDefaults.title")}</CardTitle>
          <CardDescription>
            {t("meetingDefaults.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="timezone">{t("orgDetails.timezone")}</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue placeholder={t("orgDetails.timezonePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>{t("meetingDefaults.cadence")}</Label>
            <RadioGroup
              value={cadence}
              onValueChange={setCadence}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {[
                { value: "weekly", label: t("meetingDefaults.weekly") },
                { value: "biweekly", label: t("meetingDefaults.biweekly") },
                { value: "monthly", label: t("meetingDefaults.monthly") },
                { value: "custom", label: t("meetingDefaults.custom") },
              ].map((option) => (
                <Label
                  key={option.value}
                  htmlFor={`cadence-${option.value}`}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    cadence === option.value
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={`cadence-${option.value}`}
                    className="sr-only"
                  />
                  {option.label}
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">{t("meetingDefaults.duration")}</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration" className="w-[200px]">
                <SelectValue placeholder={t("meetingDefaults.durationPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {t("meetingDefaults.minutes", { count: d })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("language.title")}</CardTitle>
          <CardDescription>
            {t("language.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="language">{t("language.label")}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" className="w-[200px]">
                <SelectValue placeholder={t("language.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: "en", label: t("language.english") },
                  { value: "ro", label: t("language.romanian") },
                  { value: "de", label: t("language.german") },
                  { value: "fr", label: t("language.french") },
                  { value: "es", label: t("language.spanish") },
                  { value: "pt", label: t("language.portuguese") },
                ].map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("theme.title")}</CardTitle>
          <CardDescription>
            {t("theme.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={colorTheme}
            onValueChange={setColorTheme}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {THEME_PRESETS.map((preset) => (
              <Label
                key={preset.id}
                htmlFor={`theme-${preset.id}`}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm transition-colors ${
                  colorTheme === preset.id
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border hover:bg-accent"
                }`}
              >
                <RadioGroupItem
                  value={preset.id}
                  id={`theme-${preset.id}`}
                  className="sr-only"
                />
                <span
                  className="h-5 w-5 shrink-0 rounded-full border"
                  style={{ backgroundColor: preset.swatch }}
                />
                <span className="truncate">{preset.name}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("aiContext.title")}</CardTitle>
          <CardDescription>
            {t("aiContext.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="company-context">{t("aiContext.label")}</Label>
            <Textarea
              id="company-context"
              value={companyContext}
              onChange={(e) => setCompanyContext(e.target.value)}
              placeholder={t("aiContext.placeholder")}
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {companyContext.length}/2000
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("saving") : t("saveChanges")}
        </Button>
      </div>
    </div>
  );
}
