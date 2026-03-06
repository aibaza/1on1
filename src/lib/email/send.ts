import { createTransport } from "nodemailer";
import { render } from "@react-email/render";
import { randomBytes } from "crypto";
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
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return _transport;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "1on1 <noreply@example.com>";
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

  await getTransport().sendMail({
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

  await getTransport().sendMail({
    from: getEmailFrom(),
    to: email,
    subject: t("emails.passwordReset.subject"),
    html,
  });
}
