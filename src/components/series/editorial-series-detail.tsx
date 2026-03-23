"use client";

import Link from "next/link";
import { useTranslations, useFormatter } from "next-intl";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Hash,
  Calendar,
  Sparkles,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Play,
  Pause,
  Settings,
  Archive,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "@/components/ui/star-rating";
import type { AISummary } from "@/lib/ai/schemas/summary";

interface SessionHistoryItem {
  id: string;
  sessionNumber: number;
  scheduledAt: string;
  completedAt: string | null;
  status: string;
  sessionScore: string | number | null;
  durationMinutes: number | null;
  aiSnippet: string | null;
  sentiment: string | null;
}

interface SeriesData {
  id: string;
  cadence: string;
  status: string;
  nextSessionAt: string | null;
  managerId: string;
  reportId: string;
  manager: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
  report: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
  latestAiSummary: AISummary | null;
  latestSessionScore: number | null;
  latestSessionNumber: number | null;
  sessions: SessionHistoryItem[];
}

interface EditorialSeriesDetailProps {
  series: SeriesData;
  currentUserId: string;
}

function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function toNum(v: string | number | null): number | null {
  if (v === null) return null;
  return typeof v === "string" ? parseFloat(v) : v;
}

export function EditorialSeriesDetail({ series, currentUserId }: EditorialSeriesDetailProps) {
  const t = useTranslations("sessions");
  const format = useFormatter();
  const router = useRouter();

  const isManager = currentUserId === series.managerId;
  const person = isManager ? series.report : series.manager;
  const personName = person ? `${person.firstName} ${person.lastName}` : "Unknown";
  const aiSummary = series.latestAiSummary as AISummary | null;
  const completedSessions = series.sessions.filter((s) => s.status === "completed");
  const inProgressSession = series.sessions.find((s) => s.status === "in_progress");

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/series/${series.id}/start`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start session");
      return res.json();
    },
    onSuccess: (data) => router.push(`/wizard/${data.id}`),
    onError: () => toast.error("Failed to start session"),
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <section className="mb-10">
        <Link
          href="/sessions"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">{t("summary.backToSeries")}</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 rounded-2xl shadow-lg">
              <AvatarImage src={person?.avatarUrl ?? undefined} alt={personName} />
              <AvatarFallback className="text-lg rounded-2xl">
                {person ? getInitials(person.firstName, person.lastName) : "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-extrabold text-foreground tracking-tight font-headline">
                  {personName}
                </h1>
                {series.latestSessionScore !== null && (
                  <div className="flex items-center bg-accent px-3 py-1 rounded-full text-sm font-bold gap-1">
                    {series.latestSessionScore.toFixed(1)}
                    <StarRating score={series.latestSessionScore} size="sm" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-1 capitalize">
                  <Calendar className="h-4 w-4" />{series.cadence}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="h-4 w-4" />{t("editorial.sessions", { count: completedSessions.length })}
                </span>
                {series.nextSessionAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />Next: {format.dateTime(new Date(series.nextSessionAt), { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {isManager && (
            <div className="flex gap-3 shrink-0">
              {inProgressSession ? (
                <button
                  onClick={() => router.push(`/wizard/${inProgressSession.id}`)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md hover:opacity-90 transition-all flex items-center gap-2"
                  style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
                >
                  <Play className="h-4 w-4 fill-current" /> {t("editorial.resume")}
                </button>
              ) : (
                <button
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isPending}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--editorial-primary-container, var(--primary)) 100%)" }}
                >
                  <Play className="h-4 w-4 fill-current" /> {t("editorial.startSession")}
                </button>
              )}
              <Link
                href={`/sessions/${series.id}/edit`}
                className="px-4 py-2.5 bg-muted text-foreground font-semibold rounded-xl hover:bg-accent transition-colors flex items-center gap-2 text-sm"
              >
                <Settings className="h-4 w-4" /> {t("editorial.edit")}
              </Link>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(t("detail.archive") + "?")) return;
                  const res = await fetch(`/api/series/${series.id}`, { method: "DELETE" });
                  if (res.ok) { toast.success(t("detail.seriesArchived")); router.push("/sessions"); }
                  else toast.error("Failed to archive");
                }}
                className="px-4 py-2.5 bg-muted text-muted-foreground font-semibold rounded-xl hover:bg-accent transition-colors flex items-center gap-2 text-sm"
              >
                <Archive className="h-4 w-4" /> {t("editorial.archive")}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Bento Grid: AI Summary + Score */}
      <div className="grid grid-cols-12 gap-6 mb-10">
        {/* AI Summary from latest session */}
        <div className="col-span-12 lg:col-span-8 bg-card rounded-xl p-8 border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-lg">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{t("editorial.latestAiSummary")}</span>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 font-headline">
            <Brain className="h-6 w-6" style={{ color: "var(--color-success)" }} />
            {series.latestSessionNumber ? `Session #${series.latestSessionNumber}` : "Summary"}
          </h3>

          {aiSummary ? (
            <div className="space-y-6">
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                {aiSummary.discussionHighlights?.map((h, i) => (
                  <p key={i}><strong className="text-foreground">{h.category}:</strong> {h.summary}</p>
                ))}
                {(!aiSummary.discussionHighlights || aiSummary.discussionHighlights.length === 0) && aiSummary.cardBlurb && (
                  <p>{aiSummary.cardBlurb}</p>
                )}
              </div>

              {aiSummary.keyTakeaways && aiSummary.keyTakeaways.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">{t("editorial.keyTakeaways")}</h4>
                  <ul className="space-y-3">
                    {aiSummary.keyTakeaways.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "var(--color-success)" }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground italic">{t("editorial.noCompletedSessions")}</p>
          )}
        </div>

        {/* Score + Sentiment sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {series.latestSessionScore !== null && (
            <div className="bg-card rounded-xl p-6 border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">{t("editorial.aiAssessment")}</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl font-black text-foreground tabular-nums">{series.latestSessionScore.toFixed(1)}</div>
                <div className="flex-1">
                  <StarRating score={series.latestSessionScore} size="md" />
                  <p className="text-xs text-muted-foreground mt-1">{t("editorial.outOf5")}</p>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(series.latestSessionScore / 5) * 100}%`,
                    backgroundColor: series.latestSessionScore >= 4 ? "var(--color-success)" : series.latestSessionScore >= 3 ? "var(--primary)" : "var(--destructive)",
                  }}
                />
              </div>
              {aiSummary?.overallSentiment && (
                <p className="text-xs text-muted-foreground mt-3 capitalize">
                  {t("editorial.sentimentLabel")}: <span className="font-semibold text-foreground">{aiSummary.overallSentiment}</span>
                </p>
              )}
            </div>
          )}

          {/* Follow-up items */}
          {aiSummary?.followUpItems && aiSummary.followUpItems.length > 0 && (
            <div className="bg-card rounded-xl p-6 border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {t("editorial.nextSessionNudges")}
              </h3>
              <div className="space-y-3">
                {aiSummary.followUpItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session History */}
      <section className="mb-10">
        <h3 className="text-xl font-bold text-foreground mb-6 px-2 font-headline">{t("editorial.sessionHistory")}</h3>
        <div className="bg-card rounded-2xl border border-[var(--editorial-outline-variant,var(--border))]/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden divide-y divide-[var(--editorial-outline-variant,var(--border))]/50">
          {series.sessions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">{t("editorial.noSessions")}</p>
            </div>
          ) : (
            series.sessions.map((s) => {
              const isCompleted = s.status === "completed";
              const sentimentColor = s.sentiment === "positive" ? "var(--color-success)" : s.sentiment === "concerning" ? "var(--destructive)" : s.sentiment === "mixed" ? "var(--color-warning, #f59e0b)" : "transparent";
              return (
                <Link
                  key={s.id}
                  href={isCompleted ? `/sessions/${s.id}/summary` : `#`}
                  className={`flex items-center gap-6 p-5 transition-all ${
                    isCompleted
                      ? "hover:bg-muted border-l-4 border-transparent hover:border-primary group"
                      : "opacity-50 border-l-4 border-transparent cursor-default"
                  }`}
                  onClick={!isCompleted ? (e) => e.preventDefault() : undefined}
                >
                  <div className="text-center min-w-[50px]">
                    <p className="text-2xl font-extrabold text-foreground">#{s.sessionNumber}</p>
                  </div>

                  <div className="w-px h-10 bg-border/30" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">
                        {format.dateTime(new Date(s.scheduledAt), { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      {!isCompleted && (
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase tracking-wider">
                          {s.status}
                        </span>
                      )}
                      {s.durationMinutes && (
                        <span className="text-[10px] text-muted-foreground">{s.durationMinutes} min</span>
                      )}
                    </div>
                    {s.aiSnippet && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.aiSnippet}</p>
                    )}
                  </div>

                  {toNum(s.sessionScore) !== null && (
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sentimentColor }} />
                      <StarRating score={toNum(s.sessionScore)!} size="sm" />
                      <span className="text-xs font-bold text-muted-foreground tabular-nums">{toNum(s.sessionScore)!.toFixed(1)}</span>
                    </div>
                  )}

                  {isCompleted && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
