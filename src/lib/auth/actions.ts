"use server";

import { adminDb } from "@/lib/db";
import {
  tenants,
  users,
  emailVerificationTokens,
  passwordResetTokens,
} from "@/lib/db/schema";
import { signIn, signOut } from "@/lib/auth/config";
import bcrypt from "bcryptjs";
import { eq, and, lt } from "drizzle-orm";
import {
  registerSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email/send";
import { randomBytes } from "crypto";
import { headers } from "next/headers";

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const forwardedProto = h.get("x-forwarded-proto");
  const forwardedHost = h.get("x-forwarded-host") || h.get("host");
  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return `${proto}://${forwardedHost}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function loginAction(formData: FormData) {
  try {
    const data = signInSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: "/overview",
    });
  } catch (error: unknown) {
    // Auth.js signIn throws a redirect on success — re-throw it
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { error: "Invalid email or password" };
  }
}

export async function registerAction(formData: FormData) {
  try {
    const data = registerSchema.parse({
      companyName: formData.get("companyName"),
      orgType: formData.get("orgType") || "for_profit",
      email: formData.get("email"),
      password: formData.get("password"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
    });

    // Check if email already exists (any tenant)
    const existingUser = await adminDb.query.users.findFirst({
      where: (u, { eq: e }) => e(u.email, data.email),
    });

    if (existingUser) {
      return { error: "An account with this email already exists" };
    }

    // Generate slug from company name
    let slug = data.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check slug uniqueness
    const existingTenant = await adminDb.query.tenants.findFirst({
      where: (t, { eq: e }) => e(t.slug, slug),
    });

    if (existingTenant) {
      slug = `${slug}-${randomBytes(2).toString("hex")}`;
    }

    // Hash password with cost factor 12
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create tenant + admin user in single transaction
    const result = await adminDb.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({
          name: data.companyName,
          slug,
          orgType: data.orgType,
          settings: {
            timezone: "UTC",
            defaultCadence: "biweekly",
            defaultDurationMinutes: 30,
          },
        })
        .returning();

      const [user] = await tx
        .insert(users)
        .values({
          tenantId: tenant.id,
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: "admin",
          passwordHash,
        })
        .returning();

      return { tenant, user };
    });

    // Send verification email (non-blocking -- don't fail registration if email fails)
    try {
      const baseUrl = await getBaseUrl();
      await sendVerificationEmail(result.user.email, result.user.id, baseUrl);
    } catch {
      // Email send failure is non-critical during registration
      console.error("Failed to send verification email");
    }

    // Sign in immediately and redirect to overview
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: "/overview",
    });
  } catch (error: unknown) {
    // Auth.js signIn throws a redirect on success — re-throw it
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Registration error:", error);
    return { error: "Registration failed. Please try again." };
  }
}

export async function verifyEmailAction(token: string) {
  try {
    // Look up token
    const [tokenRecord] = await adminDb
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token))
      .limit(1);

    if (!tokenRecord) {
      return { error: "Invalid verification link" };
    }

    // Check if expired
    if (tokenRecord.expiresAt < new Date()) {
      // Clean up expired token
      await adminDb
        .delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.id, tokenRecord.id));
      return { error: "Verification link has expired. Please request a new one." };
    }

    // Mark user email as verified
    await adminDb
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, tokenRecord.userId));

    // Delete the used token
    await adminDb
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.id, tokenRecord.id));

    return { success: true };
  } catch (error) {
    console.error("Email verification error:", error);
    return { error: "Verification failed. Please try again." };
  }
}

export async function forgotPasswordAction(formData: FormData) {
  try {
    const data = forgotPasswordSchema.parse({
      email: formData.get("email"),
    });

    // Look up user by email -- always return success (prevent email enumeration)
    const user = await adminDb.query.users.findFirst({
      where: (u, { eq: e }) => e(u.email, data.email),
    });

    if (user) {
      try {
        const baseUrl = await getBaseUrl();
        await sendPasswordResetEmail(user.email, user.id, baseUrl);
      } catch {
        console.error("Failed to send password reset email");
      }
    }

    // Always return success regardless of whether email exists
    return {
      success: true,
      message: "If an account with that email exists, we sent a password reset link.",
    };
  } catch {
    return { error: "Please enter a valid email address." };
  }
}

export async function resetPasswordAction(formData: FormData) {
  try {
    const data = resetPasswordSchema.parse({
      token: formData.get("token"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    // Look up token
    const [tokenRecord] = await adminDb
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, data.token))
      .limit(1);

    if (!tokenRecord) {
      return { error: "Invalid reset link" };
    }

    // Check if expired
    if (tokenRecord.expiresAt < new Date()) {
      await adminDb
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.id, tokenRecord.id));
      return { error: "Reset link has expired. Please request a new one." };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Update user's password
    await adminDb
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, tokenRecord.userId));

    // Delete ALL password reset tokens for this user
    await adminDb
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, tokenRecord.userId));

    return { success: true };
  } catch {
    return { error: "Password reset failed. Please try again." };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/overview" });
}

export async function signInWithMicrosoft() {
  await signIn("microsoft-entra-id", { redirectTo: "/overview" });
}
