"use server";

import { Resend } from "resend";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import {
  emailVerificationTokens,
  passwordResetTokens,
} from "@/lib/db/schema/auth";
import { VerificationEmail } from "./templates/verification";
import { PasswordResetEmail } from "./templates/password-reset";

// Lazy-initialize Resend client to avoid build-time errors when API key is not set
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "1on1 <onboarding@resend.dev>";
}

export async function sendVerificationEmail(
  email: string,
  userId: string
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(emailVerificationTokens).values({
    userId,
    token,
    expiresAt,
  });

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

  await getResend().emails.send({
    from: getEmailFrom(),
    to: email,
    subject: "Verify your email address",
    react: VerificationEmail({ verifyUrl }),
  });
}

export async function sendPasswordResetEmail(
  email: string,
  userId: string
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: getEmailFrom(),
    to: email,
    subject: "Reset your password",
    react: PasswordResetEmail({ resetUrl }),
  });
}
