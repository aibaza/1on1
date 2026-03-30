import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "./mobile-nav";
import { LanguageSwitcher } from "./language-switcher";

interface MarketingNavProps {
  /** Which nav link to highlight as active */
  activeLink?: "features" | "pricing" | "security";
}

/**
 * Full marketing navigation bar — used on homepage, pricing, auth pages,
 * and any other public-facing page.
 */
export async function MarketingNav({ activeLink }: MarketingNavProps = {}) {
  const t = await getTranslations("landing");

  const linkClass = (key: string) =>
    key === activeLink
      ? "text-foreground font-semibold border-b-2 border-primary font-[family-name:var(--font-manrope)] text-sm tracking-tight transition-colors"
      : "text-muted-foreground font-[family-name:var(--font-manrope)] text-sm font-medium tracking-tight hover:text-primary transition-colors";

  return (
    <nav className="w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm dark:shadow-none">
      <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
        <Link href="/" className="text-2xl font-bold tracking-tighter text-foreground font-[family-name:var(--font-manrope)]">
          <Logo className="h-8" />
        </Link>
        <div className="hidden md:flex items-center space-x-8">
          <Link className={linkClass("features")} href="/#features">
            {t("nav.features")}
          </Link>
          <Link className={linkClass("pricing")} href="/#pricing">
            {t("nav.pricing")}
          </Link>
          <Link className={linkClass("security")} href="/security">
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
  );
}
