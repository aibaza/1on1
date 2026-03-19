"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SeriesCard } from "./series-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  userRole: string;
}

function SeriesGrid({
  items,
  currentUserId,
  muted = false,
  showManagerName = false,
}: {
  items: Series[];
  currentUserId: string;
  muted?: boolean;
  showManagerName?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch">
      {items.map((s) => (
        <div key={s.id} className={muted ? "opacity-50" : undefined}>
          <SeriesCard
            series={s}
            currentUserId={currentUserId}
            showManagerName={showManagerName}
          />
        </div>
      ))}
    </div>
  );
}

function AdminGroupedView({
  activeSeries,
  currentUserId,
  t,
}: {
  activeSeries: Series[];
  currentUserId: string;
  t: ReturnType<typeof useTranslations<"sessions">>;
}) {
  // Group active series by managerId
  const groups = new Map<string, Series[]>();
  for (const s of activeSeries) {
    const arr = groups.get(s.managerId) ?? [];
    arr.push(s);
    groups.set(s.managerId, arr);
  }

  // Sort: own group first, rest alphabetical by manager lastName then firstName
  const sortedGroups = [...groups.entries()].sort(
    ([aId, aItems], [bId, bItems]) => {
      if (aId === currentUserId) return -1;
      if (bId === currentUserId) return 1;
      const aName = `${aItems[0].manager.lastName} ${aItems[0].manager.firstName}`;
      const bName = `${bItems[0].manager.lastName} ${bItems[0].manager.firstName}`;
      return aName.localeCompare(bName);
    }
  );

  return (
    <div>
      {sortedGroups.map(([managerId, items], index) => (
        <div key={managerId}>
          {index > 0 && <Separator className="my-6" />}
          <h3 className="text-sm font-semibold mb-2">
            {items[0].manager.firstName} {items[0].manager.lastName}
            {managerId === currentUserId && (
              <span className="ml-1 font-normal text-muted-foreground">
                {t("sections.youSuffix")}
              </span>
            )}
          </h3>
          <SeriesGrid items={items} currentUserId={currentUserId} />
        </div>
      ))}
    </div>
  );
}

function ManagerSectionView({
  activeSeries,
  currentUserId,
  t,
}: {
  activeSeries: Series[];
  currentUserId: string;
  t: ReturnType<typeof useTranslations<"sessions">>;
}) {
  const myTeam = activeSeries.filter((s) => s.managerId === currentUserId);
  const myOneOnOnes = activeSeries.filter(
    (s) => s.managerId !== currentUserId
  );

  return (
    <div>
      {myTeam.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">
            {t("sections.myTeam")}
          </h3>
          <SeriesGrid items={myTeam} currentUserId={currentUserId} />
        </div>
      )}
      {myOneOnOnes.length > 0 && (
        <div className={myTeam.length > 0 ? "mt-8" : undefined}>
          <h3 className="text-sm font-semibold mb-2">
            {t("sections.myOneOnOnes")}
          </h3>
          <SeriesGrid
            items={myOneOnOnes}
            currentUserId={currentUserId}
            showManagerName
          />
        </div>
      )}
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
        <>
          {userRole === "admin" ? (
            <AdminGroupedView
              activeSeries={activeSeries}
              currentUserId={currentUserId}
              t={t}
            />
          ) : userRole === "manager" ? (
            <ManagerSectionView
              activeSeries={activeSeries}
              currentUserId={currentUserId}
              t={t}
            />
          ) : (
            <SeriesGrid items={activeSeries} currentUserId={currentUserId} />
          )}
        </>
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
