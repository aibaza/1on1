"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import Link from "next/link";
import {
  ArrowLeft,
  Hash,
  Calendar,
  User,
  Share2,
  Sparkles,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Lock,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/ui/star-rating";
import { AmendedBadge } from "./amended-badge";
import { type SummaryAnswer, renderAnswerDisplay } from "./answer-utils";
import type { AISummary } from "@/lib/ai/schemas/summary";
import type { AIManagerAddendum } from "@/lib/ai/schemas/addendum";
import type { CorrectionEntry } from "./correction-history-panel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SummaryQuestion {
  id: string;
  questionText: string;
  answerType: string;
  answerConfig: unknown;
  isRequired: boolean;
  helpText: string | null;
  conditionalOnQuestionId: string | null;
  conditionalOperator: string | null;
  conditionalValue: string | null;
}

interface SummaryTalkingPoint { id: string; content: string; isDiscussed: boolean; }
interface SummaryActionItem { id: string; title: string; status: string; dueDate: string | null; assigneeName: string | null; category: string | null; }
interface SummaryPrivateNote { id: string; content: string; category: string | null; }

interface SummaryCategory {
  name: string;
  questions: SummaryQuestion[];
  answers: Record<string, SummaryAnswer>;
  sharedNotes: string;
  talkingPoints: SummaryTalkingPoint[];
  actionItems: SummaryActionItem[];
  privateNotes: SummaryPrivateNote[];
}

export interface EditorialSessionSummaryProps {
  sessionNumber: number;
  scheduledAt: string;
  completedAt: string | null;
  sessionScore: number | null;
  durationMinutes: number | null;
  status: string;
  categories: SummaryCategory[];
  isManager: boolean;
  seriesId: string;
  sessionId: string;
  aiStatus: string | null;
  aiSummary: AISummary | null;
  aiAddendum: AIManagerAddendum | null;
  managerId: string;
  reportId: string;
  managerName: string;
  reportName: string;
  managerTeam: string | null;
  reportTeam: string | null;
  correctionsByAnswerId: Record<string, CorrectionEntry[]>;
  allCorrections: CorrectionEntry[];
  isAdmin: boolean;
}

function getCategoryScore(cat: SummaryCategory): number | null {
  // Try numeric answers first (rating questions)
  const nums = Object.values(cat.answers).filter((a) => a.answerNumeric != null);
  if (nums.length > 0) {
    return nums.reduce((s, a) => s + (a.answerNumeric ?? 0), 0) / nums.length;
  }

  // Try mood answers (map to 1-5 scale)
  const moodMap: Record<string, number> = { very_bad: 1, bad: 2, okay: 3, good: 4, great: 5 };
  const moods = Object.values(cat.answers)
    .map((a) => {
      const val = (a.answerJson as { value?: string })?.value;
      return val ? moodMap[val] : null;
    })
    .filter((v): v is number => v != null);
  if (moods.length > 0) {
    return moods.reduce((s, v) => s + v, 0) / moods.length;
  }

  return null;
}

function getCategoryAnswerCount(cat: SummaryCategory): number {
  return Object.values(cat.answers).filter((a) => !a.skipped && (a.answerText || a.answerNumeric != null || a.answerJson)).length;
}

