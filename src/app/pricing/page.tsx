import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PricingContent } from "@/components/billing/pricing-content";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Pricing | 1on1",
  description:
    "Simple, transparent pricing for structured one-on-one meetings. Start free, upgrade when you're ready.",
};

export default async function PricingPage() {
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <Link href="/">
          <Logo className="h-8" />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("login.title")}
          </Link>
        </div>
      </header>

      {/* Pricing content */}
      <PricingContent />
    </div>
  );
}
