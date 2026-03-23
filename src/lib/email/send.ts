import { createTransport } from "nodemailer";
import { render } from "@react-email/render";
import { randomBytes } from "crypto";
import { appendFile, mkdir } from "fs/promises";
import { join } from "path";
import { eq } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import {
  emailVerificationTokens,
  passwordResetTokens,
} from "@/lib/db/schema/auth";
import { users } from "@/lib/db/schema";
import { VerificationEmail } from "./templates/verification";
import { PasswordResetEmail } from "./templates/password-reset";
import { createEmailTranslator } from "./translator";

// Lazy-initialize SMTP transport
let _transport: ReturnType<typeof createTransport> | null = null;
export function getTransport() {
  if (!_transport) {
    _transport = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "ssl",
      // Only include auth when credentials are provided (omit for unauthenticated servers like MailHog)
      ...(process.env.SMTP_USERNAME
        ? { auth: { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD } }
        : {}),
    });
  }
  return _transport;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "1on1 <noreply@example.com>";
}

/**
 * Send an email via SMTP, or log it to disk if the recipient is a test address.
 * Addresses ending in `.example.com` are silently skipped — the full email is
 * written to `logs/email-dev.log` so it can be inspected during testing.
 */
// BCC address for dev/preview environments — receives a copy of every email
const DEV_BCC = process.env.VERCEL_ENV === "production" ? undefined : "ciprian.dobrea@gmail.com";

export async function sendEmail(opts: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  if (opts.to.endsWith(".example.com")) {
    // Log to disk AND forward via BCC so dev emails are still visible
    const logDir = join(process.cwd(), "logs");
    await mkdir(logDir, { recursive: true });
    const entry =
      JSON.stringify({
        timestamp: new Date().toISOString(),
        to: opts.to,
        subject: opts.subject,
      }) + "\n";
    await appendFile(join(logDir, "email-dev.log"), entry);

    // Send BCC copy to dev address
    if (DEV_BCC) {
      await getTransport().sendMail({
        ...opts,
        to: DEV_BCC,
        subject: `[${opts.to}] ${opts.subject}`,
      });
    }
    return;
  }
  await getTransport().sendMail({
    ...opts,
    ...(DEV_BCC ? { bcc: DEV_BCC } : {}),
  });
}

export async function sendVerificationEmail(
  email: string,
  userId: string,
  baseUrl?: string
) {
  const userRow = await adminDb.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { language: true },
  });
  const locale = userRow?.language ?? "en";
  const t = await createEmailTranslator(locale);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await adminDb.insert(emailVerificationTokens).values({
    userId,
    token,
    expiresAt,
  });

  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;
  const html = await render(
    VerificationEmail({
      verifyUrl,
      heading: t("emails.verification.heading"),
      body: t("emails.verification.body"),
      buttonLabel: t("emails.verification.button"),
      footer: t("emails.verification.footer"),
    })
  );

  await sendEmail({
    from: getEmailFrom(),
    to: email,
    subject: t("emails.verification.subject"),
    html,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  userId: string,
  baseUrl?: string
) {
  const userRow = await adminDb.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { language: true },
  });
  const locale = userRow?.language ?? "en";
  const t = await createEmailTranslator(locale);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await adminDb.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  });

  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const html = await render(
    PasswordResetEmail({
      resetUrl,
      heading: t("emails.passwordReset.heading"),
      body: t("emails.passwordReset.body"),
      buttonLabel: t("emails.passwordReset.button"),
      footer: t("emails.passwordReset.footer"),
    })
  );

  await sendEmail({
    from: getEmailFrom(),
    to: email,
    subject: t("emails.passwordReset.subject"),
    html,
  });
}
