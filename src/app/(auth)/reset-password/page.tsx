"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
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
import { resetPasswordAction } from "@/lib/auth/actions";
import { useZodI18nErrors } from "@/lib/i18n/zod-error-map";
import { InlineAlert } from "@/components/ui/inline-alert";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  useZodI18nErrors();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {t("resetPassword.invalidLink")}
          </CardTitle>
          <CardDescription>
            {t("resetPassword.invalidLinkDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/forgot-password">
              {t("resetPassword.requestNew")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("token", token);
      const result = await resetPasswordAction(formData);

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(true);
      }
    } catch {
      setError(t("resetPassword.error"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {t("resetPassword.successTitle")}
          </CardTitle>
          <CardDescription>
            {t("resetPassword.successDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">{t("resetPassword.signIn")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          {t("resetPassword.title")}
        </CardTitle>
        <CardDescription>{t("resetPassword.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <InlineAlert variant="error">
              {error}
            </InlineAlert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">{t("resetPassword.newPassword")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {t("resetPassword.passwordHelp")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {t("resetPassword.confirmPassword")}
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? t("resetPassword.submitting")
              : t("resetPassword.submit")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {t("resetPassword.rememberPassword")}{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            {t("resetPassword.signIn")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
