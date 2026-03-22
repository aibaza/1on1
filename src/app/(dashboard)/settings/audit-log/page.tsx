import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AuditLogClient } from "./audit-log-client";
import { EditorialAuditLog } from "./editorial-audit-log";
import { getTranslations } from "next-intl/server";
import { getDesignPreference } from "@/lib/design-preference.server";

export default async function AuditLogPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/overview");
  }

  const t = await getTranslations("settings");
  const designPref = await getDesignPreference();
  const isEditorial = designPref === "editorial";

  return (
    <div className="space-y-6">
      <div>
        {isEditorial ? (
          <>
            <nav className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
              <span>{t("title")}</span>
              <span className="text-xs">›</span>
              <span className="text-foreground font-medium">{t("auditLog.title")}</span>
            </nav>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight font-headline">
              {t("auditLog.title")}
            </h1>
            <p className="text-muted-foreground text-base font-medium mt-2 max-w-xl leading-relaxed">
              {t("auditLog.description")}
            </p>
          </>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-1">
              {t("title")} &gt; {t("auditLog.title")}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("auditLog.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("auditLog.description")}
            </p>
          </>
        )}
      </div>

      {isEditorial ? <EditorialAuditLog /> : <AuditLogClient />}
    </div>
  );
}
