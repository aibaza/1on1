"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorialSeriesCard } from "@/components/series/editorial-series-card";

/**
 * Wraps the real EditorialSeriesCard with mock data for the landing page.
 * Uses demo={true} to disable navigation and API calls while keeping
 * all visual elements and hover states intact.
 */
export function ShowcaseSeriesCard() {
  const [queryClient] = useState(() => new QueryClient());

  const mockSeries = {
    id: "showcase-series-001",
    managerId: "showcase-manager-001",
    cadence: "weekly",
    defaultTemplateName: null,
    status: "active",
    nextSessionAt: new Date(Date.now() + 86400000).toISOString(),
    preferredDay: "mon",
    preferredTime: "14:00",
    manager: { id: "showcase-manager-001", firstName: "Ciprian", lastName: "Surmont" },
    report: {
      id: "showcase-report-001",
      firstName: "Ana",
      lastName: "Popescu",
      avatarUrl: null,
      jobTitle: "Senior Engineer",
      level: "senior",
    },
    latestSession: {
      id: "showcase-session-001",
      status: "completed",
      sessionNumber: 12,
      sessionScore: "4.2",
      scheduledAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      talkingPointCount: 3,
    },
    latestSummary: {
      blurb: "Angajament crescut pe obiectivele de dezvoltare profesională — energie ridicată, satisfacție cu proiectele curente.",
      sentiment: "positive",
    },
    assessmentHistory: [3.4, 3.6, 3.8, 3.5, 3.9, 4.0, 3.7, 4.1, 4.0, 4.3, 4.1, 4.2],
    questionHistories: [
      { questionText: "Work-life balance", scoreWeight: 1.0, values: [3.2, 3.5, 3.7, 3.3, 3.8, 3.9, 3.5, 4.0, 3.8, 4.1, 3.9, 4.0] },
      { questionText: "Career growth", scoreWeight: 0.8, values: [3.6, 3.8, 4.0, 3.7, 4.1, 4.2, 3.9, 4.3, 4.2, 4.5, 4.3, 4.4] },
      { questionText: "Team collaboration", scoreWeight: 0.6, values: [3.8, 3.9, 4.1, 3.6, 4.0, 4.1, 3.8, 4.2, 4.0, 4.3, 4.2, 4.3] },
    ],
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <EditorialSeriesCard
          series={mockSeries}
          currentUserId="showcase-manager-001"
          demo
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
