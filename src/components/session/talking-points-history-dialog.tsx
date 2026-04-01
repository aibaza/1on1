"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SeriesTalkingPoint {
  id: string;
  content: string;
  category: string | null;
  isDiscussed: boolean;
  discussedAt: string | null;
  authorId: string;
  author: { firstName: string; lastName: string } | null;
  sessionNumber: number;
  sessionDate: string | null;
  carriedFromSessionId: string | null;
  createdAt: string;
}

interface TalkingPointsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talkingPoints: SeriesTalkingPoint[];
}

function SessionGroup({
  sessionNumber,
  sessionDate,
  points,
  defaultOpen,
}: {
  sessionNumber: number;
  sessionDate: string | null;
  points: SeriesTalkingPoint[];
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const t = useTranslations("sessions");
  const format = useFormatter();

  const discussedCount = points.filter((p) => p.isDiscussed).length;

  // Group by category
  const grouped = useMemo(() => {
    const groups = new Map<string, SeriesTalkingPoint[]>();
    for (const point of points) {
      const cat = point.category ?? "General";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(point);
    }
    return Array.from(groups.entries());
  }, [points]);

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-2 py-2 text-sm font-semibold font-headline hover:text-primary transition-colors cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 text-left">
          {t("context.fromSession", { number: sessionNumber })}
          {sessionDate && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {format.dateTime(new Date(sessionDate), {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </span>
        <Badge
          variant="outline"
          className="h-5 px-1.5 text-[10px] text-muted-foreground"
        >
          {discussedCount}/{points.length}
        </Badge>
      </button>

      {isOpen && (
        <div className="ml-2 space-y-3 pb-4">
          {grouped.map(([category, catPoints]) => (
            <div key={category}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 ml-1">
                {category}
              </p>
              <ul className="space-y-1">
                {catPoints.map((point) => (
                  <li
                    key={point.id}
                    className={cn(
                      "flex items-start gap-2 rounded-xl border px-3 py-2 text-xs",
                      point.isDiscussed
                        ? "border-border/30 bg-muted/30"
                        : "border-border/50"
                    )}
                  >
                    {point.isDiscussed ? (
                      <CheckCircle2 className="size-4 shrink-0 text-green-600 mt-0.5" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground/40 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "leading-tight",
                          point.isDiscussed && "text-muted-foreground"
                        )}
                      >
                        {point.content}
                      </p>
                      {point.author && (
                        <p className="text-muted-foreground mt-0.5">
                          {point.author.firstName} {point.author.lastName}
                          {point.carriedFromSessionId && (
                            <span className="ml-1 italic">
                              &middot; {t("historyDialog.carried")}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TalkingPointsHistoryDialog({
  open,
  onOpenChange,
  talkingPoints,
}: TalkingPointsHistoryDialogProps) {
  const t = useTranslations("sessions");

  // Group by session number (newest first)
  const grouped = useMemo(() => {
    const groups = new Map<
      number,
      { date: string | null; points: SeriesTalkingPoint[] }
    >();
    for (const tp of talkingPoints) {
      if (!groups.has(tp.sessionNumber)) {
        groups.set(tp.sessionNumber, {
          date: tp.sessionDate,
          points: [],
        });
      }
      groups.get(tp.sessionNumber)!.points.push(tp);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => b - a);
  }, [talkingPoints]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {t("historyDialog.allTalkingPoints")}
          </DialogTitle>
          <DialogDescription>
            {t("historyDialog.talkingPointsDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y">
          {grouped.map(([sessionNum, { date, points }], idx) => (
            <SessionGroup
              key={sessionNum}
              sessionNumber={sessionNum}
              sessionDate={date}
              points={points}
              defaultOpen={idx === 0}
            />
          ))}
          {grouped.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground italic">
              {t("historyDialog.noTalkingPoints")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
