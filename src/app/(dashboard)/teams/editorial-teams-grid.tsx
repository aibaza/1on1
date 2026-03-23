"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useFormatter } from "next-intl";
import { Plus, Users, Calendar, UserX } from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import { TeamCreateDialog } from "@/components/people/team-create-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

interface TeamData {
  id: string;
  name: string;
  description: string | null;
  managerId: string | null;
  managerName: string | null;
  managerAvatarUrl: string | null;
  memberCount: number;
  createdAt: string;
}

interface EditorialTeamsGridProps {
  initialTeams: TeamData[];
  users: { id: string; firstName: string; lastName: string }[];
  currentUserRole: string;
}

export function EditorialTeamsGrid({
  initialTeams,
  users,
  currentUserRole,
}: EditorialTeamsGridProps) {
  const t = useTranslations("teams");
  const format = useFormatter();
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = currentUserRole === "admin" || currentUserRole === "manager";

  const { data: teamsList, refetch } = useQuery<TeamData[]>({
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
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

        {canCreate && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-[var(--editorial-primary-container,var(--primary))] text-primary-foreground font-headline font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            {t("createTeam")}
          </button>
        )}
      </div>

      {/* Teams grid */}
      {teamsList.length === 0 ? (
        <EmptyState
          icon={Users}
          heading={t("empty")}
          description={t("emptyDesc")}
          action={
            canCreate ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createTeam")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamsList.map((team) => {
            const createdDate = format.dateTime(new Date(team.createdAt), {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Link key={team.id} href={`/teams/${team.id}`} className="block">
                <div className="group relative bg-card p-6 rounded-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5 cursor-pointer">
                  {/* Top: icon + team name tag */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-12 w-12 rounded-xl bg-[var(--editorial-secondary-container,var(--secondary))] flex items-center justify-center text-[var(--editorial-on-secondary-container,var(--secondary-foreground))]">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>

                  {/* Team name */}
                  <h3 className="font-headline text-xl font-bold text-foreground mb-2">
                    {team.name}
                  </h3>

                  {/* Description */}
                  {team.description ? (
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-8 h-10">
                      {team.description}
                    </p>
                  ) : (
                    <p className="text-muted-foreground/60 text-sm italic mb-8 h-10">
                      {t("noDescription")}
                    </p>
                  )}

                  {/* Bottom section */}
                  <div className="space-y-4 pt-6 border-t border-[var(--editorial-surface-container-low,var(--border))]">
                    {/* Team lead row */}
                    {team.managerName ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(team.managerName, team.managerAvatarUrl)}
                          alt={team.managerName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="text-sm font-medium text-foreground">
                          {team.managerName}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {t("lead")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <UserX className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground italic">
                          {t("noLeadAssigned")}
                        </span>
                      </div>
                    )}

                    {/* Member count + created date */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {team.memberCount} {t("membersLabel")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {createdDate}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create team dialog */}
      {canCreate && (
        <TeamCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => refetch()}
          users={users}
        />
      )}
    </div>
  );
}
