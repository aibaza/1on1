"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SeriesCard } from "./series-card";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays } from "lucide-react";

interface Series {
  id: string;
  managerId: string;
  cadence: string;
  status: string;
  nextSessionAt: string | null;
  report: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  latestSession: {
    id: string;
    status: string;
    sessionNumber: number;
    sessionScore: string | null;
  } | null;
}

interface SeriesListProps {
  initialSeries: Series[];
  currentUserId: string;
}

export function SeriesList({ initialSeries, currentUserId }: SeriesListProps) {
  const { data: series } = useQuery<Series[]>({
    queryKey: ["series"],
    queryFn: async () => {
      const res = await fetch("/api/series");
      if (!res.ok) throw new Error("Failed to fetch series");
      return res.json();
    },
    initialData: initialSeries,
  });

  if (series.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="mb-1 text-lg font-medium">No meeting series yet</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Create your first 1:1 series to start scheduling sessions.
        </p>
        <Button asChild>
          <Link href="/sessions/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Series
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {series.map((s) => (
        <SeriesCard
          key={s.id}
          series={s}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
