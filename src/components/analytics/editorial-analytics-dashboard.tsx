"use client";

import { useQuery } from "@tanstack/react-query";
import EditorialAnalyticsAdmin from "./editorial-analytics-admin";
import EditorialAnalyticsManager from "./editorial-analytics-manager";
import EditorialAnalyticsMember from "./editorial-analytics-member";

interface EditorialAnalyticsDashboardProps {
  currentUserLevel: string;
}

export function EditorialAnalyticsDashboard({ currentUserLevel }: EditorialAnalyticsDashboardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics-health"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/health");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 bg-muted rounded-lg w-96" />
        <div className="h-6 bg-muted rounded-lg w-64" />
        <div className="grid grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Failed to load analytics data.
      </div>
    );
  }

  if (currentUserLevel === "admin" || currentUserLevel === "manager") {
    return <EditorialAnalyticsAdmin data={data} />;
  }

  return <EditorialAnalyticsMember data={data} />;
}
