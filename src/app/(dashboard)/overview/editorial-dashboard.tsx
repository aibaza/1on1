"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  TrendingUp,
  AlertTriangle,
  Clock,
  Zap,
  CalendarClock,
  Star,
  ChevronRight,
  CircleAlert,
  CalendarPlus,
  TrendingDown,
  Play,
  ListChecks,
  Calendar,
} from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import type { QuickStats, StatsTrends, OverdueGroup, RecentSession } from "@/lib/queries/dashboard";
import type { SeriesCardData } from "@/lib/queries/series";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { StarRating } from "@/components/ui/star-rating";

interface EditorialDashboardProps {
  user: {
    id: string;
    name?: string | null;
    role: string;
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

function MiniBarChart({ data, color = "var(--primary)" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="h-8 w-20 flex items-end space-x-1">
      {data.slice(-4).map((v, i) => (
        <div
          key={i}
          className="w-3 rounded-sm transition-all"
          style={{
            height: `${Math.max((v / max) * 100, 10)}%`,
            backgroundColor: color,
            opacity: 0.2 + (i / data.length) * 0.8,
          }}
        />
      ))}
    </div>
  );
}

function MeetingStreak({ count, label }: { count: number; label: string }) {
  const circumference = 2 * Math.PI * 24;
  const progress = Math.min(count / 15, 1); // 15 = full ring

  return (
    <div className="bg-card p-5 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center space-x-4">
      <div className="relative flex items-center justify-center">
        <svg className="w-14 h-14 -rotate-90">
          <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-muted" />
          <circle
            cx="28" cy="28" r="24" fill="transparent" stroke="var(--color-success, #004c47)" strokeWidth="4"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
          />
        </svg>
        <Zap className="absolute h-5 w-5" style={{ color: "var(--color-success, #004c47)" }} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-foreground">{count}</div>
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
      </div>
    </div>
  );
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

  // AI insight: use most recent session's snippet or a generic message
  const aiInsight = recent[0]?.aiSummarySnippet
    ? t("editorial.recentInsight", { text: recent[0].aiSummarySnippet })
    : stats.avgScore
      ? t("editorial.avgScoreInsight", { score: stats.avgScore.toFixed(1) })
      : t("editorial.welcomeFallback");

  // Attention cards: derive from data
  const attentionCards = useMemo(() => {
    const cards: Array<{ type: "score" | "cadence"; title: string; subtitle: string; color: string; seriesId: string }> = [];

    // Check for score drops
    for (const series of upcoming) {
      const hist = series.assessmentHistory;
      if (hist.length >= 2) {
        let delta = hist[hist.length - 1] - hist[hist.length - 2];
        // Normalize: if delta suggests 0-100 scale data, convert to 1-5
        if (Math.abs(delta) > 5) delta = delta / 20;
        if (delta <= -0.7) {
          const isSelf = series.report.id === user.id;
          const name = `${series.report.firstName} ${series.report.lastName}`;
          cards.push({
            type: "score",
            title: isSelf
              ? t("editorial.scoreDroppedSelf", { delta: Math.abs(delta).toFixed(1) })
              : t("editorial.scoreDropped", { name, delta: Math.abs(delta).toFixed(1) }),
            subtitle: t("editorial.considerCheckin"),
            color: "error",
            seriesId: series.id,
          });
        }
      }
    }

    // Check for cadence gaps
    for (const series of upcoming) {
      if (series.nextSessionAt) {
        const daysSince = Math.floor((Date.now() - new Date(series.nextSessionAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 14) {
          const name = `${series.report.firstName} ${series.report.lastName}`;
          cards.push({
            type: "cadence",
            title: t("editorial.cadenceDrift", { days: daysSince, name }),
            subtitle: t("editorial.driftingCadence"),
            color: "amber",
            seriesId: series.id,
          });
        }
      }
    }

    return cards.slice(0, 2);
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
          <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full border"
            style={{ background: "var(--color-success, #004c47)10", borderColor: "var(--color-success, #004c47)20", color: "var(--color-success, #004c47)" }}>
            <Star className="h-4 w-4 mr-2 fill-current" />
            <span className="text-sm font-semibold">{aiInsight}</span>
          </div>
        </div>
        <MeetingStreak count={stats.sessionsThisMonth} label={t("editorial.sessionsOnTime")} />
      </section>

      {/* 2. Quick Stats */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 md:p-8 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{t("editorial.activeSeries")}</span>
            <div className="text-4xl font-extrabold text-primary mt-2 tabular-nums">{stats.totalReports}</div>
          </div>
          <div className="mt-6">
            <MiniBarChart data={trends.reportsHistory} />
          </div>
        </div>

        <div className="bg-card p-6 md:p-8 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{t("editorial.avgScore")}</span>
            <div className="text-4xl font-extrabold text-primary mt-2 tabular-nums">
              {stats.avgScore?.toFixed(1) ?? "—"}
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2" style={{ color: "var(--color-success)" }}>
            {stats.avgScore && trends.scoresHistory.length >= 2 && (
              <>
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  {(trends.scoresHistory[trends.scoresHistory.length - 1] - trends.scoresHistory[trends.scoresHistory.length - 2]) > 0 ? "+" : ""}
                  {(trends.scoresHistory[trends.scoresHistory.length - 1] - trends.scoresHistory[trends.scoresHistory.length - 2]).toFixed(1)} from last period
                </span>
              </>
            )}
          </div>
        </div>

        <div className="bg-card p-6 md:p-8 rounded-xl border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{t("editorial.overdueActions")}</span>
            <div className="text-4xl font-extrabold text-primary mt-2 tabular-nums">{totalOverdue}</div>
          </div>
          {totalOverdue > 0 && (
            <div className="mt-6 w-full bg-[var(--editorial-surface-container,var(--muted))] rounded-full h-2">
              <div className="bg-destructive h-2 rounded-full" style={{ width: `${Math.min(totalOverdue * 20, 100)}%` }} />
            </div>
          )}
        </div>

        {nextSession ? (
          <Link
            href={nextSession.latestSession?.status === "in_progress" ? `/wizard/${nextSession.latestSession.id}` : `/sessions/${nextSession.id}`}
            className="text-white p-6 rounded-xl shadow-lg relative overflow-hidden group hover:shadow-xl transition-all block"
            style={{ background: "linear-gradient(135deg, #29407d 0%, #425797 100%)" }}
          >
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Clock className="h-24 w-24" />
            </div>
            <div className="relative z-10">
              <div className="text-xs font-bold uppercase tracking-wider mb-2">{t("editorial.nextSession")}</div>
              <div className="text-xl font-bold mb-1">
                {nextSession.report.id === user.id
                  ? `${nextSession.manager.firstName} ${nextSession.manager.lastName}`
                  : `${nextSession.report.firstName} ${nextSession.report.lastName}`}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {nextSession.nextSessionAt
                    ? format.relativeTime(new Date(nextSession.nextSessionAt))
                    : t("editorial.scheduled")}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold opacity-60 group-hover:opacity-100 transition-opacity">
                  <Play className="h-3 w-3 fill-current" /> Start
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-muted p-6 rounded-xl border border-border/50 flex flex-col items-center justify-center text-center">
            <CalendarPlus className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm font-medium text-muted-foreground">{t("editorial.noUpcoming")}</span>
          </div>
        )}
      </section>

      {/* 3. Attention Needed */}
      {attentionCards.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-foreground flex items-center font-headline">
            <CircleAlert className="mr-2 h-5 w-5 text-destructive" />
            {t("editorial.attentionNeeded")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {attentionCards.map((card, i) => (
              <div
                key={i}
                className="p-5 rounded-xl flex items-center justify-between border group transition-all hover:shadow-md"
                style={{
                  background: card.color === "error"
                    ? "color-mix(in srgb, var(--destructive) 8%, transparent)"
                    : "color-mix(in srgb, var(--color-warning) 8%, transparent)",
                  borderColor: card.color === "error"
                    ? "color-mix(in srgb, var(--destructive) 15%, transparent)"
                    : "color-mix(in srgb, var(--color-warning) 20%, transparent)",
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: card.color === "error"
                        ? "color-mix(in srgb, var(--destructive) 10%, transparent)"
                        : "color-mix(in srgb, var(--color-warning) 12%, transparent)",
                    }}>
                    {card.type === "score"
                      ? <TrendingDown className="h-5 w-5 text-destructive" />
                      : <CalendarClock className="h-5 w-5 text-[var(--color-warning)]" />}
                  </div>
                  <div>
                    <p className="text-foreground font-semibold text-sm">{card.title}</p>
                    <p className="text-muted-foreground text-xs">{card.subtitle}</p>
                  </div>
                </div>
                <Link
                  href={`/sessions/${card.seriesId}`}
                  className="px-4 py-2 rounded-lg text-xs font-bold shadow-sm opacity-70 group-hover:opacity-100 transition-all shrink-0 ml-4"
                  style={{
                    background: card.color === "error" ? "var(--card)" : "var(--color-warning)",
                    color: card.color === "error" ? "var(--destructive)" : "white",
                    border: card.color === "error" ? "1px solid color-mix(in srgb, var(--destructive) 15%, transparent)" : "none",
                  }}
                >
                  {card.type === "score" ? t("editorial.review") : t("editorial.schedule")}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Main Grid: Left (upcoming + recent) | Right (actions + cadence) */}
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
                          <AvatarImage src={getAvatarUrl(reportName, series.report.avatarUrl, null, series.report.role)} alt={reportName} />
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
