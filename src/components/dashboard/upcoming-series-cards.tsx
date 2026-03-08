"use client";

import Link from "next/link";
import { SeriesCard } from "@/components/series/series-card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SeriesCardData } from "@/lib/queries/series";
import { EmptyState } from "@/components/ui/empty-state";

interface UpcomingSeriesCardsProps {
  series: SeriesCardData[];
  currentUserId: string;
}

export function UpcomingSeriesCards({
  series,
  currentUserId,
}: UpcomingSeriesCardsProps) {
  const t = useTranslations("dashboard.upcoming");

  if (series.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        heading={t("noSessions")}
        description={t("noSessionsDesc")}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/sessions/new">
              <Plus className="mr-1.5 size-3.5" />
              {t("newSeries")}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {series.map((s) => (
        <SeriesCard key={s.id} series={s} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
