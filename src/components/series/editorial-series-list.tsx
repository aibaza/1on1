"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SeriesCard } from "./series-card";
import { Plus, CalendarDays, ChevronDown, ChevronRight, Archive } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";

interface Series {
  id: string;
  managerId: string;
  cadence: string;
  defaultTemplateName?: string | null;
  status: string;
  nextSessionAt: string | null;
  preferredDay: string | null;
  preferredTime: string | null;
  manager: { id: string; firstName: string; lastName: string };
  report: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  latestSession: {
    id: string; status: string; sessionNumber: number;
    sessionScore: string | null; scheduledAt: string | null; talkingPointCount: number;
  } | null;
  latestSummary: { blurb: string; sentiment: string } | null;
  assessmentHistory: number[];
  questionHistories: { questionText: string; scoreWeight: number; values: number[] }[];
}

interface EditorialSeriesListProps {
  initialSeries: Series[];
  currentUserId: string;
  userRole: string;
}

function EditorialSeriesGrid({
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((s) => (
        <div key={s.id} className={muted ? "opacity-50" : undefined}>
          <SeriesCard
            series={s}
            currentUserId={currentUserId}
            showManagerName={showManagerName}
          />
        </div>
      ))}
      {/* Dashed empty state card */}
      {!muted && (
        <Link
          href="/sessions/new"
          className="border-2 border-dashed border-muted-foreground/20 rounded-2xl flex flex-col items-center justify-center p-6 text-muted-foreground hover:border-primary/50 hover:bg-muted transition-all cursor-pointer group min-h-[280px]"
        >
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
            <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest">New Session</p>
        </Link>
      )}
    </div>
  );
}

function EditorialAdminGrouped({
  activeSeries,
  currentUserId,
  t,
}: {
  activeSeries: Series[];
  currentUserId: string;
  t: ReturnType<typeof useTranslations<"sessions">>;
}) {
  const groups = new Map<string, Series[]>();
  for (const s of activeSeries) {
    const arr = groups.get(s.managerId) ?? [];
    arr.push(s);
    groups.set(s.managerId, arr);
  }

  const sortedGroups = [...groups.entries()].sort(([aId, aItems], [bId, bItems]) => {
    if (aId === currentUserId) return -1;
    if (bId === currentUserId) return 1;
    const aName = `${aItems[0].manager.lastName} ${aItems[0].manager.firstName}`;
    const bName = `${bItems[0].manager.lastName} ${bItems[0].manager.firstName}`;
    return aName.localeCompare(bName);
  });

  return (
    <div className="space-y-12">
      {sortedGroups.map(([managerId, items]) => {
        const manager = items[0].manager;
        const managerName = `${manager.firstName} ${manager.lastName}`;
        return (
          <section key={managerId} className="bg-muted/50 p-8 rounded-2xl">
            <div className="flex items-center gap-4 mb-8">
              <h3 className="font-headline font-extrabold text-xl text-primary">
                {managerName}
                {managerId === currentUserId && (
                  <span className="ml-2 font-normal text-muted-foreground text-sm">
                    {t("sections.youSuffix")}
                  </span>
                )}
              </h3>
              <span className="ml-auto text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {items.length} {items.length === 1 ? "Series" : "Series"}
              </span>
            </div>
            <EditorialSeriesGrid items={items} currentUserId={currentUserId} />
          </section>
        );
      })}
    </div>
  );
}

function EditorialManagerSections({
  activeSeries,
  currentUserId,
  t,
}: {
  activeSeries: Series[];
  currentUserId: string;
  t: ReturnType<typeof useTranslations<"sessions">>;
}) {
  const myTeam = activeSeries.filter((s) => s.managerId === currentUserId);
  const myOneOnOnes = activeSeries.filter((s) => s.managerId !== currentUserId);

  return (
    <div className="space-y-12">
      {myTeam.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-8">
            <h3 className="text-2xl font-bold font-headline flex items-center gap-3 text-foreground">
              <span className="w-2 h-8 rounded-full" style={{ background: "var(--color-success, #004c47)" }} />
              {t("sections.myTeam")}
            </h3>
          </div>
          <EditorialSeriesGrid items={myTeam} currentUserId={currentUserId} />
        </div>
      )}
      {myOneOnOnes.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-8">
            <h3 className="text-2xl font-bold font-headline flex items-center gap-3 text-foreground">
              <span className="w-2 h-8 bg-primary rounded-full" />
              {t("sections.myOneOnOnes")}
            </h3>
          </div>
          <EditorialSeriesGrid
            items={myOneOnOnes}
            currentUserId={currentUserId}
            showManagerName
          />
        </div>
      )}
    </div>
  );
}

export function EditorialSeriesList({ initialSeries, currentUserId, userRole }: EditorialSeriesListProps) {
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
          <Link
            href="/sessions/new"
            className="inline-flex items-center px-6 py-3 rounded-xl font-bold text-sm text-white shadow-md"
            style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("series.create")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      {activeSeries.length > 0 && (
        <>
          {userRole === "admin" ? (
            <EditorialAdminGrouped
              activeSeries={activeSeries}
              currentUserId={currentUserId}
              t={t}
            />
          ) : userRole === "manager" ? (
            <EditorialManagerSections
              activeSeries={activeSeries}
              currentUserId={currentUserId}
              t={t}
            />
          ) : (
            <EditorialSeriesGrid items={activeSeries} currentUserId={currentUserId} />
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
            {archivedOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            <Archive className="size-3.5" />
            {t("series.showArchived", { count: archivedSeries.length })}
          </button>
          {archivedOpen && (
            <EditorialSeriesGrid items={archivedSeries} currentUserId={currentUserId} muted />
          )}
        </div>
      )}
    </div>
  );
}
