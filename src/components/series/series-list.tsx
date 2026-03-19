"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SeriesCard } from "./series-card";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays, ChevronDown, ChevronRight, Archive } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";

interface Series {
  id: string;
  managerId: string;
  cadence: string;
  status: string;
  nextSessionAt: string | null;
  preferredDay: string | null;
  preferredTime: string | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
  };
  report: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  latestSession: {
    id: string;
    status: string;
    sessionNumber: number;
    sessionScore: string | null;
    scheduledAt: string | null;
    talkingPointCount: number;
  } | null;
  latestSummary: { blurb: string; sentiment: string } | null;
  assessmentHistory: number[];
  questionHistories: { questionText: string; scoreWeight: number; values: number[] }[];
}

interface SeriesListProps {
  initialSeries: Series[];
  currentUserId: string;
  userRole?: string;
}

function SeriesGrid({ items, currentUserId, muted = false }: { items: Series[]; currentUserId: string; muted?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch">
      {items.map((s) => (
        <div key={s.id} className={muted ? "opacity-50" : undefined}>
          <SeriesCard series={s} currentUserId={currentUserId} />
        </div>
      ))}
    </div>
  );
}

export function SeriesList({ initialSeries, currentUserId, userRole }: SeriesListProps) {
  const t = useTranslations("sessions");
  const [archivedOpen, setArchivedOpen] = useState(false);

  const { data: series } = useQuery<Series[]>({
    queryKey: ["series"],
    queryFn: async () => {
      const res = await fetch("/api/series");
      if (!res.ok) throw new Error("Failed to fetch series");
      return res.json();
    },
    initialData: initialSeries,
  });

  const activeSeries = series.filter((s) => s.status !== "archived");
  const archivedSeries = series.filter((s) => s.status === "archived");

  if (series.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        heading={t("series.empty")}
        description={t("series.emptyDesc")}
        action={
          <Button asChild>
            <Link href="/sessions/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("series.create")}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {activeSeries.length > 0 && (
        <SeriesGrid items={activeSeries} currentUserId={currentUserId} />
      )}

      {archivedSeries.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setArchivedOpen((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            {archivedOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            <Archive className="size-3.5" />
            {t("series.showArchived", { count: archivedSeries.length })}
          </button>

          {archivedOpen && (
            <SeriesGrid items={archivedSeries} currentUserId={currentUserId} muted />
          )}
        </div>
      )}
    </div>
  );
}
