import "server-only";
import { render } from "@react-email/render";
import { eq } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendEmail, getEmailFrom } from "@/lib/email/send";
import type { SendEmailAttachment } from "@/lib/email/send";
import { createEmailTranslator } from "@/lib/email/translator";
import { FeedbackNewReportEmail } from "@/lib/email/templates/feedback-new-report";
import { FeedbackAdminReplyEmail } from "@/lib/email/templates/feedback-admin-reply";
import { FeedbackUserReplyEmail } from "@/lib/email/templates/feedback-user-reply";
import { fetchScreenshotBuffer } from "@/lib/feedback/blob";

interface FeedbackReportLike {
  id: string;
  ticketNumber: number;
  type: "bug" | "suggestion";
  title: string;
  description: string;
  pageUrl: string;
  viewport: unknown;
  userAgent: string;
  screenshotUrl: string | null;
}

interface ReporterLike {
  id: string;
  name: string;
  email: string;
}

function getFeedbackInbox(): string {
  return process.env.FEEDBACK_EMAIL_TO || "support@1on1.works";
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://1on1.works";
}

/**
 * Locale to use for notifications addressed to the support inbox (platform-side).
 * Falls back to English.
 */
function getPlatformLocale(): string {
  return process.env.FEEDBACK_NOTIFICATION_LOCALE || "en";
}

/**
 * Look up a user's preferred language, falling back to English when the row
 * cannot be found (e.g. deleted account). Never throws.
 */
async function getUserLocale(userId: string): Promise<string> {
  try {
    const row = await adminDb.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { language: true },
    });
    return row?.language ?? "en";
  } catch (err) {
    console.error(`getUserLocale: failed to look up user ${userId}:`, err);
    return "en";
  }
}

function normalizeViewport(v: unknown): { w: number; h: number } {
  if (v && typeof v === "object" && "w" in v && "h" in v) {
    const vv = v as { w: unknown; h: unknown };
    if (typeof vv.w === "number" && typeof vv.h === "number") {
      return { w: vv.w, h: vv.h };
    }
  }
  return { w: 0, h: 0 };
}

/**
 * Notify the support inbox that a new feedback report has been filed.
 * If the report has a screenshotUrl, it is fetched and inlined via `cid:screenshot`.
 * Failures are logged and swallowed so the API response is not affected.
 */
export async function notifyNewReport(
  report: FeedbackReportLike,
  reporter: ReporterLike,
  tenantName: string
): Promise<void> {
  try {
    const locale = getPlatformLocale();
    const t = await createEmailTranslator(locale);

    const attachments: SendEmailAttachment[] = [];
    let hasScreenshot = false;
    if (report.screenshotUrl) {
      try {
        const screenshot = await fetchScreenshotBuffer(report.screenshotUrl);
        if (screenshot) {
          attachments.push({
            filename: `feedback-${report.ticketNumber}.png`,
            content: screenshot.buffer,
            contentType: screenshot.contentType,
            cid: "screenshot",
          });
          hasScreenshot = true;
        }
      } catch (err) {
        console.error(
          `notifyNewReport: error fetching screenshot for report ${report.id}:`,
          err
        );
      }
    }

    const viewport = normalizeViewport(report.viewport);
    const typeLabel = t(`emails.feedbackNewReport.types.${report.type}`);
    const appUrl = getAppUrl();
    const adminUrl = `${appUrl}/admin/feedback/${report.ticketNumber}`;

    const html = await render(
      FeedbackNewReportEmail({
        ticketNumber: report.ticketNumber,
        typeLabel,
        title: report.title,
        description: report.description,
        pageUrl: report.pageUrl,
        viewport,
        userAgent: report.userAgent,
        reporterName: reporter.name,
        reporterEmail: reporter.email,
        tenantName,
        adminUrl,
        hasScreenshot,
        eyebrow: t("emails.feedbackNewReport.ticketLabel"),
        heading: t("emails.feedbackNewReport.heading", {
          reporterName: reporter.name,
        }),
        reporterLabel: t("emails.feedbackNewReport.reporterLabel"),
        tenantLabel: t("emails.feedbackNewReport.tenantLabel"),
        pageUrlLabel: t("emails.feedbackNewReport.pageUrlLabel"),
        viewportLabel: t("emails.feedbackNewReport.viewportLabel"),
        userAgentLabel: t("emails.feedbackNewReport.userAgentLabel"),
        screenshotLabel: t("emails.feedbackNewReport.screenshotLabel"),
        screenshotAttached: t("emails.feedbackNewReport.screenshotAttached"),
        viewInApp: t("emails.feedbackNewReport.viewInApp"),
        replyHint: t("emails.feedbackNewReport.replyHint"),
        footer: t("emails.feedbackNewReport.footer"),
      })
    );

    await sendEmail({
      from: getEmailFrom(),
      to: getFeedbackInbox(),
      replyTo: reporter.email,
      subject: t("emails.feedbackNewReport.subject", {
        ticketNumber: report.ticketNumber,
        type: typeLabel,
        title: report.title,
      }),
      html,
      ...(attachments.length > 0 ? { attachments } : {}),
    });
  } catch (err) {
    console.error("notifyNewReport: failed to send email:", err);
  }
}

