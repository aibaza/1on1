import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageSeries } from "@/lib/auth/rbac";
import { SeriesList } from "@/components/series/series-list";
import { Button } from "@/components/ui/button";
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
      role: session.user.role,
      userId: session.user.id,
    })
  );

  const showCreateButton = canManageSeries(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        {showCreateButton && (
          <Button variant="outline" asChild>
            <Link href="/sessions/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("newSeries")}
            </Link>
          </Button>
        )}
      </div>

      <SeriesList
        initialSeries={seriesData}
        currentUserId={session.user.id}
        userRole={session.user.role}
      />
    </div>
  );
}
