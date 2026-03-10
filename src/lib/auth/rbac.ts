import { NextResponse } from "next/server";

const ROLE_HIERARCHY = { admin: 3, manager: 2, member: 1 } as const;
export type Role = keyof typeof ROLE_HIERARCHY;

/**
 * Returns a 403 response if the user's role is below the required level.
 * Returns null if authorized.
 */
export function requireRole(
  userRole: string,
  minimumRole: Role
): NextResponse | null {
  const userLevel = ROLE_HIERARCHY[userRole as Role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole];

  if (userLevel < requiredLevel) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Check if user can manage teams (admin or manager).
 */
export function canManageTeams(role: string): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Check if user can manage templates (admin or manager).
 */
export function canManageTemplates(role: string): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Check if user can manage meeting series (admin or manager).
 */
export function canManageSeries(role: string): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Check if user is a participant in a series (manager or report).
 */
export function isSeriesParticipant(
  userId: string,
  series: { managerId: string; reportId: string }
): boolean {
  return userId === series.managerId || userId === series.reportId;
}

/**
 * Check if user can perform admin-only actions.
 */
export function isAdmin(role: string): boolean {
  return role === "admin";
}

/**
 * Check if user can correct answers on a session belonging to this series.
 *
 * Admin can correct any session in the tenant.
 * Manager can only correct sessions on their own series (userId === series.managerId).
 * Members cannot correct answers.
 */
export function canCorrectSession(
  userId: string,
  userRole: string,
  series: { managerId: string }
): boolean {
  if (isAdmin(userRole)) return true;
  return userRole === "manager" && userId === series.managerId;
}
