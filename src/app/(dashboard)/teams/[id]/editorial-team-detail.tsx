"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  Check,
  X,
  Users,
  AlertTriangle,
} from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import { EditorialMemberPicker } from "@/components/people/editorial-member-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

interface TeamData {
  id: string;
  name: string;
  description: string | null;
  managerId: string | null;
  managerName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EditorialTeamDetailProps {
  initialTeam: TeamData;
  initialMembers: TeamMember[];
  currentUserRole: string;
}

export function EditorialTeamDetail({
  initialTeam,
  initialMembers,
  currentUserRole,
}: EditorialTeamDetailProps) {
  const t = useTranslations("teams");
  const format = useFormatter();
  const { showApiError } = useApiErrorToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage =
    currentUserRole === "admin" || currentUserRole === "manager";
  const isAdmin = currentUserRole === "admin";

  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [nameValue, setNameValue] = useState(initialTeam.name);
  const [descriptionValue, setDescriptionValue] = useState(
    initialTeam.description ?? ""
  );

  const { data: team } = useQuery<TeamData>({
    queryKey: ["team", initialTeam.id],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${initialTeam.id}`);
      if (!res.ok) throw new Error("Failed to fetch team");
      const data = await res.json();
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        managerId: data.managerId,
        managerName: data.managerName,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    },
    initialData: initialTeam,
  });

  const { data: members } = useQuery<TeamMember[]>({
    queryKey: ["team", initialTeam.id, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${initialTeam.id}`);
      if (!res.ok) throw new Error("Failed to fetch team");
      const data = await res.json();
      return data.members;
    },
    initialData: initialMembers,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      name?: string;
      description?: string | null;
    }) => {
      const res = await fetch(`/api/teams/${initialTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update team");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("updated"));
      queryClient.invalidateQueries({
        queryKey: ["team", initialTeam.id],
      });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/teams/${initialTeam.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("memberRemoved"));
      queryClient.invalidateQueries({
        queryKey: ["team", initialTeam.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["team", initialTeam.id, "members"],
      });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/teams/${initialTeam.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete team");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      router.push("/teams");
    },
    onError: (error) => {
      showApiError(error);
    },
  });

  function handleSaveName() {
    if (nameValue.trim() && nameValue !== team.name) {
      updateMutation.mutate({ name: nameValue.trim() });
    }
    setEditingName(false);
  }

  function handleSaveDescription() {
    const newDesc = descriptionValue.trim() || null;
    if (newDesc !== team.description) {
      updateMutation.mutate({ description: newDesc });
    }
    setEditingDescription(false);
  }

  const existingMemberIds = members.map((m) => m.userId);

  // Find the lead member for the hero section avatar
  const leadMember = members.find((m) => m.role === "lead");

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
                      setNameValue(team.name);
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
                    setNameValue(team.name);
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
                  {team.name}
                </h1>
                {canManage && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-accent text-muted-foreground transition-all"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Inline-editable description */}
            {editingDescription ? (
              <div className="flex items-start gap-3 max-w-2xl">
                <textarea
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  rows={3}
                  className="text-muted-foreground text-lg leading-relaxed max-w-2xl bg-transparent border-b-2 border-primary outline-none w-full resize-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setDescriptionValue(team.description ?? "");
                      setEditingDescription(false);
                    }
                  }}
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleSaveDescription}
                    className="p-2 rounded-lg hover:bg-accent text-primary transition-colors"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDescriptionValue(team.description ?? "");
                      setEditingDescription(false);
                    }}
                    className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="group flex items-center gap-2">
                <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                  {team.description || t("noDescription")}
                </p>
                {canManage && (
                  <button
                    onClick={() => setEditingDescription(true)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-all"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Team Lead card */}
          {team.managerName && (
            <div className="flex items-center gap-4 bg-card p-3 rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10">
              <img
                src={getAvatarUrl(
                  team.managerName,
                  leadMember?.avatarUrl ?? null
                )}
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
          )}
        </div>
      </section>

      {/* Members Table Section */}
      <section className="bg-card rounded-xl shadow-sm border border-[var(--editorial-outline-variant,var(--border))]/10 overflow-hidden mb-12">
        {/* Header bar */}
        <div className="px-8 py-6 flex justify-between items-center border-b border-[var(--editorial-surface-container,var(--border))]">
          <div className="flex items-center gap-4">
            <h2 className="font-headline font-extrabold text-2xl text-foreground">
              {t("members", { count: members.length })}
            </h2>
          </div>
          {canManage && (
            <button
              onClick={() => setMemberPickerOpen(true)}
              className="flex items-center gap-2 bg-[var(--editorial-secondary-container,var(--secondary))] hover:bg-[var(--editorial-secondary-container,var(--secondary))]/80 text-[var(--editorial-on-secondary-container,var(--secondary-foreground))] px-5 py-2.5 rounded-lg font-headline font-bold text-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t("addMembers")}
            </button>
          )}
        </div>

        {/* Table */}
        {members.length === 0 ? (
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
                  {t("role")}
                </th>
                <th className="px-8 py-4 font-headline font-bold text-xs uppercase tracking-widest text-muted-foreground opacity-70">
                  {t("joined")}
                </th>
                {canManage && (
                  <th className="px-8 py-4 font-headline font-bold text-xs uppercase tracking-widest text-muted-foreground opacity-70 w-[80px]" />
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--editorial-surface-container,var(--border))]">
              {members.map((member) => {
                const fullName = `${member.firstName} ${member.lastName}`;
                const joinedDate = format.dateTime(
                  new Date(member.joinedAt),
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                );

                return (
                  <tr
                    key={member.userId}
                    className="hover:bg-[var(--editorial-surface-container-high,var(--accent))]/40 group"
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
                    <td className="px-8 py-5">
                      {member.role === "lead" ? (
                        <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--editorial-primary-container,var(--primary))] text-[var(--on-primary-container,var(--primary-foreground))]">
                          {t("lead")}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--editorial-surface-container-highest,var(--muted))] text-muted-foreground">
                          {t("member")}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-sm text-muted-foreground">
                      {joinedDate}
                    </td>
                    {canManage && (
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() =>
                            removeMemberMutation.mutate(member.userId)
                          }
                          disabled={removeMemberMutation.isPending}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Danger Zone (admin only) */}
      {isAdmin && (
        <section className="mt-20">
          <div className="p-8 rounded-xl border-2 border-dashed border-destructive/30 bg-destructive/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="font-headline font-bold text-destructive text-xl flex items-center justify-center md:justify-start gap-2">
                <AlertTriangle className="h-5 w-5" />
                {t("dangerZone")}
              </h3>
              <p className="text-muted-foreground text-sm max-w-md">
                {t("dangerZoneDesc")}
              </p>
            </div>

            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
            >
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="px-8 py-3 bg-card border border-destructive text-destructive font-headline font-bold rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  {t("deleteTeam")}
                </span>
              </button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteConfirm")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() => deleteTeamMutation.mutate()}
                    disabled={deleteTeamMutation.isPending}
                  >
                    {deleteTeamMutation.isPending
                      ? t("deleting")
                      : t("deleteTeam")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      )}

      {/* Member picker dialog */}
      {canManage && (
        <EditorialMemberPicker
          teamId={initialTeam.id}
          existingMemberIds={existingMemberIds}
          open={memberPickerOpen}
          onOpenChange={setMemberPickerOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["team", initialTeam.id],
            });
            queryClient.invalidateQueries({
              queryKey: ["team", initialTeam.id, "members"],
            });
            queryClient.invalidateQueries({ queryKey: ["teams"] });
          }}
        />
      )}
    </div>
  );
}
