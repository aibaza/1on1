"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  level: string;
}

interface TeamData {
  managerId: string;
  teamName: string;
  managerName: string;
  managerEmail: string;
  managerAvatarUrl: string | null;
  members: TeamMember[];
}

interface EditorialTeamDetailProps {
  initialTeam: TeamData;
  currentUserLevel: string;
  currentUserId: string;
}

export function EditorialTeamDetail({
  initialTeam,
  currentUserLevel,
  currentUserId,
}: EditorialTeamDetailProps) {
  const t = useTranslations("teams");
  const { showApiError } = useApiErrorToast();
  const queryClient = useQueryClient();
  const canEditName =
    currentUserLevel === "admin" ||
    (currentUserLevel === "manager" && currentUserId === initialTeam.managerId);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(initialTeam.teamName);

  const { data: team } = useQuery<TeamData>({
    queryKey: ["team", initialTeam.managerId],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${initialTeam.managerId}`);
      if (!res.ok) throw new Error("Failed to fetch team");
      return res.json();
    },
    initialData: initialTeam,
  });

  const updateNameMutation = useMutation({
    mutationFn: async (teamName: string) => {
      const res = await fetch(`/api/teams/${initialTeam.managerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update team name");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("updated"));
      queryClient.invalidateQueries({
        queryKey: ["team", initialTeam.managerId],
      });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  function handleSaveName() {
    if (nameValue.trim() && nameValue !== team.teamName) {
      updateNameMutation.mutate(nameValue.trim());
    }
    setEditingName(false);
  }

  return (
    <div className="space-y-0">
      {/* Back link */}
      <Link
        href="/teams"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToTeams")}
      </Link>

      {/* Hero Header Section */}
      <section className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1 space-y-2">
            {/* Inline-editable team name */}
            {editingName ? (
              <div className="flex items-center gap-3">
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="font-headline text-5xl font-extrabold text-foreground tracking-tight bg-transparent border-b-2 border-primary outline-none w-full"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") {
                      setNameValue(team.teamName);
                      setEditingName(false);
                    }
                  }}
                />
                <button
                  onClick={handleSaveName}
                  className="p-2 rounded-lg hover:bg-accent text-primary transition-colors"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setNameValue(team.teamName);
                    setEditingName(false);
                  }}
                  className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="group flex items-center gap-3">
                <h1 className="font-headline text-5xl font-extrabold text-foreground tracking-tight">
                  {t("teamPrefix")} {team.teamName}
                </h1>
                {canEditName && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-accent text-muted-foreground transition-all"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Team Lead card */}
          <div className="flex items-center gap-4 bg-card p-3 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10">
            <img
              src={getAvatarUrl(team.managerName, team.managerAvatarUrl)}
              alt={team.managerName}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--editorial-tertiary,var(--color-success))] tracking-widest">
                {t("lead")}
              </p>
              <p className="font-headline font-bold text-foreground">
                {team.managerName}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Members Table Section */}
      <section className="bg-card rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10 overflow-hidden mb-12">
        {/* Header bar */}
        <div className="px-8 py-6 flex justify-between items-center border-b border-[var(--editorial-surface-container,var(--border))]">
          <h2 className="font-headline font-extrabold text-2xl text-foreground">
            {t("members", { count: team.members.length })}
          </h2>
        </div>

        {/* Table */}
        {team.members.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <p className="text-muted-foreground">{t("noMembers")}</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--editorial-surface-container-low,var(--muted))]">
                <th className="px-8 py-4 font-headline font-bold text-xs uppercase tracking-widest text-muted-foreground opacity-70">
                  {t("name")}
                </th>
                <th className="px-8 py-4 font-headline font-bold text-xs uppercase tracking-widest text-muted-foreground opacity-70">
                  {t("email")}
                </th>
                <th className="px-8 py-4 font-headline font-bold text-xs uppercase tracking-widest text-muted-foreground opacity-70">
                  {t("jobTitle")}
                </th>
                <th className="px-8 py-4 font-headline font-bold text-xs uppercase tracking-widest text-muted-foreground opacity-70">
                  {t("level")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--editorial-surface-container,var(--border))]">
              {team.members.map((member) => {
                const fullName = `${member.firstName} ${member.lastName}`;

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-[var(--editorial-surface-container-high,var(--accent))]/40"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(fullName, member.avatarUrl)}
                          alt={fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <span className="font-headline font-bold text-foreground">
                          {fullName}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-muted-foreground font-medium">
                      {member.email}
                    </td>
                    <td className="px-8 py-5 text-sm text-muted-foreground">
                      {member.jobTitle ?? "—"}
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--editorial-surface-container-highest,var(--muted))] text-muted-foreground">
                        {member.level}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
