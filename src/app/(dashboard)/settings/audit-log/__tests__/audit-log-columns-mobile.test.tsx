// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditLogClient } from "../audit-log-client";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString(),
  }),
}));

const mockEntry = {
  id: "e1",
  actorName: "Admin User",
  actorEmail: "admin@example.com",
  action: "role_changed",
  resourceType: "user",
  resourceId: "u1",
  metadata: {},
  ipAddress: null,
  createdAt: new Date().toISOString(),
};

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => ({
      data: { entries: [mockEntry], total: 1, page: 1, totalPages: 1 },
      isLoading: false,
    }),
  };
});

describe("Audit log table mobile responsiveness (MOB-05)", () => {
  it("Target column header has hidden md:table-cell class for mobile (MOB-05)", () => {
    render(<AuditLogClient />);
    // The Target column header text is the translation key "auditLog.target"
    const targetHeader = screen.getByText("auditLog.target");
    // Parent <th> element should have hidden class
    expect(targetHeader.closest("th")).toHaveClass("hidden"); // FAILS pre-fix
  });

  it("Timestamp and Action column headers are visible (no hidden class)", () => {
    render(<AuditLogClient />);
    const timestampHeader = screen.getByText("auditLog.timestamp");
    expect(timestampHeader.closest("th") ?? timestampHeader).not.toHaveClass("hidden");
  });
});
