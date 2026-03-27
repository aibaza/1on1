"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Heart, CheckCircle, Eye, EyeOff, Sparkles } from "lucide-react";
import { registerAction } from "@/lib/auth/actions";
import { useZodI18nErrors } from "@/lib/i18n/zod-error-map";
import { Logo } from "@/components/logo";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  useZodI18nErrors();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orgType, setOrgType] = useState("for_profit");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError("");
    setLoading(true);

    try {
      formData.set("orgType", orgType);
      if (planParam && (planParam === "pro" || planParam === "enterprise")) {
        formData.set("plan", planParam);
      }
      const result = await registerAction(formData);

      if (result?.error) {
        setError(result.error);
      }
      // On success, registerAction redirects server-side
    } catch {
      // Redirect errors are re-thrown and handled by Next.js;
      // other errors get a translated fallback
      setError(t("register.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Value Proposition (desktop only) */}
      <section
        className="hidden md:flex md:w-2/5 relative overflow-hidden flex-col justify-between p-16 sticky top-0 h-screen"
        style={{
          backgroundColor: "#29407d",
          backgroundImage: [
            "radial-gradient(at 0% 0%, hsla(175, 100%, 33%, 0.15) 0px, transparent 50%)",
            "radial-gradient(at 100% 100%, hsla(225, 50%, 48%, 0.2) 0px, transparent 50%)",
            "radial-gradient(at 50% 50%, hsla(225, 45%, 33%, 0.1) 0px, transparent 80%)",
          ].join(", "),
        }}
      >
        <div className="relative z-10 space-y-12">
          {/* Logo + brand */}
          <Link href="/" className="flex items-center gap-3" style={{ ["--logo-color" as string]: "#dbe1ff" }}>
            <Logo className="h-8" />
            <span className="font-headline font-extrabold tracking-tighter text-2xl" style={{ color: "#dbe1ff" }}>
              1on1
            </span>
          </Link>

          {/* Headline */}
          <div className="space-y-6">
            <h1
              className="font-headline font-extrabold text-5xl leading-tight tracking-tight"
              style={{ color: "#dbe1ff" }}
            >
              {t("register.sideTitle")}{" "}
              <br />
              <span className="italic" style={{ color: "#71d7cd" }}>
                {t("register.sideTitleHighlight")}
              </span>
            </h1>
            <p className="text-lg max-w-md leading-relaxed" style={{ color: "#b4c5ff" }}>
              {t("register.sideSubtitle")}
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-8 mt-12">
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 shrink-0" style={{ color: "#71d7cd" }} />
              <div>
                <h3 className="font-headline font-bold" style={{ color: "#dbe1ff" }}>
                  {t("register.benefit1Title")}
                </h3>
                <p className="text-sm" style={{ color: "#b4c5ff" }}>
                  {t("register.benefit1Description")}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 shrink-0" style={{ color: "#71d7cd" }} />
              <div>
                <h3 className="font-headline font-bold" style={{ color: "#dbe1ff" }}>
                  {t("register.benefit2Title")}
                </h3>
                <p className="text-sm" style={{ color: "#b4c5ff" }}>
                  {t("register.benefit2Description")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Abstract gradient visual (replaces the Google image) */}
        <div className="relative z-10 w-full rounded-2xl overflow-hidden h-48 mt-8">
          <div
            className="absolute inset-0"
            style={{
              background: [
                "linear-gradient(135deg, rgba(113, 215, 205, 0.3) 0%, transparent 50%)",
                "linear-gradient(225deg, rgba(180, 197, 255, 0.3) 0%, transparent 50%)",
                "linear-gradient(315deg, rgba(66, 87, 151, 0.4) 0%, transparent 50%)",
                "linear-gradient(45deg, rgba(41, 64, 125, 0.5) 0%, transparent 50%)",
              ].join(", "),
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center" style={{ ["--logo-color" as string]: "rgba(219, 225, 255, 0.15)" }}>
            <Logo className="h-24 w-auto" />
          </div>
          {/* Decorative circles */}
          <div
            className="absolute top-4 right-8 w-24 h-24 rounded-full"
            style={{ background: "rgba(113, 215, 205, 0.1)", border: "1px solid rgba(113, 215, 205, 0.15)" }}
          />
          <div
            className="absolute bottom-6 left-12 w-16 h-16 rounded-full"
            style={{ background: "rgba(180, 197, 255, 0.1)", border: "1px solid rgba(180, 197, 255, 0.15)" }}
          />
        </div>

        {/* Background blur element */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(0, 102, 95, 0.1)" }} />
      </section>

      {/* Right Panel — Form */}
      <section className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-24 bg-[var(--background)]">
        <div className="w-full max-w-xl">
          {/* Mobile logo */}
          <Link href="/" className="md:hidden flex items-center gap-2 mb-8">
            <Logo className="h-6" />
            <span className="font-headline font-extrabold tracking-tighter text-xl text-[var(--foreground)]">
              1on1
            </span>
          </Link>

          {/* Title */}
          <div className="mb-10">
            <h2 className="font-headline font-extrabold text-3xl md:text-4xl text-[var(--foreground)] mb-2">
              {t("register.title")}
            </h2>
            <p className="text-[var(--muted-foreground)]">
              {t("register.subtitle")}
            </p>
          </div>

          {/* Form */}
          <form action={handleSubmit} className="space-y-8">
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm font-medium"
                style={{ background: "rgba(186, 26, 26, 0.08)", color: "#ba1a1a" }}
              >
                {error}
              </div>
            )}

            {/* Organization type toggle */}
            <div className="space-y-4">
              <label className="font-headline font-bold text-xs text-[var(--muted-foreground)] tracking-widest block uppercase">
                {t("register.orgType")}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setOrgType("for_profit")}
                  className={`relative flex flex-col items-center justify-center p-5 rounded-xl cursor-pointer transition-all duration-300 shadow-sm ${
                    orgType === "for_profit"
                      ? "ring-2 ring-primary bg-[var(--background)]"
                      : "bg-[var(--editorial-surface-container-low,#f2f4f5)] hover:bg-[var(--editorial-surface-container,#eceeef)]"
                  }`}
                >
                  <Building2
                    className={`h-6 w-6 mb-2 transition-transform ${
                      orgType === "for_profit" ? "text-primary scale-110" : "text-[var(--muted-foreground)]"
                    }`}
                  />
                  <span className="font-semibold text-[var(--foreground)]">
                    {t("register.forProfit")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrgType("non_profit")}
                  className={`relative flex flex-col items-center justify-center p-5 rounded-xl cursor-pointer transition-all duration-300 shadow-sm ${
                    orgType === "non_profit"
                      ? "ring-2 ring-primary bg-[var(--background)]"
                      : "bg-[var(--editorial-surface-container-low,#f2f4f5)] hover:bg-[var(--editorial-surface-container,#eceeef)]"
                  }`}
                >
                  <Heart
                    className={`h-6 w-6 mb-2 transition-transform ${
                      orgType === "non_profit" ? "text-primary scale-110" : "text-[var(--muted-foreground)]"
                    }`}
                  />
                  <span className="font-semibold text-[var(--foreground)]">
                    {t("register.nonProfit")}
                  </span>
                </button>
              </div>
            </div>

            {/* Input fields */}
            <div className="space-y-6">
              {/* Company name */}
              <div>
                <label
                  htmlFor="companyName"
                  className="font-headline font-bold text-xs text-[var(--muted-foreground)] tracking-widest block mb-2 uppercase"
                >
                  {t("register.companyName")}
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  placeholder={t("register.companyPlaceholder")}
                  required
                  autoFocus
                  className="w-full rounded-xl border-0 px-5 py-4 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                  style={{
                    background: "var(--editorial-surface-container-low, #f2f4f5)",
                  }}
                />
              </div>

              {/* First name + Last name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="firstName"
                    className="font-headline font-bold text-xs text-[var(--muted-foreground)] tracking-widest block mb-2 uppercase"
                  >
                    {t("register.firstName")}
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder={t("register.firstNamePlaceholder")}
                    required
                    className="w-full rounded-xl border-0 px-5 py-4 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                    style={{
                      background: "var(--editorial-surface-container-low, #f2f4f5)",
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="font-headline font-bold text-xs text-[var(--muted-foreground)] tracking-widest block mb-2 uppercase"
                  >
                    {t("register.lastName")}
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder={t("register.lastNamePlaceholder")}
                    required
                    className="w-full rounded-xl border-0 px-5 py-4 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                    style={{
                      background: "var(--editorial-surface-container-low, #f2f4f5)",
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="font-headline font-bold text-xs text-[var(--muted-foreground)] tracking-widest block mb-2 uppercase"
                >
                  {t("register.workEmail")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("register.workEmailPlaceholder")}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border-0 px-5 py-4 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                  style={{
                    background: "var(--editorial-surface-container-low, #f2f4f5)",
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="font-headline font-bold text-xs text-[var(--muted-foreground)] tracking-widest block mb-2 uppercase"
                >
                  {t("register.password")}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("register.passwordPlaceholder")}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border-0 px-5 py-4 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                    style={{
                      background: "var(--editorial-surface-container-low, #f2f4f5)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1.5 ml-1">
                  {t("register.passwordHelp")}
                </p>
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 px-8 font-headline font-bold text-lg rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, var(--primary, #29407d) 0%, var(--editorial-primary-container, #425797) 100%)",
                  color: "#ffffff",
                }}
              >
                {loading ? t("register.submitting") : t("register.submit")}
              </button>
            </div>

            {/* Trial badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium text-[var(--muted-foreground)] bg-[var(--editorial-surface-container-low,#f2f4f5)]">
                <Sparkles className="h-3.5 w-3.5" style={{ color: "#71d7cd" }} />
                {t("register.trialBadge")}
              </span>
            </div>

            {/* Divider + sign in link */}
            <div className="flex flex-col items-center gap-6 pt-6">
              <div className="flex items-center gap-4 w-full">
                <div className="h-[1px] bg-[var(--border)] flex-1" />
                <span className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-widest">
                  {t("register.or")}
                </span>
                <div className="h-[1px] bg-[var(--border)] flex-1" />
              </div>
              <Link
                href="/login"
                className="text-[var(--muted-foreground)] hover:text-primary transition-colors flex items-center gap-2 group"
              >
                {t("register.hasAccount")}{" "}
                <span className="font-bold text-primary group-hover:underline underline-offset-4">
                  {t("register.signIn")}
                </span>
              </Link>
            </div>
          </form>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-[var(--border)]/10 text-center">
            <p className="text-[10px] text-[var(--muted-foreground)]/50 uppercase tracking-[0.2em]">
              &copy; 2026 1on1. All rights reserved.
            </p>
          </footer>
        </div>
      </section>
    </div>
  );
}
