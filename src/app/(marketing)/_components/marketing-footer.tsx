"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Github, Linkedin, Twitter } from "lucide-react";
import { Logo } from "@/components/logo";

export function MarketingFooter() {
  const t = useTranslations("landing.footer");

  return (
    <footer className="w-full border-t border-slate-200/20 dark:border-slate-800/20 bg-slate-50 dark:bg-slate-950">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-12 px-8 py-16 max-w-7xl mx-auto text-sm leading-relaxed">
        <div>
          <Logo className="h-6 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
            {t("tagline")}
          </p>
        </div>
        <div>
          <h4 className="font-bold text-foreground mb-6 font-[family-name:var(--font-manrope)]">
            {t("product")}
          </h4>
          <ul className="space-y-4 text-slate-500 dark:text-slate-400">
            <li>
              <Link href="/#features" className="hover:text-foreground transition-colors">
                {t("productFeatures")}
              </Link>
            </li>
            <li>
              <Link href="/#pricing" className="hover:text-foreground transition-colors">
                {t("productPricing")}
              </Link>
            </li>
            <li>
              <Link href="/security" className="hover:text-foreground transition-colors">
                {t("productSecurity")}
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/aibaza/1on1/blob/main/CHANGELOG.md"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {t("productChangelog")}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-foreground mb-6 font-[family-name:var(--font-manrope)]">
            {t("resources")}
          </h4>
          <ul className="space-y-4 text-slate-500 dark:text-slate-400">
            <li>
              <a
                href="https://github.com/aibaza/1on1/wiki"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {t("resourcesDocs")}
              </a>
            </li>
            <li>
              <a
                href="https://github.com/aibaza/1on1"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {t("resourcesGithub")}
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                {t("resourcesCommunity")}
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                {t("resourcesBlog")}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-foreground mb-6 font-[family-name:var(--font-manrope)]">
            {t("company")}
          </h4>
          <ul className="space-y-4 text-slate-500 dark:text-slate-400">
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                {t("companyAbout")}
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                {t("companyContact")}
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                {t("companyPrivacy")}
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                {t("companyTerms")}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-8 pb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/10 dark:border-slate-800/10 pt-8">
        <p className="text-slate-400 text-xs">
          &copy; {t("copyright")}
        </p>
        <div className="flex gap-4">
          <a
            href="https://github.com/aibaza/1on1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href="#"
            className="text-slate-400 hover:text-foreground transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-5 w-5" />
          </a>
          <a
            href="#"
            className="text-slate-400 hover:text-foreground transition-colors"
            aria-label="Twitter"
          >
            <Twitter className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
