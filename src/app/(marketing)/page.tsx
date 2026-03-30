import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Terminal,
  PenLine,
  Brain,
  CheckCircle,
  Shield,
  BarChart3,
  Sparkles,
  XCircle,
  Check,
} from "lucide-react";
import { auth } from "@/lib/auth/config";
import { MarketingNav } from "./_components/marketing-nav";
import { MarketingFooter } from "./_components/marketing-footer";
import { ShowcaseSeriesCard } from "./_components/showcase-series-card";
import { ShowcaseWizard } from "./_components/showcase-wizard";
import { ShowcaseAI } from "./_components/showcase-ai";
import { ShowcaseDashboard } from "./_components/showcase-dashboard";

export const metadata: Metadata = {
  title: "1on1 | Guided AI-Enhanced One-on-One Meetings",
  description:
    "Turn your 1:1 meetings into guided, AI-enhanced conversations with built-in accountability. Open source.",
};

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/overview");
  }

  const t = await getTranslations("landing");

  return (
    <div className="bg-[var(--background)] font-[family-name:var(--font-inter)] text-foreground antialiased">
      {/* Navigation — fixed on homepage for scroll */}
      <div className="fixed top-0 w-full z-50">
        <MarketingNav activeLink="features" />
      </div>

      <main className="pt-32">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-8 grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center mb-32">
          <div>
            <h1 className="font-[family-name:var(--font-manrope)] text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold text-foreground leading-[1.1] mb-6 tracking-tight">
              {t("hero.title")}{" "}
              <span className="text-[var(--editorial-primary-container)]">
                {t("hero.titleHighlight")}
              </span>{" "}
              {t("hero.titleEnd")}
            </h1>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-xl">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/register"
                className="bg-gradient-to-r from-primary to-[var(--editorial-primary-container)] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary/10 hover:opacity-90 transition-all text-center"
              >
                {t("hero.cta")}
              </Link>
              <a
                href="https://github.com/aibaza/1on1"
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-border text-foreground px-8 py-4 rounded-xl font-bold text-lg hover:bg-[var(--editorial-surface-container)] transition-all flex items-center gap-2"
              >
                <Terminal className="h-5 w-5" />
                {t("hero.ctaSecondary")}
              </a>
            </div>
          </div>

          {/* Hero Card — real EditorialSeriesCard replica */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-[var(--editorial-tertiary)]/10 blur-3xl rounded-full" />
            <div className="relative">
              <ShowcaseSeriesCard />
            </div>
          </div>
        </section>

        {/* Showcase Section — real component replicas */}
        <section className="bg-[var(--editorial-surface-container-low)] py-32">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              <ShowcaseWizard />
              <ShowcaseAI />
              <ShowcaseDashboard />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 max-w-7xl mx-auto px-8">
          <div className="text-center mb-20">
            <h2 className="font-[family-name:var(--font-manrope)] text-4xl font-bold mb-4">
              {t("features.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("features.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-8 rounded-3xl bg-card border border-border/10 dark:border-white/5 hover:shadow-xl transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
                <PenLine className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-3">
                {t("features.guided.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("features.guided.description")}
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-card border border-border/10 dark:border-white/5 hover:shadow-xl transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
                <Brain className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-3">
                {t("features.ai.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("features.ai.description")}
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-card border border-border/10 dark:border-white/5 hover:shadow-xl transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
                <CheckCircle className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-3">
                {t("features.actionItems.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("features.actionItems.description")}
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-card border border-border/10 dark:border-white/5 hover:shadow-xl transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-3">
                {t("features.security.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("features.security.description")}
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-card border border-border/10 dark:border-white/5 hover:shadow-xl transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
                <BarChart3 className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-3">
                {t("features.teamHealth.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("features.teamHealth.description")}
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-card border border-border/10 dark:border-white/5 hover:shadow-xl transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[var(--editorial-tertiary)]/10 flex items-center justify-center mb-6">
                <Sparkles className="h-7 w-7 text-[var(--editorial-tertiary)]" />
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-3">
                {t("features.aiAssistant.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("features.aiAssistant.description")}
              </p>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-32 bg-primary text-white">
          <div className="max-w-7xl mx-auto px-8">
            <h2 className="font-[family-name:var(--font-manrope)] text-4xl font-bold mb-20 text-center">
              {t("howItWorks.title")}
            </h2>
            <div className="grid md:grid-cols-3 gap-16 relative">
              <div className="absolute top-10 left-0 w-full h-[2px] bg-white/10 hidden md:block" />
              <div className="relative">
                <div className="w-20 h-20 bg-[var(--editorial-primary-container)] rounded-3xl flex items-center justify-center mb-8 shadow-lg">
                  <span className="text-2xl font-bold">01</span>
                </div>
                <h3 className="font-[family-name:var(--font-manrope)] text-2xl font-bold mb-4">
                  {t("howItWorks.step1.title")}
                </h3>
                <p className="text-white/70 leading-relaxed">
                  {t("howItWorks.step1.description")}
                </p>
              </div>
              <div className="relative">
                <div className="w-20 h-20 bg-[var(--editorial-primary-container)] rounded-3xl flex items-center justify-center mb-8 shadow-lg">
                  <span className="text-2xl font-bold">02</span>
                </div>
                <h3 className="font-[family-name:var(--font-manrope)] text-2xl font-bold mb-4">
                  {t("howItWorks.step2.title")}
                </h3>
                <p className="text-white/70 leading-relaxed">
                  {t("howItWorks.step2.description")}
                </p>
              </div>
              <div className="relative">
                <div className="w-20 h-20 bg-[var(--editorial-primary-container)] rounded-3xl flex items-center justify-center mb-8 shadow-lg">
                  <span className="text-2xl font-bold">03</span>
                </div>
                <h3 className="font-[family-name:var(--font-manrope)] text-2xl font-bold mb-4">
                  {t("howItWorks.step3.title")}
                </h3>
                <p className="text-white/70 leading-relaxed">
                  {t("howItWorks.step3.description")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-32 max-w-7xl mx-auto px-8">
          <div className="text-center mb-20">
            <h2 className="font-[family-name:var(--font-manrope)] text-4xl font-bold mb-4">
              {t("pricing.title")}
            </h2>
            <p className="text-muted-foreground">{t("pricing.subtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Free */}
            <div className="bg-[var(--editorial-surface-container-low)] p-10 rounded-3xl border border-border/10 flex flex-col">
              <h3 className="font-bold text-xl mb-2">{t("pricing.free.name")}</h3>
              <div className="flex items-baseline mb-8">
                <span className="text-4xl font-extrabold">&euro;{t("pricing.free.price")}</span>
              </div>
              <ul className="space-y-3 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.free.features.users")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.free.features.managers")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.free.features.templates")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.free.features.actionItems")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.free.features.analytics")}
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  {t("pricing.free.features.noAi")}
                </li>
              </ul>
              <Link
                href="/register"
                className="w-full py-4 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-all text-center block"
              >
                {t("pricing.free.cta")}
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-card p-10 rounded-3xl border-2 border-primary shadow-2xl dark:shadow-none dark:ring-1 dark:ring-primary/30 flex flex-col relative overflow-hidden scale-100 md:scale-105 z-10">
              <div className="absolute top-0 right-0 bg-primary text-white px-6 py-1 rounded-bl-2xl text-xs font-bold uppercase tracking-widest">
                {t("pricing.pro.badge")}
              </div>
              <h3 className="font-bold text-xl mb-2">{t("pricing.pro.name")}</h3>
              <div className="flex items-baseline mb-8">
                <span className="text-4xl font-extrabold">&euro;{t("pricing.pro.price")}</span>
                <span className="text-muted-foreground text-sm ml-2">
                  {t("pricing.pro.period")}
                </span>
              </div>
              <ul className="space-y-3 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.pro.features.users")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.pro.features.templates")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium font-bold text-primary">
                  <Sparkles className="h-4 w-4 flex-shrink-0" />
                  {t("pricing.pro.features.ai")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.pro.features.sentiment")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.pro.features.analytics")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.pro.features.calendar")}
                </li>
              </ul>
              <Link
                href="/register?plan=pro"
                className="w-full py-4 rounded-xl editorial-gradient text-white font-bold shadow-lg shadow-primary/20 text-center block"
              >
                {t("pricing.pro.cta")}
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-[var(--editorial-surface-container-low)] p-10 rounded-3xl border border-border/10 flex flex-col">
              <h3 className="font-bold text-xl mb-2">{t("pricing.enterprise.name")}</h3>
              <div className="flex items-baseline mb-8">
                <span className="text-4xl font-extrabold">&euro;{t("pricing.enterprise.price")}</span>
                <span className="text-muted-foreground text-sm ml-2">
                  {t("pricing.enterprise.period")}
                </span>
              </div>
              <ul className="space-y-3 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.enterprise.features.everything")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.enterprise.features.selfHost")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.enterprise.features.sso")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.enterprise.features.encryption")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.enterprise.features.audit")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Check className="h-4 w-4 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.enterprise.features.support")}
                </li>
              </ul>
              <Link
                href="/register?plan=enterprise"
                className="w-full py-4 rounded-xl border-2 border-foreground text-foreground font-bold hover:bg-[var(--editorial-surface-container-high)] transition-all text-center block"
              >
                {t("pricing.enterprise.cta")}
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-32 bg-[var(--editorial-surface-container-low)]">
          <div className="max-w-3xl mx-auto px-8">
            <h2 className="font-[family-name:var(--font-manrope)] text-4xl font-bold mb-16 text-center">
              {t("faq.title")}
            </h2>
            <div className="space-y-4">
              <div className="bg-card p-6 rounded-2xl shadow-sm dark:shadow-none border border-transparent dark:border-white/5">
                <h4 className="font-bold text-lg mb-2">{t("faq.q1.question")}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("faq.q1.answer")}
                </p>
              </div>
              <div className="bg-card p-6 rounded-2xl shadow-sm dark:shadow-none border border-transparent dark:border-white/5">
                <h4 className="font-bold text-lg mb-2">{t("faq.q2.question")}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("faq.q2.answer")}
                </p>
              </div>
              <div className="bg-card p-6 rounded-2xl shadow-sm dark:shadow-none border border-transparent dark:border-white/5">
                <h4 className="font-bold text-lg mb-2">{t("faq.q3.question")}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("faq.q3.answer")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-32 px-8 text-center bg-white dark:bg-slate-950">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-primary to-[var(--editorial-primary-container)] p-16 rounded-3xl text-white shadow-2xl">
            <h2 className="font-[family-name:var(--font-manrope)] text-4xl md:text-5xl font-bold mb-6">
              {t("finalCta.title")}
            </h2>
            <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
              {t("finalCta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/register"
                className="bg-white text-primary px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all text-center"
              >
                {t("finalCta.cta")}
              </Link>
              <a
                href="#"
                className="bg-primary/20 backdrop-blur-md border border-white/20 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-primary/30 transition-all text-center"
              >
                {t("finalCta.ctaSecondary")}
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
