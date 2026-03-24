"use client";

import { useState } from "react";
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
import { forgotPasswordAction } from "@/lib/auth/actions";
import { InlineAlert } from "@/components/ui/inline-alert";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await forgotPasswordAction(formData);

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSent(true);
      }
    } catch {
      setError(t("forgotPassword.error"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t("forgotPassword.successTitle")}</CardTitle>
          <CardDescription>
            {t("forgotPassword.successDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">{t("forgotPassword.backToSignIn")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{t("forgotPassword.title")}</CardTitle>
        <CardDescription>
          {t("forgotPassword.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <InlineAlert variant="error">
              {error}
            </InlineAlert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t("forgotPassword.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("forgotPassword.emailPlaceholder")}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("forgotPassword.submitting") : t("forgotPassword.submit")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {t("forgotPassword.rememberPassword")}{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            {t("forgotPassword.signIn")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
