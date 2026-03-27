"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { registerAction } from "@/lib/auth/actions";
import { useZodI18nErrors } from "@/lib/i18n/zod-error-map";
import { InlineAlert } from "@/components/ui/inline-alert";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  useZodI18nErrors();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orgType, setOrgType] = useState("for_profit");

  async function handleSubmit(formData: FormData) {
    setError("");
    setLoading(true);

    try {
      formData.set("orgType", orgType);
      if (planParam && (planParam === "pro" || planParam === "business")) {
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
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          {t("register.title")}
        </CardTitle>
        <CardDescription>
          {t("register.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <InlineAlert variant="error">
              {error}
            </InlineAlert>
          )}

          <div className="space-y-2">
            <Label htmlFor="companyName">{t("register.companyName")}</Label>
            <Input
              id="companyName"
              name="companyName"
              placeholder={t("register.companyPlaceholder")}
              required
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <Label>{t("register.orgType")}</Label>
            <RadioGroup
              value={orgType}
              onValueChange={setOrgType}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="org-for-profit"
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  orgType === "for_profit"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <RadioGroupItem value="for_profit" id="org-for-profit" />
                <div>
                  <span className="text-sm font-medium">{t("register.forProfit")}</span>
                  <p className="text-xs text-muted-foreground">{t("register.forProfitDesc")}</p>
                </div>
              </Label>
              <Label
                htmlFor="org-non-profit"
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  orgType === "non_profit"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <RadioGroupItem value="non_profit" id="org-non-profit" />
                <div>
                  <span className="text-sm font-medium">{t("register.nonProfit")}</span>
                  <p className="text-xs text-muted-foreground">{t("register.nonProfitDesc")}</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t("register.firstName")}</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder={t("register.firstNamePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t("register.lastName")}</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder={t("register.lastNamePlaceholder")}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("register.workEmail")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("register.workEmailPlaceholder")}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("register.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              {t("register.passwordHelp")}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("register.submitting") : t("register.submit")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {t("register.hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            {t("register.signIn")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
