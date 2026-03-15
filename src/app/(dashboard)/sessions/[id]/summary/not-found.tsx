import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SessionNotFound() {
  const t = await getTranslations("sessions");
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
      <p className="text-muted-foreground">{t("notFound.description")}</p>
      <Button asChild variant="outline">
        <Link href="/history">{t("notFound.backToSessions")}</Link>
      </Button>
    </div>
  );
}
