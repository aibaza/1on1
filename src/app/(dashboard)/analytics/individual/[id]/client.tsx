"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemedAvatarImage } from "@/components/ui/themed-avatar-image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PeriodSelector,
  periodToDateRange,
  type PeriodValue,
} from "@/components/analytics/period-selector";
import { ScoreTrendChart } from "@/components/analytics/score-trend-chart";
import { CategoryBreakdown } from "@/components/analytics/category-breakdown";
import { SessionHistoryTable } from "@/components/analytics/session-history-table";
import { VelocityChart } from "@/components/analytics/velocity-chart";
import { AdherenceChart } from "@/components/analytics/adherence-chart";
import { CsvExportButton } from "@/components/analytics/csv-export-button";
import type {
  ScoreTrendPoint,
  CategoryAverage,
  SessionComparisonRow,
  VelocityPoint,
  AdherencePoint,
  SessionHistoryData,
} from "@/lib/analytics/queries";

interface TargetUser {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  avatarUrl: string | null;
}

interface SessionOption {
  id: string;
  date: string;
  number: number;
}

interface AnalyticsApiResponse {
  scoreTrend: ScoreTrendPoint[];
  categoryAverages: CategoryAverage[];
  sessions: SessionOption[];
  comparison: SessionComparisonRow[] | null;
  velocity: VelocityPoint[];
  adherence: AdherencePoint[];
  historyTable: SessionHistoryData;
}

interface IndividualAnalyticsClientProps {
  targetUser: TargetUser;
  initialScoreTrend: ScoreTrendPoint[];
  initialCategoryAverages: CategoryAverage[];
  initialSessions: SessionOption[];
  initialVelocity: VelocityPoint[];
  initialAdherence: AdherencePoint[];
  initialHistoryTable: SessionHistoryData;
  targetUserId: string;
}

export function IndividualAnalyticsClient({
  targetUser,
  initialScoreTrend,
  initialCategoryAverages,
  initialSessions,
  initialVelocity,
  initialAdherence,
  initialHistoryTable,
  targetUserId,
}: IndividualAnalyticsClientProps) {
  const defaultRange = periodToDateRange("3mo");
  const [period, setPeriod] = useState<PeriodValue>({
    preset: "3mo",
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
  });

  const [compareIds] = useState<{ id1: string; id2: string } | null>(null);

  const startStr = period.startDate.toISOString().split("T")[0];
  const endStr = period.endDate.toISOString().split("T")[0];

  // Fetch analytics data when period changes
  const { data: analyticsData, isLoading } = useQuery<AnalyticsApiResponse>({
    queryKey: ["analytics", targetUserId, period.preset, startStr, endStr],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period.preset === "custom") {
        params.set("startDate", startStr!);
        params.set("endDate", endStr!);
      } else {
        params.set("period", period.preset);
      }
      const res = await fetch(
        `/api/analytics/individual/${targetUserId}?${params}`,
      );
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    initialData:
      period.preset === "3mo" && !compareIds
        ? {
            scoreTrend: initialScoreTrend,
            categoryAverages: initialCategoryAverages,
            sessions: initialSessions,
            comparison: null,
            velocity: initialVelocity,
            adherence: initialAdherence,
            historyTable: initialHistoryTable,
          }
        : undefined,
    staleTime: 60_000,
  });

  // Fetch comparison data
  const { data: comparisonResult } = useQuery<AnalyticsApiResponse>({
    queryKey: [
      "analytics-compare",
      targetUserId,
      compareIds?.id1,
      compareIds?.id2,
    ],
    queryFn: async () => {
      if (!compareIds) throw new Error("No comparison IDs");
      const params = new URLSearchParams({
        period: period.preset === "custom" ? "3mo" : period.preset,
        compare: `${compareIds.id1},${compareIds.id2}`,
      });
      const res = await fetch(
        `/api/analytics/individual/${targetUserId}?${params}`,
      );
      if (!res.ok) throw new Error("Failed to fetch comparison");
      return res.json();
    },
    enabled: !!compareIds,
    staleTime: 60_000,
  });


  const scoreTrend = analyticsData?.scoreTrend ?? [];
  const categoryAverages = analyticsData?.categoryAverages ?? [];
  const sessionList = analyticsData?.sessions ?? [];
  const comparisonData = comparisonResult?.comparison ?? null;
  const historyTable = analyticsData?.historyTable ?? { sessions: [], rows: [] };
  const velocity = analyticsData?.velocity ?? [];
  const adherence = analyticsData?.adherence ?? [];

  const t = useTranslations("analytics");
  const initials = `${targetUser.firstName[0]}${targetUser.lastName[0]}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <ThemedAvatarImage name={`${targetUser.firstName} ${targetUser.lastName}`} uploadedUrl={targetUser.avatarUrl} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {targetUser.firstName} {targetUser.lastName}
          </h1>
          {targetUser.jobTitle && (
            <p className="text-sm text-muted-foreground">
              {targetUser.jobTitle}
            </p>
          )}
        </div>
      </div>

      {/* Period selector + Export All */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PeriodSelector value={period} onChange={setPeriod} />
        <CsvExportButton
          type="full"
          userId={targetUserId}
          period={period}
          variant="full"
          label={t("export.all")}
        />
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("chart.scoreTrend")}</CardTitle>
            <CsvExportButton
              type="score-trend"
              userId={targetUserId}
              period={period}
              label={t("export.scoreTrend")}
            />
          </CardHeader>
          <CardContent>
            <ScoreTrendChart data={scoreTrend} loading={isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("chart.categoryBreakdown")}</CardTitle>
            <CsvExportButton
              type="categories"
              userId={targetUserId}
              period={period}
              label={t("export.categories")}
            />
          </CardHeader>
          <CardContent>
            <CategoryBreakdown data={categoryAverages} />
          </CardContent>
        </Card>
      </div>

      {/* Operational charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("chart.actionItemVelocity")}</CardTitle>
            <CsvExportButton
              type="velocity"
              userId={targetUserId}
              period={period}
              label={t("export.velocity")}
            />
          </CardHeader>
          <CardContent>
            <VelocityChart data={velocity} loading={isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("chart.meetingAdherence")}</CardTitle>
            <CsvExportButton
              type="adherence"
              userId={targetUserId}
              period={period}
              label={t("export.adherence")}
            />
          </CardHeader>
          <CardContent>
            <AdherenceChart data={adherence} loading={isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Full session history table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("chart.sessionHistory")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SessionHistoryTable data={historyTable} />
        </CardContent>
      </Card>
    </div>
  );
}
