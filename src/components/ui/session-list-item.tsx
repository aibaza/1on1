"use client";

import Link from "next/link";
import { useFormatter } from "next-intl";
import { StarRating } from "@/components/ui/star-rating";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SessionListItemProps {
  id: string;
  sessionNumber: number;
  /** Date string to display (completedAt or scheduledAt) */
  date: string;
  /** Score on 0–5 scale */
  score: number | null;
  /** Link destination — if omitted, row is not clickable */
  href?: string;
  /** Report name (shown in dashboard context where series isn't obvious) */
  name?: string;
  /** AI summary snippet */
  aiSnippet?: string | null;
  /** Status badge label (e.g. "Completed", "In Progress") */
  statusLabel?: string;
  /** Status badge variant */
  statusVariant?: "default" | "secondary" | "outline" | "destructive";
  /** AI sentiment: "positive" | "concerning" | "mixed" — drives colored bottom border */
  sentiment?: string | null;
  /** Extra element rendered after star/date (e.g. Resume button) */
  trailing?: React.ReactNode;
  className?: string;
}

const sentimentBorder: Record<string, string> = {
  positive: "border-l-4 border-l-green-500/50 dark:border-l-green-400/60",
  concerning: "border-l-4 border-l-red-500/50 dark:border-l-red-400/60",
  mixed: "border-l-4 border-l-amber-500/50 dark:border-l-amber-400/60",
};

export function SessionListItem({
  sessionNumber,
  date,
  score,
  href,
  name,
  aiSnippet,
  sentiment,
  statusLabel,
  statusVariant = "outline",
  trailing,
  className,
}: SessionListItemProps) {
  const format = useFormatter();

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border px-4 py-3 transition-all duration-200 overflow-hidden",
        href && "hover:bg-muted/50 hover:shadow-sm",
        sentiment && sentimentBorder[sentiment],
        className,
      )}
    >
      {/* Left: session info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">
            #{sessionNumber}
          </span>
          {name && (
            <span className="text-sm font-medium truncate">{name}</span>
          )}
          {statusLabel && (
            <Badge variant={statusVariant} className="text-xs shrink-0">
              {statusLabel}
            </Badge>
          )}
        </div>
        {aiSnippet && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {aiSnippet}
          </p>
        )}
      </div>

      {/* Right: star rating + date stacked, plus trailing */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-col items-end gap-0.5">
          <StarRating score={score} size="sm" />
          <span className="text-xs text-muted-foreground">
            {format.dateTime(new Date(date), {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        {trailing}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return <div>{content}</div>;
}
