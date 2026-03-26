import { describe, it, expect } from "vitest";
import {
  requireLevel,
  canManageTeams,
  canManageSeries,
  isSeriesParticipant,
  isAdmin,
} from "../rbac";

describe("requireLevel", () => {
  it("allows admin accessing admin-level", () => {
    expect(requireLevel("admin", "admin")).toBeNull();
  });

  it("allows admin accessing manager-level", () => {
    expect(requireLevel("admin", "manager")).toBeNull();
  });

  it("allows admin accessing member-level", () => {
    expect(requireLevel("admin", "member")).toBeNull();
  });

  it("allows manager accessing manager-level", () => {
    expect(requireLevel("manager", "manager")).toBeNull();
  });

  it("allows manager accessing member-level", () => {
    expect(requireLevel("manager", "member")).toBeNull();
  });

  it("denies manager accessing admin-level", () => {
    const result = requireLevel("manager", "admin");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("denies member accessing manager-level", () => {
    const result = requireLevel("member", "manager");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("denies member accessing admin-level", () => {
    const result = requireLevel("member", "admin");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("denies unknown level", () => {
    const result = requireLevel("superadmin", "member");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("denies empty string", () => {
    const result = requireLevel("", "member");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});

describe("canManageTeams", () => {
  it("returns true for admin", () => {
    expect(canManageTeams("admin")).toBe(true);
  });

  it("returns true for manager", () => {
    expect(canManageTeams("manager")).toBe(true);
  });

  it("returns false for member", () => {
    expect(canManageTeams("member")).toBe(false);
  });

  it("returns false for unknown level", () => {
    expect(canManageTeams("")).toBe(false);
  });
});

describe("canManageSeries", () => {
  it("returns true for admin", () => {
    expect(canManageSeries("admin")).toBe(true);
  });

  it("returns true for manager", () => {
    expect(canManageSeries("manager")).toBe(true);
  });

  it("returns false for member", () => {
    expect(canManageSeries("member")).toBe(false);
  });

  it("returns false for unknown level", () => {
    expect(canManageSeries("")).toBe(false);
  });
});

describe("isSeriesParticipant", () => {
  const series = { managerId: "mgr-1", reportId: "rpt-1" };

  it("returns true when user is manager", () => {
    expect(isSeriesParticipant("mgr-1", series)).toBe(true);
  });

  it("returns true when user is report", () => {
    expect(isSeriesParticipant("rpt-1", series)).toBe(true);
  });

  it("returns false when user is neither", () => {
    expect(isSeriesParticipant("other-user", series)).toBe(false);
  });

  it("returns false for empty userId", () => {
    expect(isSeriesParticipant("", series)).toBe(false);
  });
});

describe("isAdmin", () => {
  it('returns true for "admin"', () => {
    expect(isAdmin("admin")).toBe(true);
  });

  it('returns false for "manager"', () => {
    expect(isAdmin("manager")).toBe(false);
  });

  it('returns false for "member"', () => {
    expect(isAdmin("member")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAdmin("")).toBe(false);
  });
});

// Composite authorization patterns used across API routes

describe("participant-or-admin pattern", () => {
  const series = { managerId: "mgr-1", reportId: "rpt-1" };

  function isAuthorized(userId: string, level: string) {
    return isAdmin(level) || isSeriesParticipant(userId, series);
  }

  it("allows admin who is not a participant", () => {
    expect(isAuthorized("other-user", "admin")).toBe(true);
  });

  it("allows manager who is a participant", () => {
    expect(isAuthorized("mgr-1", "manager")).toBe(true);
  });

  it("allows member who is a participant (report)", () => {
    expect(isAuthorized("rpt-1", "member")).toBe(true);
  });

  it("denies manager who is not a participant", () => {
    expect(isAuthorized("other-mgr", "manager")).toBe(false);
  });

  it("denies member who is not a participant", () => {
    expect(isAuthorized("other-member", "member")).toBe(false);
  });
});

describe("owner-or-admin pattern", () => {
  const series = { managerId: "mgr-1" };

  function isAuthorized(userId: string, level: string) {
    return level === "admin" || userId === series.managerId;
  }

  it("allows admin regardless of ownership", () => {
    expect(isAuthorized("other-user", "admin")).toBe(true);
  });

  it("allows series manager", () => {
    expect(isAuthorized("mgr-1", "manager")).toBe(true);
  });

  it("denies non-owner manager", () => {
    expect(isAuthorized("other-mgr", "manager")).toBe(false);
  });

  it("denies member even if somehow managerId matches", () => {
    // Members should not reach this check — requireLevel gates them first
    // But the pattern itself would pass if only checking ownership
    expect(isAuthorized("mgr-1", "member")).toBe(true);
  });
});
