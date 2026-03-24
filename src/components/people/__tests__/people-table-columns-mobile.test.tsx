import { describe, it, expect } from "vitest";
import { createColumns } from "../people-table-columns";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    className?: string;
  }
}

const t = (key: string) => key;
const columns = createColumns({
  currentUserLevel: "admin",
  currentUserId: "u1",
  allUsers: [],
  t: t as ReturnType<typeof import("next-intl").useTranslations<"people">>,
});

const SECONDARY_COLUMN_IDS = ["email", "teams", "manager", "status"];
const PRIMARY_COLUMN_IDS = ["name", "actions"];

describe("People table column mobile responsiveness (MOB-04)", () => {
  it("secondary columns have hidden md:table-cell meta className (MOB-04)", () => {
    for (const id of SECONDARY_COLUMN_IDS) {
      const col = columns.find(
        (c) =>
          (c as { accessorKey?: string }).accessorKey === id || c.id === id
      );
      expect(col?.meta?.className).toContain("hidden"); // FAILS pre-fix
    }
  });

  it("primary columns (name, actions) do not have hidden class", () => {
    for (const id of PRIMARY_COLUMN_IDS) {
      const col = columns.find(
        (c) =>
          (c as { accessorKey?: string }).accessorKey === id || c.id === id
      );
      expect(col?.meta?.className ?? "").not.toContain("hidden"); // passes pre-fix
    }
  });
});
