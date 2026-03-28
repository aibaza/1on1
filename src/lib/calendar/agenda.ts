/**
 * Syncs talking points to calendar event descriptions.
 * When talking points are added/removed/toggled, updates the
 * next upcoming calendar event's description with the agenda.
 */

import { eq, and, asc } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { sessions, meetingSeries, talkingPoints, users } from "@/lib/db/schema";
import { syncEventDescription } from "./sync";

/**
 * Build a formatted agenda string from talking points.
 */
function formatAgenda(
  points: { content: string; isDiscussed: boolean; category: string | null }[],
  managerName: string,
  reportName: string,
  appUrl: string,
  seriesId: string
): string {
  const lines: string[] = [
    `1on1 meeting between ${managerName} and ${reportName}`,
    "",
  ];

  if (points.length > 0) {
    lines.push("Agenda:");

    // Group by category
    const byCategory = new Map<string, typeof points>();
    for (const p of points) {
      const cat = p.category || "General";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(p);
    }

    for (const [category, catPoints] of byCategory) {
      if (byCategory.size > 1) {
        lines.push(`\n${category}:`);
      }
      for (const p of catPoints) {
        const check = p.isDiscussed ? "x" : " ";
        lines.push(`  [${check}] ${p.content}`);
      }
    }
  }

  lines.push("", "---", `Open in 1on1: ${appUrl}/series/${seriesId}`);
  return lines.join("\n");
}

/**
 * Fetch talking points for a session and sync them to calendar events.
 */
export async function syncTalkingPointsToCalendar(
  sessionId: string
): Promise<void> {
  // Get session + series info
  const [sessionRow] = await adminDb
    .select({
      seriesId: sessions.seriesId,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!sessionRow) return;

  // Get talking points
  const points = await adminDb
    .select({
      content: talkingPoints.content,
      isDiscussed: talkingPoints.isDiscussed,
      category: talkingPoints.category,
    })
    .from(talkingPoints)
    .where(eq(talkingPoints.sessionId, sessionId))
    .orderBy(asc(talkingPoints.sortOrder));

  // Get series participants
  const [series] = await adminDb
    .select({
      managerId: meetingSeries.managerId,
      reportId: meetingSeries.reportId,
    })
    .from(meetingSeries)
    .where(eq(meetingSeries.id, sessionRow.seriesId))
    .limit(1);

  if (!series) return;

  const [managerRow] = await adminDb
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, series.managerId))
    .limit(1);

  const [reportRow] = await adminDb
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, series.reportId))
    .limit(1);

  const managerName = managerRow
    ? `${managerRow.firstName} ${managerRow.lastName}`
    : "Manager";
  const reportName = reportRow
    ? `${reportRow.firstName} ${reportRow.lastName}`
    : "Report";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4300";
  const description = formatAgenda(
    points,
    managerName,
    reportName,
    appUrl,
    sessionRow.seriesId
  );

  await syncEventDescription(sessionRow.seriesId, description);
}
