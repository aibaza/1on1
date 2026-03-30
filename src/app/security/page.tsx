import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Lock,
  Database,
  Users,
  Code,
  ShieldCheck,
  Network,
  KeyRound,
  Shield,
  Brain,
  Server,
  BadgeCheck,
  MapPin,
  Cookie,
  Container,
  Bug,
  Mail,
} from "lucide-react";
import { MarketingNav } from "@/app/(marketing)/_components/marketing-nav";
import { MarketingFooter } from "@/app/(marketing)/_components/marketing-footer";

export const metadata: Metadata = {
  title: "Security | 1on1",
  description:
    "How 1on1 protects your team's meeting data with encryption, tenant isolation, RBAC, and open-source transparency.",
};

export default async function SecurityPage() {
  const t = await getTranslations("legal.security");

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col font-[family-name:var(--font-inter)] text-foreground antialiased">
      <MarketingNav activeLink="security" />

      <main className="flex-1 pt-12 pb-24">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-8 mb-24">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-[var(--editorial-surface-container-high)] text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              {t("badge")}
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground tracking-tighter mb-8 leading-[1.1]">
              {t("title").replace("1on1", "")}
              <span className="text-primary">1on1</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {t("subtitle")}
            </p>
          </div>
        </section>

        {/* Key Principles */}
        <section className="max-w-7xl mx-auto px-8 mb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {([
              ["encryption", Lock, "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"],
              ["isolation", Database, "bg-[var(--editorial-tertiary)]/10 text-[var(--editorial-tertiary)] group-hover:bg-[var(--editorial-tertiary)] group-hover:text-white"],
              ["rbac", Users, "bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background"],
              ["openSource", Code, "bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background"],
            ] as const).map(([key, Icon, color]) => (
              <div key={key} className="p-8 rounded-xl bg-card border border-border/10 shadow-sm hover:shadow-md transition-shadow group">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 transition-colors ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold font-[family-name:var(--font-manrope)] mb-3">
                  {t(`principles.${key}.title`)}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t(`principles.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Data Protection Details */}
        <section className="bg-[var(--editorial-surface-container-low)] py-24">
          <div className="max-w-7xl mx-auto px-8">
            <div className="mb-16">
              <h2 className="text-4xl font-bold font-[family-name:var(--font-manrope)] tracking-tight mb-4">
                {t("details.title")}
              </h2>
              <p className="text-muted-foreground max-w-2xl">
                {t("details.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Encryption — wide card */}
              <div className="md:col-span-2 p-10 rounded-xl bg-card border border-border/10">
                <h4 className="text-lg font-bold font-[family-name:var(--font-manrope)] mb-4 text-primary flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  {t("details.encryptionTitle")}
                </h4>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {t("details.encryptionText")}
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 bg-[var(--editorial-surface-container)] text-xs font-bold rounded uppercase">
                    {t("details.encryptionTag1")}
                  </span>
                  <span className="px-3 py-1 bg-[var(--editorial-surface-container)] text-xs font-bold rounded uppercase">
                    {t("details.encryptionTag2")}
                  </span>
                </div>
              </div>

              {/* Multi-tenancy */}
              <div className="p-10 rounded-xl bg-card border border-border/10">
                <h4 className="text-lg font-bold font-[family-name:var(--font-manrope)] mb-4 text-primary flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  {t("details.multiTenancyTitle")}
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  {t("details.multiTenancyText")}
                </p>
              </div>

              {/* Authentication */}
              <div className="p-10 rounded-xl bg-card border border-border/10">
                <h4 className="text-lg font-bold font-[family-name:var(--font-manrope)] mb-4 text-primary flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  {t("details.authTitle")}
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  {t("details.authText")}
                </p>
              </div>

              {/* Authorization */}
              <div className="p-10 rounded-xl bg-card border border-border/10">
                <h4 className="text-lg font-bold font-[family-name:var(--font-manrope)] mb-4 text-primary flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t("details.authzTitle")}
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  {t("details.authzText")}
                </p>
              </div>

              {/* AI — accent card */}
              <div className="p-10 rounded-xl bg-primary text-white">
                <h4 className="text-lg font-bold font-[family-name:var(--font-manrope)] mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  {t("details.aiTitle")}
                </h4>
                <p className="opacity-90 leading-relaxed">
                  {t("details.aiText")}
                </p>
              </div>

              {/* Infrastructure — full width */}
              <div className="md:col-span-3 p-10 rounded-xl bg-card border border-border/10 border-l-4 border-l-[var(--editorial-tertiary)]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h4 className="text-lg font-bold font-[family-name:var(--font-manrope)] mb-2 flex items-center gap-2">
                      <Server className="h-5 w-5 text-[var(--editorial-tertiary)]" />
                      {t("details.infraTitle")}
                    </h4>
                    <p className="text-muted-foreground">
                      {t("details.infraSubtitle")}
                    </p>
                  </div>
                  <div className="flex gap-12 text-center">
                    <div>
                      <div className="text-2xl font-bold font-[family-name:var(--font-manrope)]">Vercel</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest">{t("details.infraVercel")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-[family-name:var(--font-manrope)]">Neon</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest">{t("details.infraNeon")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-[family-name:var(--font-manrope)]">EU</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest">{t("details.infraEU")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Compliance */}
        <section className="max-w-7xl mx-auto px-8 py-32">
          <h2 className="text-4xl font-bold font-[family-name:var(--font-manrope)] tracking-tight mb-12">
            {t("compliance.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {([
              ["gdpr", BadgeCheck],
              ["residency", MapPin],
              ["cookie", Cookie],
              ["selfHost", Container],
            ] as const).map(([key, Icon]) => (
              <div key={key} className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--editorial-surface-container-high)] flex items-center justify-center text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="text-lg font-bold mb-1">{t(`compliance.${key}Title`)}</h5>
                  <p className="text-muted-foreground leading-relaxed">{t(`compliance.${key}Text`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Responsible Disclosure */}
        <section className="max-w-4xl mx-auto px-8 mb-32">
          <div className="bg-[var(--editorial-surface-container-high)] p-12 rounded-2xl text-center">
            <Bug className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold font-[family-name:var(--font-manrope)] mb-4">
              {t("disclosure.title")}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              {t("disclosure.text")}
            </p>
            <a
              href={`mailto:${t("disclosure.email")}`}
              className="text-primary font-bold text-lg hover:underline"
            >
              {t("disclosure.email")}
            </a>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-7xl mx-auto px-8 mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold font-[family-name:var(--font-manrope)] mb-6 tracking-tight">
            {t("cta.title")}
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            {t("cta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="mailto:security@1on1.ro"
              className="px-8 py-4 bg-primary text-white rounded-xl font-bold shadow-xl hover:opacity-90 transition-all text-center"
            >
              {t("cta.contact")}
            </a>
            <Link
              href="/privacy"
              className="px-8 py-4 bg-[var(--editorial-surface-container-high)] text-foreground rounded-xl font-bold hover:bg-[var(--editorial-surface-container)] transition-all text-center"
            >
              {t("cta.privacy")}
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