/**
 * Notify the reporter that a platform admin has replied on their ticket.
 */
export async function notifyAdminReply(
  report: FeedbackReportLike,
  reporter: ReporterLike,
  messageBody: string
): Promise<void> {
  try {
    const locale = await getUserLocale(reporter.id);
    const t = await createEmailTranslator(locale);

    const appUrl = getAppUrl();
    const ticketUrl = `${appUrl}/feedback/mine/${report.id}`;

    const ticketLabel = `FB-${report.ticketNumber}`;

    const html = await render(
      FeedbackAdminReplyEmail({
        ticketNumber: report.ticketNumber,
        title: report.title,
        body: messageBody,
        ticketUrl,
        eyebrow: t("emails.feedbackAdminReply.heading"),
        heading: t("emails.feedbackAdminReply.heading"),
        greeting: t("emails.feedbackAdminReply.greeting", {
          reporterName: reporter.name,
        }),
        intro: t("emails.feedbackAdminReply.body", { ticketLabel }),
        viewThread: t("emails.feedbackAdminReply.viewThread"),
        footer: t("emails.feedbackAdminReply.footer"),
      })
    );

    await sendEmail({
      from: getEmailFrom(),
      to: reporter.email,
      replyTo: getFeedbackInbox(),
      subject: t("emails.feedbackAdminReply.subject", {
        ticketNumber: report.ticketNumber,
        title: report.title,
      }),
      html,
    });
  } catch (err) {
    console.error("notifyAdminReply: failed to send email:", err);
  }
}

/**
 * Notify the support inbox that the reporter has added a new message.
 */
export async function notifyReporterReply(
  report: FeedbackReportLike,
  reporter: ReporterLike,
  messageBody: string,
  tenantName: string
): Promise<void> {
  try {
    const locale = getPlatformLocale();
    const t = await createEmailTranslator(locale);

    const appUrl = getAppUrl();
    const adminUrl = `${appUrl}/admin/feedback/${report.ticketNumber}`;
    const ticketLabel = `FB-${report.ticketNumber}`;

    const html = await render(
      FeedbackUserReplyEmail({
        ticketNumber: report.ticketNumber,
        title: report.title,
        body: messageBody,
        reporterName: reporter.name,
        reporterEmail: reporter.email,
        tenantName,
        adminUrl,
        eyebrow: t("emails.feedbackUserReply.heading", {
          reporterName: reporter.name,
        }),
        heading: t("emails.feedbackUserReply.heading", {
          reporterName: reporter.name,
        }),
        greeting: t("emails.feedbackUserReply.greeting", { ticketLabel }),
        reporterLabel: t("emails.feedbackNewReport.reporterLabel"),
        tenantLabel: t("emails.feedbackNewReport.tenantLabel"),
        viewInApp: t("emails.feedbackUserReply.viewInApp"),
        replyHint: t("emails.feedbackNewReport.replyHint"),
        footer: t("emails.feedbackUserReply.footer"),
      })
    );

    await sendEmail({
      from: getEmailFrom(),
      to: getFeedbackInbox(),
      replyTo: reporter.email,
      subject: t("emails.feedbackUserReply.subject", {
        ticketNumber: report.ticketNumber,
        title: report.title,
      }),
      html,
    });
  } catch (err) {
    console.error("notifyReporterReply: failed to send email:", err);
  }
}
