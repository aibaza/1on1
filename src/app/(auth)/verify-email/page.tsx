import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { verifyEmailAction } from "@/lib/auth/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Verify Email - 1on1",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations("auth");
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {t("verifyEmail.title")}
          </CardTitle>
          <CardDescription>
            {t("verifyEmail.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">{t("verifyEmail.backToSignIn")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const result = await verifyEmailAction(token);

  if (result.success) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {t("verifyEmail.successTitle")}
          </CardTitle>
          <CardDescription>
            {t("verifyEmail.successDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/overview">{t("verifyEmail.goToDashboard")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          {t("verifyEmail.failedTitle")}
        </CardTitle>
        <CardDescription>{result.error}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">{t("verifyEmail.backToSignIn")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
