"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  AlertTriangle,
  Clock,
  ChevronRight,
  CalendarPlus,
  Play,
  ListChecks,
  Calendar,
} from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import type { QuickStats, StatsTrends, OverdueGroup, RecentSession } from "@/lib/queries/dashboard";
import type { SeriesCardData } from "@/lib/queries/series";
import { EditorialHealthCards } from "@/components/dashboard/editorial-health-cards";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemedAvatarImage } from "@/components/ui/themed-avatar-image";
import { StarRating } from "@/components/ui/star-rating";

interface EditorialDashboardProps {
  user: {
    id: string;
    name?: string | null;
    level: string;
  };
  tenantName: string | null;
  stats: QuickStats;
  trends: StatsTrends;
  upcoming: SeriesCardData[];
  overdue: OverdueGroup[];
  recent: RecentSession[];
}

function getGreetingKey(): "goodMorning" | "goodAfternoon" | "goodEvening" {
  const hour = new Date().getHours();
  if (hour < 12) return "goodMorning";
  if (hour < 18) return "goodAfternoon";
  return "goodEvening";
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}



export function EditorialDashboard({
  user,
  tenantName,
  stats,
  trends,
  upcoming,
  overdue,
  recent,
}: EditorialDashboardProps) {
  const t = useTranslations("dashboard");
  const format = useFormatter();

  const firstName = user.name?.split(" ")[0] ?? "there";
  const totalOverdue = overdue.reduce((sum, g) => sum + g.items.length, 0);

  // Find the nearest upcoming session
  const nextSession = useMemo(() => {
    if (upcoming.length === 0) return null;
    const sorted = [...upcoming].sort((a, b) =>
      (a.nextSessionAt ?? "").localeCompare(b.nextSessionAt ?? "")
    );
    return sorted[0];
  }, [upcoming]);


  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* 1. Welcome Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-muted-foreground font-medium mb-1">
            {format.dateTime(new Date(), { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          <h2 className="text-4xl font-extrabold text-foreground tracking-tight font-headline">
            {t(`editorial.${getGreetingKey()}`)}, {firstName}
          </h2>
          <Link
            href="/sessions"
            className="mt-4 inline-flex items-center px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
          >
            <Layers className="h-4 w-4 mr-2" />
            <span className="text-sm font-semibold">{stats.totalReports} {t("editorial.activeSeries").toLowerCase()}</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        {/* Next session card (right-aligned, matches health card width) */}
        {nextSession && (() => {
          const isSelf = nextSession.report.id === user.id;
          const person = isSelf
            ? nextSession.manager
            : nextSession.report;
          const personName = `${person.firstName} ${person.lastName}`;

          return (
            <Link
              href={nextSession.latestSession?.status === "in_progress" ? `/wizard/${nextSession.latestSession.id}` : `/sessions/${nextSession.id}`}
              className="text-white p-5 rounded-xl shadow-md relative overflow-hidden group hover:shadow-lg transition-all block w-full md:w-[calc(25%-12px)]"
              style={{ background: "linear-gradient(135deg, #29407d 0%, #425797 100%)" }}
            >
              <div className="absolute -right-3 -bottom-3 opacity-10">
                <Clock className="h-16 w-16" />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider mb-3">{t("editorial.nextSession")}</div>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10 border-2 border-white/20">
                    <ThemedAvatarImage name={personName} uploadedUrl={person.avatarUrl} role={person.level} />
                    <AvatarFallback className="text-xs bg-white/20 text-white">
                      {getInitials(personName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-base font-bold truncate">{personName}</div>
                    {person.jobTitle && (
                      <div className="text-xs opacity-70 truncate">{person.jobTitle}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-80">
                    {nextSession.nextSessionAt
                      ? format.relativeTime(new Date(nextSession.nextSessionAt))
                      : t("editorial.scheduled")}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold opacity-60 group-hover:opacity-100 transition-opacity">
                    <Play className="h-2.5 w-2.5 fill-current" /> Start
                  </span>
                </div>
              </div>
            </Link>
          );
        })()}
      </section>

      {/* 2. Health Overview Cards */}
      <EditorialHealthCards userLevel={user.level} userId={user.id} />

      {/* 3. Main Grid: Left (upcoming + recent) | Right (actions + cadence) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-10">
          {/* Upcoming Sessions */}
          <section className="bg-card rounded-2xl p-8 border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-headline">{t("upcomingSessions")}</h3>
              <Link href="/sessions" className="text-primary font-bold text-sm hover:underline">
                {t("editorial.viewAll")}
              </Link>
            </div>
            <div className="space-y-4">
              {upcoming.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">{t("editorial.noUpcoming")}</p>
                </div>
              ) : (
                upcoming.map((series, idx) => {
                  const reportName = `${series.report.firstName} ${series.report.lastName}`;
                  const isNext = idx === 0;
                  return (
                    <div
                      key={series.id}
                      className={`flex items-center justify-between p-4 rounded-xl transition-colors group ${
                        isNext
                          ? "bg-primary/5 border border-primary/10"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar className={`h-12 w-12 ${!isNext ? "grayscale group-hover:grayscale-0 transition-all" : ""}`}>
                          <ThemedAvatarImage name={reportName} uploadedUrl={series.report.avatarUrl} role={series.report.level} />
                          <AvatarFallback>{getInitials(reportName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-foreground">
                            {reportName}
                            {isNext && (
                              <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] rounded uppercase font-bold tracking-wider">
                                Next
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground text-xs font-medium">
                            {series.nextSessionAt
                              ? format.dateTime(new Date(series.nextSessionAt), { month: "short", day: "numeric", hour: "numeric", minute: "numeric" })
                              : t("editorial.scheduled")}{" "}
                            · {series.cadence}
                          </div>
                        </div>
                      </div>
                      {isNext ? (
                        <Link
                          href={series.latestSession?.status === "in_progress" ? `/wizard/${series.latestSession.id}` : `/sessions?series=${series.id}`}
                          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-md hover:opacity-90 transition-opacity"
                        >
                          {series.latestSession?.status === "in_progress" ? t("editorial.resume") : t("editorial.start")}
                        </Link>
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Recent Insights */}
          <section className="space-y-6">
            <h3 className="text-xl font-bold font-headline">{t("recentSessions")}</h3>
            <div className="grid gap-4">
              {recent.slice(0, 3).map((s) => {
                const sentimentColor = s.sentiment === "positive" ? "var(--color-success)" : s.sentiment === "concerning" ? "var(--destructive)" : "var(--color-warning, #f59e0b)";
                return (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}/summary`}
                    className="bg-card p-6 rounded-r-2xl rounded-l-sm border border-[var(--editorial-outline-variant,var(--border))]/50 border-l-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 block"
                    style={{ borderLeftColor: sentimentColor }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-foreground">{s.reportName}</div>
                        <div className="text-xs text-muted-foreground font-medium">
                          {format.dateTime(new Date(s.completedAt), { month: "short", day: "numeric" })} · Session #{s.sessionNumber}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StarRating score={s.sessionScore ?? 0} size="sm" />
                        {s.sentiment && (
                          <span
                            className="px-2 py-0.5 text-[10px] font-bold rounded uppercase"
                            style={{
                              background: s.sentiment === "positive" ? "rgba(0, 76, 71, 0.08)" : s.sentiment === "concerning" ? "rgba(186, 26, 26, 0.08)" : "rgba(245, 158, 11, 0.08)",
                              color: s.sentiment === "positive" ? "var(--color-success)" : s.sentiment === "concerning" ? "var(--destructive)" : "#d97706",
                            }}
                          >
                            {t(`editorial.sentiment${(s.sentiment ?? "neutral").charAt(0).toUpperCase()}${(s.sentiment ?? "neutral").slice(1)}` as Parameters<typeof t>[0])} {t("editorial.sentiment")}
                          </span>
                        )}
                      </div>
                    </div>
                    {s.aiSummarySnippet && (
                      <p className="text-sm text-muted-foreground italic leading-relaxed line-clamp-2 border-l-2 border-muted pl-4">
                        &ldquo;{s.aiSummarySnippet}&rdquo;
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">
          {/* Action Items */}
          <section className="bg-muted rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center font-headline">
              <ListChecks className="mr-2 h-4 w-4" />
              {t("editorial.actionItems")}
            </h3>
            <div className="space-y-6">
              {totalOverdue > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-black text-destructive mb-3 tracking-widest">{t("editorial.overdueLabel")}</div>
                  <div className="space-y-3">
                    {overdue.flatMap((g) =>
                      g.items.map((item) => (
                        <Link
                          key={item.id}
                          href="/action-items"
                          className="bg-card p-3 rounded-xl shadow-sm border border-destructive/5 group cursor-pointer hover:border-destructive/20 hover:shadow-md transition-all block"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{item.title}</p>
                              <p className="text-[10px] text-muted-foreground">{g.reportName} · {item.daysOverdue}d overdue</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                          </div>
                        </Link>
                      ))
                    ).slice(0, 4)}
                  </div>
                </div>
              )}
              {/* This Week */}
              <div>
                <div className="text-[10px] uppercase font-black text-primary mb-3 tracking-widest">{t("editorial.thisWeek")}</div>
                <div className="space-y-3">
                  {upcoming.slice(0, 2).map((series) => {
                    const name = `${series.report.firstName} ${series.report.lastName}`;
                    return (
                      <Link
                        key={series.id}
                        href={`/sessions/${series.id}`}
                        className="bg-card p-3 rounded-xl shadow-sm border border-border/10 group cursor-pointer hover:border-primary/20 hover:shadow-md transition-all block"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{t("editorial.prepareForSession", { name })}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {series.nextSessionAt
                                ? format.dateTime(new Date(series.nextSessionAt), { weekday: "short", month: "short", day: "numeric" })
                                : t("editorial.scheduled")}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <Link href="/action-items" className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
                {t("editorial.viewAllActions")} <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </section>

          {/* Team Cadence */}
          <section className="bg-card rounded-2xl p-6 border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h3 className="text-lg font-bold mb-6 font-headline">{t("editorial.teamCadence")}</h3>
            <div className="space-y-4">
              {upcoming.map((series) => {
                const name = `${series.report.firstName} ${series.report.lastName}`;
                let dotColor = "var(--color-success)";
                let timeLabel = t("editorial.onTrack");

                if (series.nextSessionAt) {
                  const diff = new Date(series.nextSessionAt).getTime() - Date.now();
                  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                  if (days < 0) {
                    dotColor = "var(--destructive)";
                    timeLabel = t("editorial.daysOverdue", { count: Math.abs(days) });
                  } else if (days <= 2) {
                    dotColor = "var(--color-success)";
                    timeLabel = days === 0 ? t("editorial.today") : days === 1 ? t("editorial.tomorrow") : t("editorial.inDays", { count: days });
                  } else if (days <= 7) {
                    dotColor = "var(--color-warning, #f59e0b)";
                    timeLabel = t("editorial.inDays", { count: days });
                  } else {
                    dotColor = "var(--color-success)";
                    timeLabel = t("editorial.inDays", { count: days });
                  }
                }

                const isOverdue = series.nextSessionAt && new Date(series.nextSessionAt).getTime() < Date.now();
                return (
                  <div key={series.id} className="flex items-center justify-between p-2 group rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                      <span className="text-sm font-medium text-foreground">{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground" style={{ color: dotColor === "var(--destructive)" ? dotColor : undefined }}>
                        {timeLabel}
                      </span>
                      {isOverdue && (
                        <Link href={`/sessions/${series.id}`} className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Schedule
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
              {upcoming.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t("editorial.noActiveSeries")}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
