"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { TeamCard } from "@/components/people/team-card";
import { EmptyState } from "@/components/ui/empty-state";

interface DerivedTeam {
  managerId: string;
  teamName: string;
  managerName: string;
  managerAvatarUrl: string | null;
  memberCount: number;
}

interface TeamsGridProps {
  initialTeams: DerivedTeam[];
}

export function TeamsGrid({ initialTeams }: TeamsGridProps) {
  const t = useTranslations("teams");

  const { data: teamsList } = useQuery<DerivedTeam[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
    initialData: initialTeams,
  });

  if (teamsList.length === 0) {
    return (
      <EmptyState
        icon={Users}
        heading={t("empty")}
        description={t("emptyDesc")}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teamsList.map((team) => (
        <TeamCard key={team.managerId} team={team} />
      ))}
    </div>
  );
}
