import { render } from "@react-email/render";
import { adminDb } from "@/lib/db";
import { sendEmail, getEmailFrom } from "@/lib/email/send";
import { SessionSummaryEmail } from "@/lib/email/templates/session-summary";
import { notifications } from "@/lib/db/schema/notifications";
import {
  sessions,
  meetingSeries,
  actionItems,
  users,
} from "@/lib/db/schema";
import { tenants } from "@/lib/db/schema/tenants";
import { eq, and } from "drizzle-orm";
import { createEmailTranslator } from "@/lib/email/translator";

/**
 * Send post-session summary emails to both manager and report.
 *
 * Called by the AI pipeline after completion (or after failure for degraded email).
 * Non-blocking: logs errors but does not throw.
 */
export async function sendPostSessionSummaryEmails(params: {
  sessionId: string;
  seriesId: string;
  tenantId: string;
  managerId: string;
  reportId: string;
}): Promise<void> {
  const { sessionId, seriesId, tenantId, managerId, reportId } = params;

  // Fetch session data
  const [session] = await adminDb
    .select({
      sessionNumber: sessions.sessionNumber,
      sessionScore: sessions.sessionScore,
      aiSummary: sessions.aiSummary,
      aiManagerAddendum: sessions.aiManagerAddendum,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) {
    console.error(
      `[Summary Email] Session ${sessionId} not found, skipping email`
    );
    return;
  }

  // Fetch series + manager + report
  const [series] = await adminDb
    .select()
    .from(meetingSeries)
    .where(eq(meetingSeries.id, seriesId))
    .limit(1);

  if (!series) {
    console.error(
      `[Summary Email] Series ${seriesId} not found, skipping email`
    );
    return;
  }

  // Resolve tenant content language for email translation
  const [tenantRow] = await adminDb
    .select({ contentLanguage: tenants.contentLanguage })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const locale = tenantRow?.contentLanguage ?? "en";
  const t = await createEmailTranslator(locale);

  const [manager] = await adminDb
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, managerId))
    .limit(1);

  const [report] = await adminDb
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, reportId))
    .limit(1);

  if (!manager || !report) {
    console.error(
      `[Summary Email] Manager or report not found, skipping email`
    );
    return;
  }

  const managerName = `${manager.firstName} ${manager.lastName}`;
  const reportName = `${report.firstName} ${report.lastName}`;

  // Fetch action items created in this session
  const sessionActionItems = await adminDb
    .select({
      title: actionItems.title,
      assigneeFirstName: users.firstName,
      assigneeLastName: users.lastName,
      dueDate: actionItems.dueDate,
    })
    .from(actionItems)
    .innerJoin(users, eq(actionItems.assigneeId, users.id))
    .where(
      and(
        eq(actionItems.sessionId, sessionId),
        eq(actionItems.tenantId, tenantId)
      )
    );

  const actionItemsList = sessionActionItems.map((ai) => {
    const assigneeName = `${ai.assigneeFirstName} ${ai.assigneeLastName}`;
    return {
      title: ai.title,
      assigneeName,
      dueDate: ai.dueDate,
      assignedToLabel: t("emails.sessionSummary.assignedTo", { assigneeName }),
      dueLabel: ai.dueDate ? t("emails.sessionSummary.due", { dueDate: ai.dueDate }) : null,
    };
  });

  const viewSessionUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sessions/${sessionId}/summary`;
  const sessionScore = session.sessionScore
    ? Number(session.sessionScore)
    : null;

  // Build AI summary for template (map schema fields to template props)
  const aiSummary = session.aiSummary
    ? {
        overallSentiment: session.aiSummary.overallSentiment,
        keyTakeaways: session.aiSummary.keyTakeaways,
        // Template expects areasOfConcern; derive from follow-up items
        areasOfConcern: session.aiSummary.followUpItems ?? [],
      }
    : null;

  // Build AI addendum for manager (map schema fields to template props)
  const aiAddendum = session.aiManagerAddendum
    ? {
        sentimentAnalysis: session.aiManagerAddendum.sentimentAnalysis,
        coachingSuggestions: session.aiManagerAddendum.coachingSuggestions ?? [],
        // Template expects riskIndicators; derive from patterns
        riskIndicators: session.aiManagerAddendum.patterns ?? [],
      }
    : null;

  const from = getEmailFrom();
  const subject = t("emails.sessionSummary.subject", { sessionNumber: session.sessionNumber });

  const baseLabels = {
    heading: t("emails.sessionSummary.heading", { sessionNumber: session.sessionNumber }),
    score: sessionScore !== null ? t("emails.sessionSummary.score", { score: sessionScore.toFixed(1) }) : "",
    keyTakeaways: t("emails.sessionSummary.keyTakeaways"),
    areasOfConcern: t("emails.sessionSummary.areasOfConcern"),
    aiPending: t("emails.sessionSummary.aiPending"),
    actionItems: t("emails.sessionSummary.actionItems"),
    assignedTo: t("emails.sessionSummary.assignedTo", { assigneeName: "" }),
    due: t("emails.sessionSummary.due", { dueDate: "" }),
    managerInsights: t("emails.sessionSummary.managerInsights"),
    coachingSuggestions: t("emails.sessionSummary.coachingSuggestions"),
    riskIndicators: t("emails.sessionSummary.riskIndicators"),
    button: t("emails.sessionSummary.button"),
    footer: t("emails.sessionSummary.footer"),
  };

  const labels = {
    ...baseLabels,
    greeting: t("emails.sessionSummary.greeting", { recipientName: report.firstName, otherPartyName: managerName }),
  };

  const managerLabels = {
    ...baseLabels,
    greeting: t("emails.sessionSummary.greeting", { recipientName: manager.firstName, otherPartyName: reportName }),
  };

  // Send report email (no addendum)
  try {
    const reportHtml = await render(
      SessionSummaryEmail({
        variant: "report",
        recipientName: report.firstName,
        otherPartyName: managerName,
        sessionNumber: session.sessionNumber,
        sessionScore,
        aiSummary,
        actionItems: actionItemsList,
        viewSessionUrl,
        labels,
      })
    );

    await sendEmail({
      from,
      to: report.email,
      subject,
      html: reportHtml,
    });

    // Insert audit notification record
    await adminDb.insert(notifications).values({
      tenantId,
      userId: reportId,
      type: "session_summary",
      channel: "email",
      referenceType: "session",
      referenceId: sessionId,
      scheduledFor: new Date(),
      status: "sent",
      sentAt: new Date(),
      subject,
    });

    console.log(
      `[Summary Email] Sent report email to ${report.email} for session ${sessionId}`
    );
  } catch (err) {
    console.error(
      `[Summary Email] Failed to send report email for session ${sessionId}:`,
      err
    );
  }

  // Send manager email (with addendum)
  try {
    const managerHtml = await render(
      SessionSummaryEmail({
        variant: "manager",
        recipientName: manager.firstName,
        otherPartyName: reportName,
        sessionNumber: session.sessionNumber,
        sessionScore,
        aiSummary,
        actionItems: actionItemsList,
        viewSessionUrl,
        aiAddendum,
        labels: managerLabels,
      })
    );

    await sendEmail({
      from,
      to: manager.email,
      subject,
      html: managerHtml,
    });

    // Insert audit notification record
    await adminDb.insert(notifications).values({
      tenantId,
      userId: managerId,
      type: "session_summary",
      channel: "email",
      referenceType: "session",
      referenceId: sessionId,
      scheduledFor: new Date(),
      status: "sent",
      sentAt: new Date(),
      subject,
    });

    console.log(
      `[Summary Email] Sent manager email to ${manager.email} for session ${sessionId}`
    );
  } catch (err) {
    console.error(
      `[Summary Email] Failed to send manager email for session ${sessionId}:`,
      err
    );
  }
}
