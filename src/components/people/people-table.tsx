"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { createColumns, type UserRow } from "./people-table-columns";
import { ProfileSheet } from "./profile-sheet";

interface PeopleTableProps {
  initialData: UserRow[];
  currentUserRole: string;
  currentUserId: string;
  availableTeams: { id: string; name: string }[];
}

export function PeopleTable({
  initialData,
  currentUserRole,
  currentUserId,
  availableTeams,
}: PeopleTableProps) {
  const t = useTranslations("people");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: users } = useQuery<UserRow[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    initialData,
  });

  // Build available managers list (users who manage at least one person)
  const availableManagers = useMemo(() => {
    const managerMap = new Map<string, string>();
    for (const u of users ?? []) {
      if (u.managerId && u.managerName) {
        managerMap.set(u.managerId, u.managerName);
      }
    }
    return Array.from(managerMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  // Build allUsers list for manager select
  const allUsers = useMemo(
    () =>
      (users ?? [])
        .filter((u) => u.status !== "pending" || u.firstName)
        .map((u) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
        })),
    [users]
  );

  const columns = useMemo(
    () => createColumns({ currentUserRole, currentUserId, allUsers, t }),
    [currentUserRole, currentUserId, allUsers, t]
  );

  const table = useReactTable({
    data: users ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const user = row.original;
      return (
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        (user.jobTitle?.toLowerCase().includes(search) ?? false)
      );
    },
  });

  const selectedUser = useMemo(
    () => (users ?? []).find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("table.searchPlaceholder")}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={
            (table.getColumn("role")?.getFilterValue() as string) ?? "all"
          }
          onValueChange={(value) =>
            table.getColumn("role")?.setFilterValue(value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t("table.role")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("table.allRoles")}</SelectItem>
            <SelectItem value="admin">{t("table.admin")}</SelectItem>
            <SelectItem value="manager">{t("table.manager")}</SelectItem>
            <SelectItem value="member">{t("table.member")}</SelectItem>
          </SelectContent>
        </Select>

        {availableTeams.length > 0 && (
          <Select
            value={
              (table.getColumn("teams")?.getFilterValue() as string) ?? "all"
            }
            onValueChange={(value) =>
              table
                .getColumn("teams")
                ?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t("table.teams")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("table.allTeams")}</SelectItem>
              {availableTeams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {availableManagers.length > 0 && (
          <Select
            value={
              (table.getColumn("manager")?.getFilterValue() as string) ?? "all"
            }
            onValueChange={(value) =>
              table
                .getColumn("manager")
                ?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("table.manager")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("table.allManagers")}</SelectItem>
              {availableManagers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={
            (table.getColumn("status")?.getFilterValue() as string) ?? "all"
          }
          onValueChange={(value) =>
            table
              .getColumn("status")
              ?.setFilterValue(value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("table.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("table.allStatus")}</SelectItem>
            <SelectItem value="active">{t("table.active")}</SelectItem>
            <SelectItem value="pending">{t("table.pending")}</SelectItem>
            <SelectItem value="deactivated">{t("table.deactivated")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.className}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedUserId(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.columnDef.meta?.className}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("table.noUsers")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("table.showing", {
              from: table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1,
              to: Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              ),
              total: table.getFilteredRowModel().rows.length,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {t("table.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {t("table.next")}
            </Button>
          </div>
        </div>
      )}

      {/* Profile Sheet */}
      <ProfileSheet
        user={selectedUser}
        open={!!selectedUserId}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
      />
    </div>
  );
}
