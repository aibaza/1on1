"use server";

import { createTransport } from "nodemailer";
import { render } from "@react-email/render";
import { randomBytes } from "crypto";
import { adminDb } from "@/lib/db";
import {
  emailVerificationTokens,
  passwordResetTokens,
} from "@/lib/db/schema/auth";
import { VerificationEmail } from "./templates/verification";
import { PasswordResetEmail } from "./templates/password-reset";

// Lazy-initialize SMTP transport
let _transport: ReturnType<typeof createTransport> | null = null;
function getTransport() {
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

function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "1on1 <noreply@example.com>";
}

export async function sendVerificationEmail(
  email: string,
  userId: string,
  baseUrl?: string
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await adminDb.insert(emailVerificationTokens).values({
    userId,
    token,
    expiresAt,
  });

  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;
  const html = await render(VerificationEmail({ verifyUrl }));

  await getTransport().sendMail({
    from: getEmailFrom(),
    to: email,
    subject: "Verify your email address",
    html,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  userId: string,
  baseUrl?: string
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await adminDb.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  });

  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const html = await render(PasswordResetEmail({ resetUrl }));

  await getTransport().sendMail({
    from: getEmailFrom(),
    to: email,
    subject: "Reset your password",
    html,
  });
}
