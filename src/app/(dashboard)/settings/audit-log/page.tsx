import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AuditLogClient } from "./audit-log-client";
import { getTranslations } from "next-intl/server";

export default async function AuditLogPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/overview");
  }

  const t = await getTranslations("settings");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-muted-foreground mb-1">
          {t("title")} &gt; {t("auditLog.title")}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("auditLog.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("auditLog.description")}
        </p>
      </div>

      <AuditLogClient />
    </div>
  );
}
