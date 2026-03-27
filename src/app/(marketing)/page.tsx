import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Sparkles,
  Calendar,
  Brain,
  CheckCircle,
  BarChart3,
  Shield,
  Check,
  Lightbulb,
  Globe,
  Share2,
} from "lucide-react";
import { auth } from "@/lib/auth/config";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "./_components/mobile-nav";
import { LanguageSwitcher } from "./_components/language-switcher";

export const metadata: Metadata = {
  title: "1on1 | Transform your 1:1 culture",
  description:
    "Empower your managers with structured sessions, AI-driven insights, and seamless action tracking.",
};

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/overview");
  }

  const t = await getTranslations("landing");

  return (
    <div className="bg-[var(--background)] font-[family-name:var(--font-inter)] text-foreground antialiased">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm dark:shadow-none">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center h-20">
          <Link href="/" className="text-2xl font-bold tracking-tighter text-foreground font-[family-name:var(--font-manrope)]">
            <Logo className="h-8" />
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <a
              className="text-foreground font-semibold border-b-2 border-primary font-[family-name:var(--font-manrope)] text-sm tracking-tight transition-colors duration-200"
              href="#features"
            >
              {t("nav.features")}
            </a>
            <a
              className="text-muted-foreground font-[family-name:var(--font-manrope)] text-sm font-medium tracking-tight hover:text-primary transition-colors duration-200"
              href="#methodology"
            >
              {t("nav.methodology")}
            </a>
            <a
              className="text-muted-foreground font-[family-name:var(--font-manrope)] text-sm font-medium tracking-tight hover:text-primary transition-colors duration-200"
              href="#pricing"
            >
              {t("nav.pricing")}
            </a>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              href="/login"
              className="text-foreground font-[family-name:var(--font-manrope)] text-sm font-medium tracking-tight hover:opacity-80 transition-all"
            >
              {t("nav.signIn")}
            </Link>
            <Link
              href="/register"
              className="editorial-gradient text-white px-6 py-2.5 rounded-lg font-[family-name:var(--font-manrope)] text-sm font-medium tracking-tight hover:scale-95 duration-150 shadow-md"
            >
              {t("nav.getStarted")}
            </Link>
          </div>
          <MobileNav />
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-40 pb-24 px-8 relative overflow-hidden bg-[var(--background)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 relative z-10">
          <div className="w-full md:w-1/2 text-left">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--editorial-tertiary-container)]/10 text-[var(--editorial-tertiary)] mb-6 font-[family-name:var(--font-inter)] text-sm font-medium">
              <Sparkles className="h-4 w-4 mr-2" />
              {t("hero.badge")}
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold font-[family-name:var(--font-manrope)] text-foreground leading-[1.1] mb-6 tracking-tight">
              {t("hero.title")} <br />
              <span className="text-primary italic">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="editorial-gradient text-white px-8 py-4 rounded-xl font-[family-name:var(--font-manrope)] font-bold text-lg shadow-xl shadow-primary/20 hover:scale-95 transition-transform duration-200 text-center"
              >
                {t("hero.cta")}
              </Link>
              <a
                href="#pricing"
                className="bg-[var(--editorial-surface-container-high)] text-foreground px-8 py-4 rounded-xl font-[family-name:var(--font-manrope)] font-bold text-lg hover:bg-[var(--editorial-surface-container)] transition-colors text-center"
              >
                {t("hero.ctaSecondary")}
              </a>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <div className="relative">
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[var(--editorial-tertiary)]/5 rounded-full blur-3xl" />
              {/* Editorial Canvas Card */}
              <div className="bg-card rounded-2xl p-6 shadow-2xl dark:shadow-none dark:ring-1 dark:ring-white/10 relative border border-border/10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--editorial-primary-container)] flex items-center justify-center text-white font-bold">
                      JD
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">
                        {t("heroCard.title")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("heroCard.subtitle")}
                      </div>
                    </div>
                  </div>
                  <div className="text-[var(--editorial-tertiary)] font-[family-name:var(--font-inter)] text-xs font-bold uppercase tracking-widest px-2 py-1 bg-[var(--editorial-tertiary-container)]/10 rounded">
                    {t("heroCard.badge")}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[var(--editorial-surface-container-low)] border-l-4 border-primary">
                    <div className="text-xs font-bold text-primary uppercase mb-1">
                      {t("heroCard.outcomeLabel")}
                    </div>
                    <div className="text-sm text-foreground font-medium">
                      {t("heroCard.outcomeText")}{" "}
                      <span className="text-[var(--editorial-tertiary)] font-bold">
                        {t("heroCard.outcomeStatus")}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-card">
                    <div className="flex gap-3">
                      <Lightbulb className="h-6 w-6 text-primary flex-shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          {t("heroCard.aiTitle")}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {t("heroCard.aiText")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Feature Grid Section */}
      <section id="features" className="py-24 px-8 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <h2 className="text-4xl font-[family-name:var(--font-manrope)] font-extrabold mb-6">
              {t("features.title")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("features.subtitle")}
            </p>
          </div>
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            {/* Feature 1 */}
            <div className="md:col-span-3 bg-card p-8 rounded-2xl shadow-sm dark:shadow-none border border-border/10 dark:border-white/5 group hover:shadow-xl dark:hover:border-white/10 transition-all">
              <div className="w-14 h-14 bg-[var(--editorial-primary-container)] rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-[family-name:var(--font-manrope)] font-bold mb-4">
                {t("features.structured.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t("features.structured.description")}
              </p>
              <div className="h-32 bg-[var(--editorial-surface-container)] rounded-lg relative overflow-hidden">
                <div className="absolute top-4 left-4 right-4 h-6 bg-white dark:bg-white/10 rounded-md shadow-sm dark:shadow-none" />
                <div className="absolute top-14 left-4 right-12 h-6 bg-white dark:bg-white/10 rounded-md shadow-sm dark:shadow-none" />
                <div className="absolute top-24 left-4 right-8 h-6 bg-white dark:bg-white/10 rounded-md shadow-sm dark:shadow-none" />
              </div>
            </div>
            {/* Feature 2 */}
            <div className="md:col-span-3 bg-card p-8 rounded-2xl shadow-sm dark:shadow-none border border-border/10 dark:border-white/5 group hover:shadow-xl dark:hover:border-white/10 transition-all">
              <div className="w-14 h-14 bg-[var(--editorial-tertiary-container)] rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                <Brain className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-[family-name:var(--font-manrope)] font-bold mb-4">
                {t("features.ai.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t("features.ai.description")}
              </p>
              <div className="p-4 bg-[var(--editorial-tertiary-container)]/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--editorial-tertiary)]" />
                  <div className="text-[10px] font-bold text-[var(--editorial-tertiary)] uppercase">
                    {t("features.ai.sentimentLabel")}
                  </div>
                </div>
                <div className="w-full bg-[var(--editorial-tertiary)]/20 h-2 rounded-full overflow-hidden">
                  <div className="w-4/5 h-full bg-[var(--editorial-tertiary)]" />
                </div>
              </div>
            </div>
            {/* Feature 3 */}
            <div className="md:col-span-2 bg-[var(--editorial-surface-container-low)] p-8 rounded-2xl group hover:bg-card transition-colors">
              <CheckCircle className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-[family-name:var(--font-manrope)] font-bold mb-2">
                {t("features.actionItems.title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("features.actionItems.description")}
              </p>
            </div>
            {/* Feature 4 */}
            <div className="md:col-span-2 bg-[var(--editorial-surface-container-low)] p-8 rounded-2xl group hover:bg-card transition-colors">
              <BarChart3 className="h-10 w-10 text-[var(--editorial-tertiary)] mb-4" />
              <h3 className="text-xl font-[family-name:var(--font-manrope)] font-bold mb-2">
                {t("features.teamHealth.title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("features.teamHealth.description")}
              </p>
            </div>
            {/* Feature 5 */}
            <div className="md:col-span-2 bg-[var(--editorial-surface-container-low)] p-8 rounded-2xl group hover:bg-card transition-colors">
              <Shield className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-[family-name:var(--font-manrope)] font-bold mb-2">
                {t("features.security.title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("features.security.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section
        id="methodology"
        className="py-24 px-8 bg-[var(--editorial-surface-container-low)]"
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center text-4xl font-[family-name:var(--font-manrope)] font-extrabold mb-20">
            {t("howItWorks.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <div className="relative z-10 text-center md:text-left">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xl mb-6 mx-auto md:mx-0">
                1
              </div>
              <h3 className="text-2xl font-[family-name:var(--font-manrope)] font-bold mb-4">
                {t("howItWorks.step1.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("howItWorks.step1.description")}
              </p>
            </div>
            {/* Step 2 */}
            <div className="relative z-10 text-center md:text-left">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xl mb-6 mx-auto md:mx-0">
                2
              </div>
              <h3 className="text-2xl font-[family-name:var(--font-manrope)] font-bold mb-4">
                {t("howItWorks.step2.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("howItWorks.step2.description")}
              </p>
            </div>
            {/* Step 3 */}
            <div className="relative z-10 text-center md:text-left">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xl mb-6 mx-auto md:mx-0">
                3
              </div>
              <h3 className="text-2xl font-[family-name:var(--font-manrope)] font-bold mb-4">
                {t("howItWorks.step3.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("howItWorks.step3.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-8 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-[family-name:var(--font-manrope)] font-extrabold mb-4">
              {t("pricing.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("pricing.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tier 1: Free */}
            <div className="bg-[var(--editorial-surface-container-low)] p-8 rounded-2xl flex flex-col h-full border border-border/5">
              <div className="mb-8">
                <h3 className="text-lg font-bold font-[family-name:var(--font-manrope)] mb-2">
                  {t("pricing.free.name")}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">&euro;{t("pricing.free.price")}</span>
                  <span className="text-muted-foreground text-sm">{t("pricing.free.period")}</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.free.features.users")}
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.free.features.templates")}
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.free.features.actionItems")}
                </li>
              </ul>
              <Link
                href="/register"
                className="w-full py-3 rounded-lg border-2 border-[var(--editorial-outline)] font-bold hover:bg-[var(--editorial-surface-container-high)] transition-colors text-center block"
              >
                {t("pricing.free.cta")}
              </Link>
            </div>
            {/* Tier 2: Pro */}
            <div className="bg-card p-8 rounded-2xl flex flex-col h-full border-2 border-primary shadow-xl dark:shadow-none dark:ring-1 dark:ring-primary/30 relative scale-100 md:scale-105 z-10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">
                {t("pricing.pro.badge")}
              </div>
              <div className="mb-8">
                <h3 className="text-lg font-bold font-[family-name:var(--font-manrope)] mb-2">
                  {t("pricing.pro.name")}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">&euro;{t("pricing.pro.price")}</span>
                  <span className="text-muted-foreground text-sm">
                    {t("pricing.pro.period")}
                  </span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.pro.features.users")}
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.pro.features.templates")}
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.pro.features.analytics")}
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-primary">
                  <Check className="h-5 w-5 flex-shrink-0" />
                  {t("pricing.pro.features.engagementAnalytics")}
                </li>
              </ul>
              <Link
                href="/register?plan=pro"
                className="w-full py-3 rounded-lg editorial-gradient text-white font-bold shadow-lg shadow-primary/20 text-center block"
              >
                {t("pricing.pro.cta")}
              </Link>
            </div>
            {/* Tier 3: Business */}
            <div className="bg-[var(--editorial-surface-container-low)] p-8 rounded-2xl flex flex-col h-full border border-border/5">
              <div className="mb-8">
                <h3 className="text-lg font-bold font-[family-name:var(--font-manrope)] mb-2">
                  {t("pricing.business.name")}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">&euro;{t("pricing.business.price")}</span>
                  <span className="text-muted-foreground text-sm">
                    {t("pricing.business.period")}
                  </span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.business.features.everything")}
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-[var(--editorial-tertiary)]">
                  <Sparkles className="h-5 w-5 flex-shrink-0" />
                  {t("pricing.business.features.ai")}
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.business.features.api")}
                </li>
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0" />
                  {t("pricing.business.features.support")}
                </li>
              </ul>
              <Link
                href="/register?plan=business"
                className="w-full py-3 rounded-lg border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-colors text-center block"
              >
                {t("pricing.business.cta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-8 bg-[var(--editorial-surface-container-low)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-[family-name:var(--font-manrope)] font-extrabold mb-12 text-center">
            {t("faq.title")}
          </h2>
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-xl shadow-sm dark:shadow-none border border-transparent dark:border-white/5">
              <h4 className="font-bold text-foreground mb-2">
                {t("faq.q1.question")}
              </h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("faq.q1.answer")}
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl shadow-sm dark:shadow-none border border-transparent dark:border-white/5">
              <h4 className="font-bold text-foreground mb-2">
                {t("faq.q2.question")}
              </h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("faq.q2.answer")}
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl shadow-sm dark:shadow-none border border-transparent dark:border-white/5">
              <h4 className="font-bold text-foreground mb-2">
                {t("faq.q3.question")}
              </h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("faq.q3.answer")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary z-0">
          <div
            className="absolute top-0 right-0 w-full h-full opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-[family-name:var(--font-manrope)] font-extrabold text-white mb-8">
            {t("finalCta.title")}
          </h2>
          <p className="text-[var(--editorial-primary-fixed-dim)] text-xl mb-12 max-w-2xl mx-auto">
            {t("finalCta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link
              href="/register"
              className="bg-white text-primary px-10 py-5 rounded-xl font-[family-name:var(--font-manrope)] font-extrabold text-xl shadow-2xl hover:scale-105 transition-all text-center"
            >
              {t("finalCta.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 w-full py-12 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col gap-4 items-center md:items-start">
            <Logo className="h-6" />
            <p className="font-[family-name:var(--font-inter)] text-xs text-slate-500 dark:text-slate-400">
              &copy; {t("footer.copyright")}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a
              className="font-[family-name:var(--font-inter)] text-xs text-slate-500 dark:text-slate-400 hover:text-primary transition-all hover:opacity-80"
              href="#"
            >
              {t("footer.privacy")}
            </a>
            <a
              className="font-[family-name:var(--font-inter)] text-xs text-slate-500 dark:text-slate-400 hover:text-primary transition-all hover:opacity-80"
              href="#"
            >
              {t("footer.terms")}
            </a>
            <a
              className="font-[family-name:var(--font-inter)] text-xs text-slate-500 dark:text-slate-400 hover:text-primary transition-all hover:opacity-80"
              href="#"
            >
              {t("footer.security")}
            </a>
          </div>
          <div className="flex gap-4">
            <Globe className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
            <Share2 className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
          </div>
        </div>
      </footer>
    </div>
  );
}
