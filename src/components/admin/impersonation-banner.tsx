import { auth } from "@/lib/auth/config";
import { StopImpersonationButton } from "./stop-impersonation-button";
import { getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";

export async function ImpersonationBanner() {
  const session = await auth();
  if (!session?.user.impersonatedBy) return null;

  const t = await getTranslations("admin");
  const { name: adminName } = session.user.impersonatedBy;
  const userName = session.user.name ?? session.user.email ?? "";

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-sm font-medium text-amber-800 dark:text-amber-300">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0 opacity-80" />
        <span>
          {t("impersonation.banner", { name: userName, admin: adminName })}
        </span>
      </div>
      <StopImpersonationButton label={t("impersonation.returnToAdmin")} />
    </div>
  );
}
