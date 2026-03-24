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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemedAvatarImage } from "@/components/ui/themed-avatar-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface TeamDetailClientProps {
  initialTeam: TeamData;
  currentUserLevel: string;
  currentUserId: string;
}

export function TeamDetailClient({
  initialTeam,
  currentUserLevel,
  currentUserId,
}: TeamDetailClientProps) {
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
                    setNameValue(team.teamName);
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
                  setNameValue(team.teamName);
                  setEditingName(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("teamPrefix")} {team.teamName}
              </h1>
              {canEditName && (
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

        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <ThemedAvatarImage name={team.managerName} uploadedUrl={team.managerAvatarUrl} />
            <AvatarFallback className="text-xs">
              {team.managerName.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Badge variant="outline">
            {t("teamLead", { name: team.managerName })}
          </Badge>
        </div>
      </div>

      {/* Members table */}
      <div>
        <h2 className="text-lg font-medium mb-3">
          {t("members", { count: team.members.length })}
        </h2>
        {team.members.length === 0 ? (
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
                  <TableHead>{t("jobTitle")}</TableHead>
                  <TableHead>{t("level")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.members.map((member) => {
                  const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <ThemedAvatarImage name={`${member.firstName} ${member.lastName}`} uploadedUrl={member.avatarUrl} />
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
                      <TableCell className="text-muted-foreground">
                        {member.jobTitle ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {member.level}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