export function EditorialSessionSummary(props: EditorialSessionSummaryProps) {
  const {
    sessionNumber, scheduledAt, completedAt, sessionScore, durationMinutes,
    categories, isManager, seriesId, aiSummary, aiAddendum,
    managerName, reportName, managerTeam, reportTeam,
    correctionsByAnswerId,
  } = props;

  const t = useTranslations("sessions");
  const format = useFormatter();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => Object.fromEntries(categories.map((c, i) => [c.name, i === 0]))
  );

  const displayName = isManager ? reportName : managerName;
  const displayTeam = isManager ? reportTeam : managerTeam;
  const allActionItems = categories.flatMap((c) => c.actionItems);
  const allPrivateNotes = categories.flatMap((c) => c.privateNotes);

  // Build category data with scores and AI highlights
  const categoryData = categories.map((cat) => {
    const score = getCategoryScore(cat);
    const answerCount = getCategoryAnswerCount(cat);
    const highlight = aiSummary?.discussionHighlights?.find(
      (h) => h.category.toLowerCase() === cat.name.toLowerCase()
    );
    return { name: cat.name, score, answerCount, highlight: highlight?.summary ?? null };
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <section className="mb-10">
        <Link
          href={`/sessions/${seriesId}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">{t("summary.backToSeries")}</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-extrabold text-foreground tracking-tight font-headline">
                {displayName}
              </h1>
              {sessionScore !== null && (
                <div className="flex items-center bg-accent px-3 py-1 rounded-full text-sm font-bold gap-1">
                  {sessionScore.toFixed(1)}
                  <StarRating score={sessionScore} size="sm" />
                </div>
              )}
            </div>
            {displayTeam && <p className="text-muted-foreground text-lg">{displayTeam}</p>}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-1"><Hash className="h-4 w-4" />Session #{sessionNumber}</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format.dateTime(new Date(scheduledAt), { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1"><User className="h-4 w-4" />{managerName}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-muted text-foreground font-semibold rounded-xl hover:bg-accent transition-colors flex items-center gap-2">
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </div>
      </section>

      {/* Bento Grid: AI Summary + Category Scores */}
      <div className="grid grid-cols-12 gap-6 mb-10">
        {/* AI Summary Hero */}
        <div className="col-span-12 lg:col-span-8 bg-card rounded-xl p-8 shadow-sm border border-border/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-lg">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Generated by AI</span>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 font-headline">
            <Brain className="h-6 w-6" style={{ color: "var(--color-success)" }} />
            Executive Summary
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
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Key Takeaways</h4>
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

              {aiSummary.overallSentiment && (
                <div className="bg-accent rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sentiment</span>
                  </div>
                  <p className="text-sm text-muted-foreground capitalize font-medium">{aiSummary.overallSentiment}</p>
                </div>
              )}

              {aiAddendum?.sentimentAnalysis && (
                <div className="p-4 rounded-xl bg-accent/50 border-l-4 border-primary italic text-muted-foreground text-sm">
                  &ldquo;{aiAddendum.sentimentAnalysis}&rdquo;
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground italic">AI summary not yet available.</p>
          )}
        </div>

        {/* Sidebar: AI Score + Category Highlights */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* AI Assessment Score — hero card */}
          {sessionScore !== null && (
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">AI Assessment</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl font-black text-foreground tabular-nums">{sessionScore.toFixed(1)}</div>
                <div className="flex-1">
                  <StarRating score={sessionScore} size="md" />
                  <p className="text-xs text-muted-foreground mt-1">out of 5.0</p>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(sessionScore / 5) * 100}%`,
                    backgroundColor: sessionScore >= 4 ? "var(--color-success)" : sessionScore >= 3 ? "var(--primary)" : "var(--destructive)",
                  }}
                />
              </div>
              {aiSummary?.overallSentiment && (
                <p className="text-xs text-muted-foreground mt-3 capitalize">
                  Sentiment: <span className="font-semibold text-foreground">{aiSummary.overallSentiment}</span>
                </p>
              )}
            </div>
          )}

          {/* Category Highlights */}
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Category Highlights</h3>
          {categoryData.map((cat) => (
            <div key={cat.name} className="bg-card rounded-xl p-5 shadow-sm border-l-4 border-primary/30">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-foreground text-sm">{cat.name}</h4>
                <span className="text-[10px] text-muted-foreground">{cat.answerCount} answers</span>
              </div>
              {cat.highlight ? (
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{cat.highlight}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">No AI highlights for this category.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Responses Accordion */}
      <section className="mb-10">
        <h3 className="text-xl font-bold text-foreground mb-6 px-2 font-headline">Detailed Responses</h3>
        <div className="space-y-4">
          {categories.map((cat) => (
            <Collapsible
              key={cat.name}
              open={openCategories[cat.name]}
              onOpenChange={() => setOpenCategories((prev) => ({ ...prev, [cat.name]: !prev[cat.name] }))}
            >
              <div className="bg-card rounded-xl shadow-sm overflow-hidden">
                <CollapsibleTrigger className="w-full p-5 flex items-center justify-between cursor-pointer hover:bg-accent transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-bold text-lg">{cat.name}</h4>
                    <span className="text-xs text-muted-foreground">{cat.questions.length} questions</span>
                  </div>
                  {openCategories[cat.name]
                    ? <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-6 border-t border-border space-y-6">
                    {cat.questions.map((q) => {
                      const answer = cat.answers[q.id];
                      const hasCorrection = answer && (correctionsByAnswerId[answer.id]?.length ?? 0) > 0;
                      return (
                        <div key={q.id} className="space-y-2">
                          <div className="flex items-start justify-between">
                            <p className="text-xs font-bold text-primary">{q.questionText}</p>
                            {hasCorrection && <AmendedBadge isAmended />}
                          </div>
                          {answer && (
                            <div className="bg-accent/50 p-4 rounded-lg">
                              {renderAnswerDisplay(q.answerType, answer, t)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </section>

      {/* Action Items + Notes (2-col) */}
      <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3 px-2 font-headline">
            Action Items
            <span className="bg-muted text-foreground text-xs font-bold px-2 py-0.5 rounded-full">{allActionItems.length}</span>
          </h3>
          <div className="space-y-3">
            {allActionItems.map((item) => {
              const borderColor = item.status === "completed" ? "border-green-500" : "border-muted-foreground/30";
              return (
                <div key={item.id} className={cn("bg-card p-5 rounded-xl shadow-sm border-l-4 flex items-start gap-4", borderColor)}>
                  <div className="mt-1">
                    {item.status === "completed"
                      ? <Check className="h-5 w-5 text-green-600" />
                      : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-sm mb-1">{item.title}</h5>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase">
                      {item.assigneeName && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {item.assigneeName}</span>}
                      {item.dueDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format.dateTime(new Date(item.dueDate), { month: "short", day: "numeric" })}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {allActionItems.length === 0 && <p className="text-sm text-muted-foreground italic px-2">No action items.</p>}
          </div>
        </div>

        <div className="space-y-10">
          {/* AI follow-up suggestions */}
          {aiSummary?.followUpItems && aiSummary.followUpItems.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3 px-2 font-headline">
                Next Session Nudges
                <Sparkles className="h-4 w-4 text-primary" />
              </h3>
              <div className="space-y-3">
                {aiSummary.followUpItems.map((item, i) => (
                  <div key={i} className="bg-primary/5 p-4 rounded-xl flex items-center gap-4 hover:bg-primary/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs font-bold text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Private notes */}
          {isManager && allPrivateNotes.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3 px-2 font-headline">
                Private Notes
                <Lock className="h-4 w-4 text-muted-foreground" />
              </h3>
              <div className="bg-accent p-6 rounded-xl border border-border/30">
                {allPrivateNotes.map((note) => (
                  <div key={note.id} className="text-sm text-muted-foreground leading-relaxed mb-4 last:mb-0" dangerouslySetInnerHTML={{ __html: note.content }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            {format.dateTime(new Date(scheduledAt), { month: "long", day: "numeric", year: "numeric" })}
            {completedAt && ` — ${format.dateTime(new Date(completedAt), { hour: "numeric", minute: "numeric" })}`}
            {durationMinutes && ` (${durationMinutes} min)`}
          </p>
        </div>
      </footer>
    </div>
  );
}
