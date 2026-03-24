"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EditorialSeriesCard } from "./editorial-series-card";
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
  report: { id: string; firstName: string; lastName: string; avatarUrl: string | null; level: string };
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
  userLevel: string;
}

function EditorialSeriesGrid({
  items,
  currentUserId,
  muted = false,
  showManagerName = false,
  t,
}: {
  items: Series[];
  currentUserId: string;
  muted?: boolean;
  showManagerName?: boolean;
  t: ReturnType<typeof useTranslations<"sessions">>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
      {items.map((s) => (
        <div key={s.id} className={muted ? "opacity-50" : undefined}>
          <EditorialSeriesCard
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
          className="border-2 border-dashed border-[var(--editorial-outline-variant,var(--border))]/50 rounded-2xl flex flex-col items-center justify-center p-6 text-muted-foreground hover:border-primary/50 hover:bg-[var(--editorial-surface-container,var(--muted))] transition-all cursor-pointer group min-h-[280px]"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--editorial-surface-container,var(--muted))] flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
            <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest">{t("editorial.newSession")}</p>
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
    <div className="space-y-16">
      {sortedGroups.map(([managerId, items]) => {
        const manager = items[0].manager;
        const managerName = `${manager.firstName} ${manager.lastName}`;
        return (
          <section key={managerId} className="bg-[var(--editorial-surface-container-low,var(--muted))]/80 p-8 rounded-2xl">
            <div className="flex items-center gap-4 mb-8">
              <h3 className="font-headline font-extrabold text-xl text-primary">
                {managerName}
              </h3>
              {managerId === currentUserId && (
                <span className="text-xs font-bold text-muted-foreground bg-[var(--editorial-surface-container,var(--muted))] px-3 py-1 rounded-full uppercase tracking-wider">
                  {t("sections.youSuffix")}
                </span>
              )}
              <span className="ml-auto text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {t("editorial.sessions", { count: items.length })}
              </span>
            </div>
            <EditorialSeriesGrid items={items} currentUserId={currentUserId} t={t} />
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
          <EditorialSeriesGrid items={myTeam} currentUserId={currentUserId} t={t} />
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
          {/* Featured wide card layout for My 1:1s */}
          <div className="space-y-4">
            {myOneOnOnes.map((series) => {
              const managerName = `${series.manager.firstName} ${series.manager.lastName}`;
              return (
                <div key={series.id} className="bg-muted p-1 rounded-2xl">
                  <div className="bg-card rounded-xl p-8 flex flex-col lg:flex-row items-center gap-8 border border-card">
                    <div className="flex items-center gap-6 flex-1">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-muted">
                          {series.report.avatarUrl ? (
                            <img src={series.report.avatarUrl} alt={managerName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                              {managerName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-2xl font-extrabold font-headline text-foreground mb-1">{managerName}</h4>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                          {series.cadence} · <span className="text-primary">{t("editorial.directManager")}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                      <div className="text-center sm:text-right">
                        <p className="text-sm font-medium text-muted-foreground mb-1">{t("editorial.nextSync")}</p>
                        <p className="text-lg font-bold text-foreground">
                          {series.nextSessionAt
                            ? new Date(series.nextSessionAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
                            : t("editorial.scheduled")}
                        </p>
                      </div>
                      <a
                        href={`/sessions/${series.id}`}
                        className="px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 text-white hover:opacity-90 active:scale-95"
                        style={{ background: "var(--color-success, #004c47)" }}
                      >
                        {t("editorial.prefillNow")}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function EditorialSeriesList({ initialSeries, currentUserId, userLevel }: EditorialSeriesListProps) {
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
          {userLevel === "admin" ? (
            <EditorialAdminGrouped
              activeSeries={activeSeries}
              currentUserId={currentUserId}
              t={t}
            />
          ) : userLevel === "manager" ? (
            <EditorialManagerSections
              activeSeries={activeSeries}
              currentUserId={currentUserId}
              t={t}
            />
          ) : (
            <EditorialSeriesGrid items={activeSeries} currentUserId={currentUserId} t={t} />
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
            <EditorialSeriesGrid items={archivedSeries} currentUserId={currentUserId} muted t={t} />
          )}
        </div>
      )}
    </div>
  );
}
