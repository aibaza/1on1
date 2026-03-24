import { NextResponse } from "next/server";

const LEVEL_HIERARCHY = { admin: 3, manager: 2, member: 1 } as const;
export type Level = keyof typeof LEVEL_HIERARCHY;

/**
 * Returns a 403 response if the user's level is below the required minimum.
 * Returns null if authorized.
 */
export function requireLevel(
  userLevel: string,
  minimumLevel: Level
): NextResponse | null {
  const current = LEVEL_HIERARCHY[userLevel as Level] ?? 0;
  const required = LEVEL_HIERARCHY[minimumLevel];

  if (current < required) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Check if user can manage teams (admin or manager).
 */
export function canManageTeams(level: string): boolean {
  return level === "admin" || level === "manager";
}

/**
 * Check if user can manage templates (admin or manager).
 */
export function canManageTemplates(level: string): boolean {
  return level === "admin" || level === "manager";
}

/**
 * Check if user can manage meeting series (admin or manager).
 */
export function canManageSeries(level: string): boolean {
  return level === "admin" || level === "manager";
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
export function isAdmin(level: string): boolean {
  return level === "admin";
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
  userLevel: string,
  series: { managerId: string }
): boolean {
  if (isAdmin(userLevel)) return true;
  return userLevel === "manager" && userId === series.managerId;
}
