"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemedAvatarImage } from "@/components/ui/themed-avatar-image";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

interface DerivedTeam {
  managerId: string;
  teamName: string;
  managerName: string;
  managerAvatarUrl: string | null;
  memberCount: number;
}

interface EditorialTeamsGridProps {
  initialTeams: DerivedTeam[];
}

export function EditorialTeamsGrid({ initialTeams }: EditorialTeamsGridProps) {
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

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-headline font-extrabold text-foreground tracking-tight">
            {t("title")}
          </h1>
          <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-bold rounded-full">
            {teamsList.length}
          </span>
        </div>
        <p className="text-muted-foreground text-lg max-w-xl">
          {t("description")}
        </p>
      </div>

      {/* Teams grid */}
      {teamsList.length === 0 ? (
        <EmptyState
          icon={Users}
          heading={t("empty")}
          description={t("emptyDesc")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamsList.map((team) => (
            <Link key={team.managerId} href={`/teams/${team.managerId}`} className="block">
              <div className="group relative bg-card p-6 rounded-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5 cursor-pointer">
                {/* Top: icon */}
                <div className="flex justify-between items-start mb-6">
                  <div className="h-12 w-12 rounded-xl bg-[var(--editorial-secondary-container,var(--secondary))] flex items-center justify-center text-[var(--editorial-on-secondary-container,var(--secondary-foreground))]">
                    <Users className="h-6 w-6" />
                  </div>
                </div>

                {/* Team name */}
                <h3 className="font-headline text-xl font-bold text-foreground mb-6">
                  {t("teamPrefix")} {team.teamName}
                </h3>

                {/* Bottom section */}
                <div className="space-y-4 pt-6 border-t border-[var(--editorial-surface-container-low,var(--border))]">
                  {/* Team lead row */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <ThemedAvatarImage name={team.managerName} uploadedUrl={team.managerAvatarUrl} />
                      <AvatarFallback className="text-xs">{team.managerName.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">
                      {team.managerName}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {t("lead")}
                    </span>
                  </div>

                  {/* Member count */}
                  <div className="flex items-center text-xs text-muted-foreground gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {team.memberCount} {t("membersLabel")}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
