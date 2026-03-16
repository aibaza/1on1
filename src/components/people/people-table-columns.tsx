"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { useTranslations } from "next-intl";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    className?: string;
  }
}
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleSelect } from "./role-select";
import { ManagerSelect } from "./manager-select";
import { UserActionsMenu } from "./user-actions-menu";

export interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  managerId: string | null;
  managerName: string | null;
  isActive: boolean;
  status: "active" | "pending" | "deactivated";
  teams: { id: string; name: string }[];
  invitedAt: string | null;
  createdAt: string;
}

function getInitials(firstName: string, lastName: string): string {
  if (!firstName && !lastName) return "?";
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "deactivated":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "";
  }
}

interface CreateColumnsOptions {
  currentUserRole: string;
  currentUserId: string;
  allUsers: { id: string; firstName: string; lastName: string }[];
  t: ReturnType<typeof useTranslations<"people">>;
}

export function createColumns({
  currentUserRole,
  currentUserId,
  allUsers,
  t,
}: CreateColumnsOptions): ColumnDef<UserRow>[] {
  const isAdmin = currentUserRole === "admin";

  return [
    {
      id: "name",
      accessorFn: (row) => `${row.lastName} ${row.firstName}`,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.name")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {row.original.avatarUrl && (
              <AvatarImage src={row.original.avatarUrl} />
            )}
            <AvatarFallback>
              {getInitials(row.original.firstName, row.original.lastName)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "email",
      meta: { className: "hidden md:table-cell" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.email")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.role")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <RoleSelect
          userId={row.original.id}
          currentRole={row.original.role}
          disabled={!isAdmin || row.original.status === "pending"}
        />
      ),
      filterFn: (row, _id, value) => {
        if (!value || value === "all") return true;
        return row.original.role === value;
      },
    },
    {
      id: "teams",
      meta: { className: "hidden md:table-cell" },
      accessorFn: (row) => row.teams.map((team) => team.name).join(", "),
      header: () => t("table.teams"),
      cell: ({ row }) => {
        const userTeams = row.original.teams;
        if (userTeams.length === 0) {
          return <span className="text-muted-foreground">--</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {userTeams.map((team) => (
              <Badge key={team.id} variant="outline" className="text-xs">
                {team.name}
              </Badge>
            ))}
          </div>
        );
      },
      filterFn: (row, _id, value) => {
        if (!value || value === "all") return true;
        return row.original.teams.some((t) => t.id === value);
      },
    },
    {
      id: "manager",
      meta: { className: "hidden md:table-cell" },
      accessorFn: (row) => row.managerName ?? "",
      filterFn: (row, _id, value) => {
        if (!value || value === "all") return true;
        return row.original.managerId === value;
      },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.manager")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <ManagerSelect
          userId={row.original.id}
          currentManagerId={row.original.managerId}
          currentManagerName={row.original.managerName}
          users={allUsers}
          disabled={!isAdmin || row.original.status === "pending"}
        />
      ),
    },
    {
      accessorKey: "status",
      meta: { className: "hidden md:table-cell" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.status")}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant="outline" className={getStatusColor(status)}>
            {t(`table.${status}`)}
          </Badge>
        );
      },
      filterFn: (row, _id, value) => {
        if (!value || value === "all") return true;
        return row.original.status === value;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <UserActionsMenu
          user={row.original}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
        />
      ),
    },
  ];
}
