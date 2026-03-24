"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations, useFormatter } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loginAction } from "@/lib/auth/actions";
import { InlineAlert } from "@/components/ui/inline-alert";

export function ClassicLogin() {
  const t = useTranslations("auth");
  const format = useFormatter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      // Redirect errors are re-thrown by the server action and handled by Next.js
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{t("login.title")}</CardTitle>
        <CardDescription>
          {t("login.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {(error || errorMessage) && (
            <InlineAlert variant="error">
              {error || errorMessage}
            </InlineAlert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("login.emailPlaceholder")}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("login.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
            <Link
              href="/forgot-password"
              tabIndex={-1}
              className="inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("login.forgotPassword")}
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("login.submitting") : t("login.submit")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {t("login.noAccount")}{" "}
          <Link
            href="/register"
            className="font-medium text-foreground hover:underline"
          >
            {t("login.createOrg")}
          </Link>
        </p>
      </CardFooter>
      {/* Formatting pipeline proof: locale-aware date rendering */}
      <data
        value={format.dateTime(new Date("2026-01-01"), { year: "numeric" })}
        data-testid="i18n-format-proof"
        hidden
      />
    </Card>
  );
}
