"use client";

import { FileText } from "lucide-react";
import type { RecentSession } from "@/lib/queries/dashboard";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { SessionListItem } from "@/components/ui/session-list-item";

interface RecentSessionsProps {
  sessions: RecentSession[];
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  const t = useTranslations("dashboard.recent");

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        heading={t("noSessions")}
        description={t("noSessionsDesc")}
      />
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <SessionListItem
          key={s.id}
          id={s.id}
          sessionNumber={s.sessionNumber}
          name={s.reportName}
          date={s.completedAt}
          score={s.sessionScore}
          aiSnippet={s.aiSummarySnippet}
          sentiment={s.sentiment}
          href={`/sessions/${s.id}/summary`}
        />
      ))}
    </div>
  );
}
