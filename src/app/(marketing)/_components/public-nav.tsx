"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "./language-switcher";

/**
 * Minimal navigation bar for auth pages (login, register, forgot-password, etc.)
 * Shows logo, "back to home" link, language switcher, and theme toggle.
 */
export function PublicNav() {
  const t = useTranslations("landing.nav");

  return (
    <nav className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm dark:shadow-none z-50">
      <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-8" />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground font-medium font-[family-name:var(--font-manrope)] transition-colors hidden sm:inline"
          >
            &larr; {t("features")}
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
