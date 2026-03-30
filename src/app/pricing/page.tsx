import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/app/(marketing)/_components/language-switcher";
import { MarketingFooter } from "@/app/(marketing)/_components/marketing-footer";
import { MobileNav } from "@/app/(marketing)/_components/mobile-nav";
import { PricingContent } from "@/components/billing/pricing-content";

export const metadata: Metadata = {
  title: "Pricing | 1on1",
  description:
    "Simple, transparent pricing for structured one-on-one meetings. Start free, upgrade when you're ready.",
};

export default async function PricingPage() {
  const t = await getTranslations("landing");

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Full marketing nav */}
      <nav className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm dark:shadow-none z-50">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <Link href="/">
            <Logo className="h-8" />
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <Link
              className="text-muted-foreground font-[family-name:var(--font-manrope)] text-sm font-medium tracking-tight hover:text-primary transition-colors"
              href="/#features"
            >
              {t("nav.features")}
            </Link>
            <span className="text-foreground font-semibold font-[family-name:var(--font-manrope)] text-sm tracking-tight">
              {t("nav.pricing")}
            </span>
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

      {/* Pricing content */}
      <div className="flex-1">
        <PricingContent />
      </div>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
