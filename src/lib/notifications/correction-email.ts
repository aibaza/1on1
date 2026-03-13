import { render } from "@react-email/render";
import { adminDb } from "@/lib/db";
import { getTransport, getEmailFrom } from "@/lib/email/send";
import { CorrectionNotificationEmail } from "@/lib/email/templates/correction-notification";
import { notifications } from "@/lib/db/schema/notifications";
import { eq, and, gt } from "drizzle-orm";
import { createEmailTranslator } from "@/lib/email/translator";

const DEDUP_WINDOW_MS = 5 * 60 * 1000;

interface Recipient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
}

interface SendCorrectionEmailsParams {
  tenantId: string;
  sessionId: string;
  sessionNumber: number;
  reportUser: Recipient;
  managerUser: Recipient;
  activeAdmins: Recipient[];
  sessionUrl: string;
  locale: string;
}

interface WasRecentlySentParams {
  tenantId: string;
  userId: string;
  sessionId: string;
  // Optional white-box test param — not used in production; dedup is enforced via DB predicate
  _testSentAt?: Date;
}

/**
 * Check whether a correction email was already sent to this user for this session
 * within the 5-minute deduplication window.
 *
 * Must be exported so tests can invoke it directly.
 */
export async function wasRecentlySent(params: WasRecentlySentParams): Promise<boolean> {
  const { tenantId, userId, sessionId } = params;
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);

  const [existing] = await adminDb
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, userId),
        eq(notifications.type, "session_correction"),
        eq(notifications.referenceId, sessionId),
        eq(notifications.status, "sent"),
        gt(notifications.sentAt, cutoff)
      )
    )
    .limit(1);

  return !!existing;
}

/**
 * Send correction notification emails to all eligible recipients:
 * - The report (the person whose answer was corrected)
 * - All active tenant admins (except those who are also the report — dedup by id)
 *
 * Fire-and-forget-safe: catches and logs errors per recipient, never throws.
 * Called after a session answer correction is persisted.
 */
export async function sendCorrectionEmails(
  params: SendCorrectionEmailsParams
): Promise<void> {
  const {
    tenantId,
    sessionId,
    sessionNumber,
    reportUser,
    managerUser,
    activeAdmins,
    sessionUrl,
    locale,
  } = params;

  // Build deduplicated recipient list:
  // - Start with the report
  // - Add admins who are NOT also the report (filter by id) and are active
  const recipients: Recipient[] = [reportUser];
  for (const admin of activeAdmins) {
    if (admin.id !== reportUser.id && admin.isActive !== false) {
      recipients.push(admin);
    }
  }

  // Resolve i18n translator for tenant locale
  const t = await createEmailTranslator(locale);

  const transport = getTransport();
  const from = getEmailFrom();
  const subject = t("emails.sessionCorrection.subject");

  for (const recipient of recipients) {
    try {
      // 5-minute session-level deduplication — skip if already sent recently
      // On dedup check error, default to false (allow sending) so DB failures don't silently drop emails
      let alreadySent = false;
      try {
        alreadySent = await wasRecentlySent({ tenantId, userId: recipient.id, sessionId });
      } catch (dedupErr) {
        console.warn(
          `[Correction Email] Dedup check failed for ${recipient.email}, proceeding with send:`,
          dedupErr
        );
      }
      if (alreadySent) {
        continue;
      }

      // Determine the "other party" for this recipient's email body:
      // - For the report: the manager corrected the answer, so other party = manager
      // - For an admin: provide the manager name as context
      const otherPartyName = `${managerUser.firstName} ${managerUser.lastName}`;

      const heading = t("emails.sessionCorrection.heading");
      const greeting = t("emails.sessionCorrection.greeting", {
        recipientName: recipient.firstName,
      });
      const body = t("emails.sessionCorrection.body", {
        sessionNumber,
        otherPartyName,
      });
      const buttonLabel = t("emails.sessionCorrection.buttonLabel");
      const footer = t("emails.sessionCorrection.footer");

      const html = await render(
        CorrectionNotificationEmail({
          sessionUrl,
          heading,
          greeting,
          body,
          buttonLabel,
          footer,
        })
      );

      await transport.sendMail({
        from,
        to: recipient.email,
        subject,
        html,
      });

      // Insert audit notification record after successful send
      await adminDb.insert(notifications).values({
        tenantId,
        userId: recipient.id,
        type: "session_correction",
        channel: "email",
        referenceType: "session",
        referenceId: sessionId,
        scheduledFor: new Date(),
        status: "sent",
        sentAt: new Date(),
        subject,
      });

      console.log(
        `[Correction Email] Sent to ${recipient.email} for session ${sessionId}`
      );
    } catch (err) {
      console.error(
        `[Correction Email] Failed to send to ${recipient.email} for session ${sessionId}:`,
        err
      );
    }
  }
}
