import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Sparkles,
  Star,
  Terminal,
  PenLine,
  Brain,
  CheckCircle,
  Shield,
  BarChart3,
  AlertTriangle,
  Check,
  XCircle,
} from "lucide-react";
import { auth } from "@/lib/auth/config";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "./_components/mobile-nav";
import { LanguageSwitcher } from "./_components/language-switcher";
import { MarketingFooter } from "./_components/marketing-footer";

export const metadata: Metadata = {
  title: "1on1 | Guided AI-Enhanced One-on-One Meetings",
  description:
    "Turn unstructured check-ins into guided, AI-enhanced conversations with built-in accountability. Open source.",
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
      <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm dark:shadow-none">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold tracking-tighter text-foreground font-[family-name:var(--font-manrope)]">
            <Logo className="h-8" />
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <a
              className="text-foreground font-semibold font-[family-name:var(--font-manrope)] text-sm tracking-tight hover:text-primary transition-colors"
              href="#features"
            >
              {t("nav.features")}
            </a>
            <a
              className="text-muted-foreground font-[family-name:var(--font-manrope)] text-sm font-medium tracking-tight hover:text-primary transition-colors"
              href="#pricing"
            >
              {t("nav.pricing")}
            </a>
            <Link
              className="text-muted-foreground font-[family-name:var(--font-manrope)] text-sm font-medium tracking-tight hover:text-primary transition-colors"
              href="/security"
            >
              {t("nav.security")}
            </Link>
            <a
              className="text-muted-foreground font-[family-name:var(--font-manrope)] text-sm font-medium tracking-tight hover:text-primary transition-colors"
              href="https://github.com/aibaza/1on1"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("nav.openSource")}
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
              className="editorial-gradient text-white px-5 py-2.5 rounded-xl font-[family-name:var(--font-manrope)] text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-95 duration-150 transition-transform"
            >
              {t("nav.getStarted")}
            </Link>
          </div>
          <MobileNav />
        </div>
      </nav>

      <main className="pt-32">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-16 items-center mb-32">
          <div>
            <h1 className="font-[family-name:var(--font-manrope)] text-5xl md:text-6xl font-extrabold text-foreground leading-[1.1] mb-6 tracking-tight">
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

          {/* Hero Card — product mockup */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-[var(--editorial-tertiary)]/10 blur-3xl rounded-full" />
            <div className="relative bg-card p-8 rounded-[2rem] shadow-2xl dark:shadow-none dark:ring-1 dark:ring-white/10 border border-border/10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--editorial-primary-container)] flex items-center justify-center text-white font-bold text-lg">
                    SC
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{t("heroCard.name")}</h3>
                    <p className="text-muted-foreground text-sm">{t("heroCard.role")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-[var(--editorial-tertiary)] font-bold text-xl">
                    {t("heroCard.score")}
                    <Star className="h-4 w-4 ml-1 fill-current" />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                    {t("heroCard.pulseLabel")}
                  </p>
                </div>
              </div>

              {/* Sparkline */}
              <div className="bg-[var(--editorial-surface-container-low)] rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground">
                    {t("heroCard.sentimentLabel")}
                  </span>
                  <span className="text-xs font-bold text-[var(--editorial-tertiary)]">
                    {t("heroCard.sentimentTrend")}
                  </span>
                </div>
                <div className="h-12 flex items-end gap-1">
                  <div className="flex-1 bg-[var(--editorial-tertiary)]/20 rounded-t-sm h-1/2" />
                  <div className="flex-1 bg-[var(--editorial-tertiary)]/20 rounded-t-sm h-2/3" />
                  <div className="flex-1 bg-[var(--editorial-tertiary)]/30 rounded-t-sm h-1/2" />
                  <div className="flex-1 bg-[var(--editorial-tertiary)]/40 rounded-t-sm h-3/4" />
                  <div className="flex-1 bg-[var(--editorial-tertiary)]/60 rounded-t-sm h-full" />
                  <div className="flex-1 bg-primary rounded-t-sm h-5/6" />
                </div>
              </div>

              {/* AI Insight */}
              <div className="flex gap-3 items-start">
                <div className="p-2 bg-primary/5 rounded-lg">
                  <Sparkles className="h-5 w-5 text-[var(--editorial-primary-container)]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary">{t("heroCard.aiTitle")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("heroCard.aiText")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Showcase Section */}
        <section className="bg-[var(--editorial-surface-container-low)] py-32">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Panel A: The Wizard */}
              <div className="bg-card p-8 rounded-[2.5rem] flex flex-col items-center text-center shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/5">
                <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-900 rounded-[3rem] w-full max-w-[280px] border-[6px] border-foreground/5">
                  {/* Step indicators */}
                  <div className="flex justify-between items-center mb-6 px-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="w-2 h-2 rounded-full bg-border" />
                    <div className="w-2 h-2 rounded-full bg-border" />
                    <div className="w-2 h-2 rounded-full bg-border" />
                  </div>
                  <h4 className="font-[family-name:var(--font-manrope)] font-bold mb-2">
                    {t("showcase.wizard.stepLabel")}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-6 leading-relaxed px-4">
                    {t("showcase.wizard.question")}
                  </p>
                  <div className="flex justify-center gap-1 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                      <Star
                        key={i}
                        className="h-6 w-6 text-[var(--editorial-tertiary)] fill-[var(--editorial-tertiary)]"
                      />
                    ))}
                    <Star className="h-6 w-6 text-border" />
                  </div>
                  <div className="bg-primary text-white py-2 rounded-lg text-xs font-bold mx-4">
                    {t("showcase.wizard.nextStep")}
                  </div>
                </div>
                <h3 className="font-[family-name:var(--font-manrope)] text-2xl font-bold mb-3">
                  {t("showcase.wizard.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("showcase.wizard.description")}
                </p>
              </div>

              {/* Panel B: AI Insights */}
              <div className="bg-card p-8 rounded-[2.5rem] shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/5">
                <div className="mb-8 space-y-4">
                  <div className="bg-[var(--editorial-surface-container-low)] p-4 rounded-2xl border-l-4 border-primary">
                    <p className="text-xs font-bold text-primary mb-1">
                      {t("showcase.ai.suggestion1Label")}
                    </p>
                    <p className="text-sm font-medium mb-3">
                      {t("showcase.ai.suggestion1Text")}
                    </p>
                    <div className="flex gap-2">
                      <span className="bg-primary text-white text-[10px] px-3 py-1 rounded-full font-bold">
                        {t("showcase.ai.accept")}
                      </span>
                      <span className="bg-[var(--editorial-surface-container-high)] text-foreground text-[10px] px-3 py-1 rounded-full font-bold">
                        {t("showcase.ai.skip")}
                      </span>
                    </div>
                  </div>
                  <div className="bg-[var(--editorial-surface-container-low)] p-4 rounded-2xl border-l-4 border-[var(--editorial-tertiary)]">
                    <p className="text-xs font-bold text-[var(--editorial-tertiary)] mb-1">
                      {t("showcase.ai.suggestion2Label")}
                    </p>
                    <p className="text-sm font-medium">
                      {t("showcase.ai.suggestion2Text")}
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="font-[family-name:var(--font-manrope)] text-2xl font-bold mb-3">
                    {t("showcase.ai.title")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("showcase.ai.description")}
                  </p>
                </div>
              </div>

              {/* Panel C: Team Dashboard */}
              <div className="bg-card p-8 rounded-[2.5rem] shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/5">
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-[var(--editorial-tertiary)]/5 p-4 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-[var(--editorial-tertiary)] uppercase">
                      {t("showcase.dashboard.healthLabel")}
                    </p>
                    <p className="text-2xl font-bold text-[var(--editorial-tertiary)]">
                      {t("showcase.dashboard.healthValue")}
                    </p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-primary uppercase">
                      {t("showcase.dashboard.actionsLabel")}
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {t("showcase.dashboard.actionsValue")}
                    </p>
                  </div>
                  <div className="col-span-2 bg-destructive/5 p-4 rounded-2xl flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                    <p className="text-xs font-bold text-destructive">
                      {t("showcase.dashboard.alertText")}
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="font-[family-name:var(--font-manrope)] text-2xl font-bold mb-3">
                    {t("showcase.dashboard.title")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("showcase.dashboard.description")}
                  </p>
                </div>
              </div>
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
              <PenLine className="h-8 w-8 text-primary mb-6" />
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-3">
                {t("features.guided.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("features.guided.description")}
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-card border border-border/10 dark:border-white/5 hover:shadow-xl transition-all">
              <Brain className="h-8 w-8 text-primary mb-6" />
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-3">
                {t("features.ai.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("features.ai.description")}
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-card border border-border/10 dark:border-white/5 hover:shadow-xl transition-all">
              <CheckCircle className="h-8 w-8 text-primary mb-6" />
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-3">
                {t("features.actionItems.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("features.actionItems.description")}
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-card border border-border/10 dark:border-white/5 hover:shadow-xl transition-all">
              <Shield className="h-8 w-8 text-primary mb-6" />
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-3">
                {t("features.security.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("features.security.description")}
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-card border border-border/10 dark:border-white/5 hover:shadow-xl transition-all md:col-span-2 lg:col-span-1">
              <BarChart3 className="h-8 w-8 text-primary mb-6" />
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold mb-3">
                {t("features.teamHealth.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("features.teamHealth.description")}
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
            <div className="bg-[var(--editorial-surface-container-low)] p-10 rounded-[2.5rem] border border-border/10 flex flex-col">
              <h3 className="font-bold text-xl mb-2">{t("pricing.free.name")}</h3>
              <div className="flex items-baseline mb-8">
                <span className="text-4xl font-extrabold">&euro;{t("pricing.free.price")}</span>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0 fill-[var(--editorial-tertiary)]/10" />
                  {t("pricing.free.features.users")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0 fill-[var(--editorial-tertiary)]/10" />
                  {t("pricing.free.features.templates")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                  <XCircle className="h-5 w-5 flex-shrink-0" />
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
            <div className="bg-card p-10 rounded-[2.5rem] border-2 border-primary shadow-2xl dark:shadow-none dark:ring-1 dark:ring-primary/30 flex flex-col relative overflow-hidden scale-100 md:scale-105 z-10">
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
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0 fill-[var(--editorial-tertiary)]/10" />
                  {t("pricing.pro.features.users")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0 fill-[var(--editorial-tertiary)]/10" />
                  {t("pricing.pro.features.ai")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0 fill-[var(--editorial-tertiary)]/10" />
                  {t("pricing.pro.features.sentiment")}
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
            <div className="bg-[var(--editorial-surface-container-low)] p-10 rounded-[2.5rem] border border-border/10 flex flex-col">
              <h3 className="font-bold text-xl mb-2">{t("pricing.enterprise.name")}</h3>
              <div className="flex items-baseline mb-8">
                <span className="text-4xl font-extrabold">&euro;{t("pricing.enterprise.price")}</span>
                <span className="text-muted-foreground text-sm ml-2">
                  {t("pricing.enterprise.period")}
                </span>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0 fill-[var(--editorial-tertiary)]/10" />
                  {t("pricing.enterprise.features.selfHost")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0 fill-[var(--editorial-tertiary)]/10" />
                  {t("pricing.enterprise.features.sso")}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle className="h-5 w-5 text-[var(--editorial-tertiary)] flex-shrink-0 fill-[var(--editorial-tertiary)]/10" />
                  {t("pricing.enterprise.features.retention")}
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
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-primary to-[var(--editorial-primary-container)] p-16 rounded-[3rem] text-white shadow-2xl">
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
