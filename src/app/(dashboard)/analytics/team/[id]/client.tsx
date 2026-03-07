"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  PeriodSelector,
  periodToDateRange,
  type PeriodValue,
} from "@/components/analytics/period-selector";
import { TeamOverview } from "@/components/analytics/team-overview";
import { TeamHeatmap } from "@/components/analytics/team-heatmap";
import type { TeamAverage, HeatmapDataPoint } from "@/lib/analytics/queries";

interface TeamInfo {
  id: string;
  name: string;
}

interface TeamAnalyticsApiResponse {
  team: TeamInfo;
  memberCount: number;
  teamAverages: TeamAverage[];
  heatmapData: HeatmapDataPoint[];
}

interface TeamAnalyticsClientProps {
  team: TeamInfo;
  memberCount: number;
  initialTeamAverages: TeamAverage[];
  initialHeatmapData: HeatmapDataPoint[];
  teamId: string;
}

export function TeamAnalyticsClient({
  team,
  memberCount,
  initialTeamAverages,
  initialHeatmapData,
  teamId,
}: TeamAnalyticsClientProps) {
  const t = useTranslations("analytics");
  const defaultRange = periodToDateRange("3mo");
  const [period, setPeriod] = useState<PeriodValue>({
    preset: "3mo",
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
  });
  const [anonymize, setAnonymize] = useState(false);

  const startStr = period.startDate.toISOString().split("T")[0];
  const endStr = period.endDate.toISOString().split("T")[0];

  const { data, isLoading } = useQuery<TeamAnalyticsApiResponse>({
    queryKey: ["team-analytics", teamId, period.preset, startStr, endStr, anonymize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period.preset === "custom") {
        params.set("startDate", startStr!);
        params.set("endDate", endStr!);
      } else {
        params.set("period", period.preset);
      }
      if (anonymize) {
        params.set("anonymize", "true");
      }
      const res = await fetch(`/api/analytics/team/${teamId}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch team analytics");
      return res.json();
    },
    initialData:
      period.preset === "3mo" && !anonymize
        ? {
            team,
            memberCount,
            teamAverages: initialTeamAverages,
            heatmapData: initialHeatmapData,
          }
        : undefined,
    staleTime: 60_000,
  });

  const teamAverages = data?.teamAverages ?? [];
  const heatmapData = data?.heatmapData ?? [];

  // Extract unique categories from averages + heatmap
  const categories = Array.from(
    new Set([
      ...teamAverages.map((a) => a.category),
      ...heatmapData.map((d) => d.category),
    ]),
  ).sort();

  const handleAnonymizeChange = useCallback((checked: boolean) => {
    setAnonymize(checked);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {team.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-6">
        <PeriodSelector value={period} onChange={setPeriod} />
        <div className="flex items-center gap-2">
          <Switch
            id="anonymize"
            checked={anonymize}
            onCheckedChange={handleAnonymizeChange}
          />
          <Label htmlFor="anonymize" className="text-sm">
            Anonymize
          </Label>
        </div>
      </div>

      {/* Team overview (aggregated scores) */}
      <div>
        <h2 className="mb-3 text-base font-medium">{t("categoryAverages")}</h2>
        <TeamOverview data={teamAverages} loading={isLoading} anonymize={anonymize} memberCount={data?.memberCount ?? memberCount} />
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("teamHeatmap")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamHeatmap data={heatmapData} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
