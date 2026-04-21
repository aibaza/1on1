"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { loginAction, signInWithGoogle } from "@/lib/auth/actions";
import { Logo } from "@/components/logo";

export function EditorialLogin() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const urlError = searchParams.get("error");
  const errorMessage =
    urlError === "CredentialsSignin"
      ? t("login.errors.invalidCredentials")
      : urlError === "AccessDenied"
        ? t("login.errors.accessDenied")
        : urlError === "OAuthAccountNotLinked"
          ? t("login.errors.oauthLinked")
          : urlError
            ? t("login.errors.generic")
            : "";

  async function handleSubmit(formData: FormData) {
    setError("");
    setLoading(true);

    try {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // Redirect errors handled by Next.js
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-140px)]">
      {/* Visual Column */}
      <section className="hidden md:flex md:w-1/2 relative overflow-hidden items-center justify-center p-12"
        style={{
          backgroundColor: "#29407d",
          backgroundImage: [
            "radial-gradient(at 0% 0%, hsla(175, 100%, 33%, 0.15) 0px, transparent 50%)",
            "radial-gradient(at 100% 100%, hsla(225, 50%, 48%, 0.2) 0px, transparent 50%)",
            "radial-gradient(at 50% 50%, hsla(225, 45%, 33%, 0.1) 0px, transparent 80%)",
          ].join(", "),
        }}
      >
        <div className="relative z-10 max-w-lg">
          <div className="mb-12">
            <span className="font-bold tracking-widest text-sm uppercase" style={{ color: "#71d7cd" }}>
              {t("login.heroTagline")}
            </span>
            <h1 className="font-headline text-5xl font-extrabold leading-tight mt-4" style={{ color: "#dbe1ff" }}>
              {t("login.heroTitle")}
            </h1>
            <p className="mt-6 text-lg leading-relaxed opacity-90" style={{ color: "#b4c5ff" }}>
              {t("login.heroDescription")}
            </p>
          </div>

          {/* Logo visual element */}
          <div className="relative w-full aspect-square max-w-sm mx-auto">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full blur-xl opacity-40 editorial-gradient animate-pulse" />
              <div className="w-48 h-48 rounded-full border absolute -rotate-12" style={{ borderColor: "rgba(180, 197, 255, 0.2)" }} />
              <div className="w-48 h-48 rounded-full border absolute rotate-45" style={{ borderColor: "rgba(113, 215, 205, 0.2)" }} />

              {/* Centered logo */}
              <div className="absolute inset-0 flex items-center justify-center" style={{ ["--logo-color" as string]: "#71d7cd" }}>
                <Logo className="h-16 w-auto drop-shadow-lg" />
              </div>

              {/* Floating glass cards */}
              <div className="absolute top-0 right-0 w-32 h-20 rounded-xl p-4 transform translate-x-4 -translate-y-4 shadow-2xl"
                style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <div className="w-8 h-2 rounded mb-2" style={{ background: "rgba(113, 215, 205, 0.4)" }} />
                <div className="w-16 h-2 rounded" style={{ background: "rgba(255,255,255,0.2)" }} />
              </div>
              <div className="absolute bottom-4 left-0 w-40 h-24 rounded-xl p-4 transform -translate-x-8 translate-y-4 shadow-2xl"
                style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full" style={{ background: "rgba(180, 197, 255, 0.3)" }} />
                  <div className="w-12 h-2 rounded" style={{ background: "rgba(255,255,255,0.2)" }} />
                </div>
                <div className="w-full h-2 rounded mb-2" style={{ background: "rgba(255,255,255,0.1)" }} />
                <div className="w-3/4 h-2 rounded" style={{ background: "rgba(255,255,255,0.1)" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Background blur element */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(0, 102, 95, 0.1)" }} />
      </section>

      {/* Form Column */}
      <section className="flex-1 flex flex-col justify-center px-6 md:px-24 py-12 bg-[var(--background)]">
        <div className="max-w-md w-full mx-auto">
          {/* Brand anchor */}
          <Link href="/" className="mb-12 block">
            <Logo className="h-8" />
          </Link>

          <div className="mb-10">
            <h3 className="font-headline text-3xl font-extrabold text-[var(--foreground)] tracking-tight mb-2">
              {t("login.title")}
            </h3>
            <p className="text-[var(--muted-foreground)] font-medium">
              {t("login.description")}
            </p>
          </div>

          {/* Login form */}
          <form
            action={handleSubmit}
            className="space-y-6"
            suppressHydrationWarning
          >
            {(error || errorMessage) && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium"
                style={{ background: "rgba(186, 26, 26, 0.08)", color: "#ba1a1a" }}>
                {error || errorMessage}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[var(--muted-foreground)] mb-2 ml-1">
                {t("login.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder={t("login.emailPlaceholder")}
                required
                autoComplete="email"
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-[var(--foreground)] transition-all placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-primary/40 focus:outline-none"
                style={{
                  background: "var(--editorial-surface-container-low, #f2f4f5)",
                  border: "none",
                }}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2 px-1">
                <label htmlFor="password" className="text-sm font-semibold text-[var(--muted-foreground)]">
                  {t("login.password")}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold transition-colors"
                  style={{ color: "#29407d" }}
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 text-[var(--foreground)] transition-all placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  style={{
                    background: "var(--editorial-surface-container-low, #f2f4f5)",
                    border: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-headline font-bold py-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, var(--primary, #29407d) 0%, var(--editorial-primary-container, #425797) 100%)",
                color: "#ffffff",
              }}
            >
              {loading ? t("login.submitting") : t("login.submit")}
              {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--background)] px-3 text-[var(--muted-foreground)] font-semibold tracking-widest">
                {t("login.orContinueWith")}
              </span>
            </div>
          </div>

          {/* OAuth buttons */}
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-semibold text-sm transition-all hover:shadow-md active:scale-[0.98]"
              style={{
                background: "var(--editorial-surface-container-low, #f2f4f5)",
                color: "var(--foreground)",
                border: "1px solid var(--border, #e0e0e0)",
              }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t("login.google")}
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("login.noAccount")}{" "}
              <Link
                href="/register"
                className="font-bold hover:underline"
                style={{ color: "#29407d" }}
              >
                {t("login.createOrg")}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
