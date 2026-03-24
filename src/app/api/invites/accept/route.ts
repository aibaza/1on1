import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { adminDb } from "@/lib/db";
import { users, inviteTokens } from "@/lib/db/schema";
import { auditLog } from "@/lib/db/schema/audit-log";
import { acceptInviteSchema } from "@/lib/validations/user";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, password, firstName, lastName, jobTitle } = parsed.data;

  // Look up invite token
  const invite = await adminDb.query.inviteTokens.findFirst({
    where: (i, { eq: e }) => e(i.token, token),
  });

  if (!invite) {
    return NextResponse.json(
      { error: "Invalid invitation link" },
      { status: 400 }
    );
  }

  if (invite.acceptedAt) {
    return NextResponse.json(
      { error: "This invitation has already been accepted" },
      { status: 400 }
    );
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This invitation has expired. Please request a new one." },
      { status: 400 }
    );
  }

  // Hash password with cost 12
  const passwordHash = await bcrypt.hash(password, 12);

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  try {
    // Use adminDb transaction (no session context for unauthenticated users)
    const result = await adminDb.transaction(async (tx) => {
      // Set tenant context manually for RLS
      await tx.execute(
        sql`SELECT set_config('app.current_tenant_id', ${invite.tenantId}, true)`
      );

      // Check if user already exists (admin pre-created the account)
      const existingUser = await tx.query.users.findFirst({
        where: (u, { and: a, eq: e }) =>
          a(e(u.tenantId, invite.tenantId), e(u.email, invite.email)),
        columns: { id: true, email: true },
      });

      let newUser: { id: string; email: string };

      if (existingUser) {
        // Update the pre-existing user record
        const [updated] = await tx
          .update(users)
          .set({
            name: `${firstName} ${lastName}`,
            firstName,
            lastName,
            level: invite.level,
            jobTitle: jobTitle || null,
            passwordHash,
            isActive: true,
            emailVerified: new Date(),
            inviteAcceptedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning({ id: users.id, email: users.email });
        newUser = updated;
      } else {
        // Create the new user
        const [inserted] = await tx
          .insert(users)
          .values({
            tenantId: invite.tenantId,
            name: `${firstName} ${lastName}`,
            email: invite.email,
            emailVerified: new Date(),
            firstName,
            lastName,
            level: invite.level,
            jobTitle: jobTitle || null,
            passwordHash,
            isActive: true,
            invitedAt: invite.createdAt,
            inviteAcceptedAt: new Date(),
          })
          .returning({ id: users.id, email: users.email });
        newUser = inserted;
      }

      // Mark invite as accepted
      await tx
        .update(inviteTokens)
        .set({ acceptedAt: new Date() })
        .where(eq(inviteTokens.id, invite.id));

      // Set user context for audit log RLS
      await tx.execute(
        sql`SELECT set_config('app.current_user_id', ${newUser.id}, true)`
      );

      // Log audit event
      await tx.insert(auditLog).values({
        tenantId: invite.tenantId,
        actorId: newUser.id,
        action: "invite_accepted",
        resourceType: "user",
        resourceId: newUser.id,
        metadata: { email: invite.email, level: invite.level },
        ipAddress,
      });

      return newUser;
    });

    return NextResponse.json({
      success: true,
      email: result.email,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Handle duplicate user (race condition)
    if (errMsg.includes("unique") || errMsg.includes("duplicate")) {
      return NextResponse.json(
        { error: "An account with this email already exists in this organization" },
        { status: 409 }
      );
    }

    console.error("Failed to accept invite:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
