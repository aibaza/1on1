"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MemberPicker } from "@/components/people/member-picker";

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

interface TeamDetailClientProps {
  initialTeam: TeamData;
  initialMembers: TeamMember[];
  currentUserRole: string;
}

export function TeamDetailClient({
  initialTeam,
  initialMembers,
  currentUserRole,
}: TeamDetailClientProps) {
  const t = useTranslations("teams");
  const { showApiError } = useApiErrorToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage =
    currentUserRole === "admin" || currentUserRole === "manager";
  const isAdmin = currentUserRole === "admin";

  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
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
    mutationFn: async (payload: { name?: string; description?: string | null }) => {
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

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/teams"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToTeams")}
      </Link>

      {/* Team header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="text-2xl font-semibold h-auto py-0 px-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setNameValue(team.name);
                    setEditingName(false);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSaveName}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setNameValue(team.name);
                  setEditingName(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                {team.name}
              </h1>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditingName(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>

        {editingDescription ? (
          <div className="flex items-start gap-2 max-w-lg">
            <Textarea
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDescriptionValue(team.description ?? "");
                  setEditingDescription(false);
                }
              }}
            />
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSaveDescription}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setDescriptionValue(team.description ?? "");
                  setEditingDescription(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {team.description || t("noDescription")}
            </p>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setEditingDescription(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {team.managerName && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{t("teamLead", { name: team.managerName })}</Badge>
          </div>
        )}
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2">
        {canManage && (
          <Button
            size="sm"
            onClick={() => setMemberPickerOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("addMembers")}
          </Button>
        )}
        {isAdmin && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm(t("deleteConfirm"))) {
                deleteTeamMutation.mutate();
              }
            }}
            disabled={deleteTeamMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteTeamMutation.isPending ? t("deleting") : t("deleteTeam")}
          </Button>
        )}
      </div>

      {/* Members table */}
      <div>
        <h2 className="text-lg font-medium mb-3">
          {t("members", { count: members.length })}
        </h2>
        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t("noMembers")}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("joined")}</TableHead>
                  {canManage && <TableHead className="w-[80px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();
                  const joinedDate = new Date(
                    member.joinedAt
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <TableRow key={member.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage
                              src={member.avatarUrl ?? undefined}
                              alt={`${member.firstName} ${member.lastName}`}
                            />
                            <AvatarFallback className="text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {member.firstName} {member.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.role === "lead" ? "default" : "secondary"
                          }
                        >
                          {member.role === "lead" ? t("lead") : t("member")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {joinedDate}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              removeMemberMutation.mutate(member.userId)
                            }
                            disabled={removeMemberMutation.isPending}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Member picker dialog */}
      {canManage && (
        <MemberPicker
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
