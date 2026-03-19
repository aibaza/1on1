import { eq } from "drizzle-orm";
import { render } from "@react-email/render";
import { adminDb } from "@/lib/db";
import { meetingSeries } from "@/lib/db/schema/series";
import { users } from "@/lib/db/schema/users";
import { tenants } from "@/lib/db/schema/tenants";
import { sendEmail, getEmailFrom } from "@/lib/email/send";
import { PreMeetingReminderEmail } from "@/lib/email/templates/pre-meeting-reminder";
import { AgendaPrepEmail } from "@/lib/email/templates/agenda-prep";
import { createEmailTranslator } from "@/lib/email/translator";

interface ClaimedNotification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Process a single claimed notification -- look up context, render template, send email.
 */
export async function processNotification(
  notification: ClaimedNotification
): Promise<void> {
  switch (notification.type) {
    case "pre_meeting":
      await processPreMeeting(notification);
      break;
    case "agenda_prep":
      await processAgendaPrep(notification);
      break;
    case "session_summary":
      // Session summary emails are event-driven (sent after AI pipeline completes).
      // They should not be processed by the cron scheduler.
      console.warn(
        `[notifications] session_summary notification ${notification.id} should be event-driven, not cron-scheduled`
      );
      break;
    default:
      console.warn(
        `[notifications] Unhandled notification type: ${notification.type}`
      );
  }
}

async function processPreMeeting(
  notification: ClaimedNotification
): Promise<void> {
  if (!notification.reference_id) {
    throw new Error("Pre-meeting notification missing referenceId");
  }

  const series = await adminDb.query.meetingSeries.findFirst({
    where: eq(meetingSeries.id, notification.reference_id),
  });
  if (!series) {
    throw new Error(`Series ${notification.reference_id} not found`);
  }

  // Resolve tenant content language for email translation
  const [tenantRow] = await adminDb
    .select({ contentLanguage: tenants.contentLanguage })
    .from(tenants)
    .where(eq(tenants.id, notification.tenant_id))
    .limit(1);
  const locale = tenantRow?.contentLanguage ?? "en";
  const t = await createEmailTranslator(locale);

  const [recipient, manager, report] = await Promise.all([
    adminDb.query.users.findFirst({
      where: eq(users.id, notification.user_id),
      columns: { email: true, firstName: true, lastName: true },
    }),
    adminDb.query.users.findFirst({
      where: eq(users.id, series.managerId),
      columns: { firstName: true, lastName: true },
    }),
    adminDb.query.users.findFirst({
      where: eq(users.id, series.reportId),
      columns: { firstName: true, lastName: true },
    }),
  ]);

  if (!recipient || !manager || !report) {
    throw new Error("Could not resolve users for pre-meeting notification");
  }

  const isManager = notification.user_id === series.managerId;
  const otherParty = isManager ? report : manager;
  const recipientName = `${recipient.firstName}`;
  const otherPartyName = `${otherParty.firstName} ${otherParty.lastName}`;

  const meetingDate = series.nextSessionAt
    ? series.nextSessionAt.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "your next session";
  const meetingTime = series.nextSessionAt
    ? series.nextSessionAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const baseUrl = getBaseUrl();
  const seriesUrl = `${baseUrl}/sessions/${series.id}`;

  const html = await render(
    PreMeetingReminderEmail({
      recipientName,
      otherPartyName,
      meetingDate,
      meetingTime,
      seriesUrl,
      heading: t("emails.preMeeting.heading"),
      greeting: t("emails.preMeeting.greeting", { recipientName }),
      body: t("emails.preMeeting.body", { otherPartyName, meetingDate, meetingTime }),
      buttonLabel: t("emails.preMeeting.button"),
      footer: t("emails.preMeeting.footer"),
    })
  );

  await sendEmail({
    from: getEmailFrom(),
    to: recipient.email,
    subject: t("emails.preMeeting.subject", { otherPartyName }),
    html,
  });
}

async function processAgendaPrep(
  notification: ClaimedNotification
): Promise<void> {
  if (!notification.reference_id) {
    throw new Error("Agenda prep notification missing referenceId");
  }

  const series = await adminDb.query.meetingSeries.findFirst({
    where: eq(meetingSeries.id, notification.reference_id),
  });
  if (!series) {
    throw new Error(`Series ${notification.reference_id} not found`);
  }

  // Resolve tenant content language for email translation
  const [tenantRow] = await adminDb
    .select({ contentLanguage: tenants.contentLanguage })
    .from(tenants)
    .where(eq(tenants.id, notification.tenant_id))
    .limit(1);
  const locale = tenantRow?.contentLanguage ?? "en";
  const t = await createEmailTranslator(locale);

  const [recipient, manager, report] = await Promise.all([
    adminDb.query.users.findFirst({
      where: eq(users.id, notification.user_id),
      columns: { email: true, firstName: true, lastName: true },
    }),
    adminDb.query.users.findFirst({
      where: eq(users.id, series.managerId),
      columns: { firstName: true, lastName: true },
    }),
    adminDb.query.users.findFirst({
      where: eq(users.id, series.reportId),
      columns: { firstName: true, lastName: true },
    }),
  ]);

  if (!recipient || !manager || !report) {
    throw new Error("Could not resolve users for agenda prep notification");
  }

  const isManager = notification.user_id === series.managerId;
  const variant = isManager ? "manager" : "report";
  const otherParty = isManager ? report : manager;
  const recipientName = `${recipient.firstName}`;
  const otherPartyName = `${otherParty.firstName} ${otherParty.lastName}`;

  const meetingDate = series.nextSessionAt
    ? series.nextSessionAt.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "your next session";

  const baseUrl = getBaseUrl();
  const seriesUrl = `${baseUrl}/sessions/${series.id}`;

  const body = isManager
    ? t("emails.agendaPrep.bodyManager", { otherPartyName, meetingDate })
    : t("emails.agendaPrep.bodyReport", { otherPartyName, meetingDate });
  const buttonLabel = isManager
    ? t("emails.agendaPrep.buttonManager")
    : t("emails.agendaPrep.buttonReport");

  const html = await render(
    AgendaPrepEmail({
      variant,
      recipientName,
      otherPartyName,
      meetingDate,
      seriesUrl,
      heading: t("emails.agendaPrep.heading"),
      greeting: t("emails.agendaPrep.greeting", { recipientName }),
      body,
      buttonLabel,
      footer: t("emails.agendaPrep.footer"),
    })
  );

  await sendEmail({
    from: getEmailFrom(),
    to: recipient.email,
    subject: t("emails.agendaPrep.subject", { otherPartyName }),
    html,
  });
}
