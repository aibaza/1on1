import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageSeries } from "@/lib/auth/rbac";
import { EditorialSeriesList } from "@/components/series/editorial-series-list";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSeriesCardData } from "@/lib/queries/series";

export default async function SessionsPage() {
  const t = await getTranslations("sessions");
  const session = await auth();
  if (!session?.user) redirect("/login");

  const seriesData = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => getSeriesCardData(tx, session.user.tenantId, {
      level: session.user.level,
      userId: session.user.id,
    })
  );

  const showCreateButton = canManageSeries(session.user.level);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-headline">{t("title")}</h1>
          <p className="text-muted-foreground text-base font-medium mt-2 max-w-xl leading-relaxed">{t("description")}</p>
        </div>
        {showCreateButton && (
          <Link
            href="/sessions/new"
            className="inline-flex items-center px-8 py-3 rounded-xl font-bold font-headline text-sm text-white shadow-md hover:shadow-lg transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("newSeries")}
          </Link>
        )}
      </div>

      <EditorialSeriesList
        initialSeries={seriesData}
        currentUserId={session.user.id}
        userLevel={session.user.level}
      />
    </div>
  );
}
