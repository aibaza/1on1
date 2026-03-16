import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { eq, isNull } from "drizzle-orm";
import { render } from "@react-email/render";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { requireRole } from "@/lib/auth/rbac";
import { withTenantContext } from "@/lib/db/tenant-context";
import { adminDb } from "@/lib/db";
import { inviteTokens, users } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/audit/log";
import { InviteEmail } from "@/lib/email/templates/invite";
import { getTransport, getEmailFrom } from "@/lib/email/send";
import { createEmailTranslator } from "@/lib/email/translator";

const resendSchema = z.object({
  email: z.string().email(),
});

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const roleError = requireRole(session.user.role, "admin");
  if (roleError) return roleError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }

  const { email } = parsed.data;
  const tenantId = session.user.tenantId;
  const actorId = session.user.id;

  // Look up existing non-accepted invite for this email in tenant
  const existingInvite = await adminDb.query.inviteTokens.findFirst({
    where: (i, ops) =>
      ops.and(
        ops.eq(i.tenantId, tenantId),
        ops.eq(i.email, email),
        isNull(i.acceptedAt)
      ),
  });

  // If no invite token exists, check if this is a seeded/imported unverified user
  // and create their first invite token on the fly
  let inviteId: string;
  let inviteRole: string;

  if (!existingInvite) {
    const unverifiedUser = await adminDb.query.users.findFirst({
      where: (u, ops) =>
        ops.and(
          ops.eq(u.tenantId, tenantId),
          ops.eq(u.email, email),
          isNull(u.emailVerified)
        ),
      columns: { id: true, role: true },
    });

    if (!unverifiedUser) {
      return NextResponse.json(
        { error: "No pending invite found for this email" },
        { status: 400 }
      );
    }

    inviteRole = unverifiedUser.role;
  } else {
    inviteRole = existingInvite.role;
  }

  // Generate new token and expiry
  const newToken = randomBytes(32).toString("hex");
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  try {
    await withTenantContext(tenantId, actorId, async (tx) => {
      if (existingInvite) {
        await tx
          .update(inviteTokens)
          .set({ token: newToken, expiresAt: newExpiresAt })
          .where(eq(inviteTokens.id, existingInvite.id));
        inviteId = existingInvite.id;
      } else {
        const [inserted] = await tx
          .insert(inviteTokens)
          .values({
            tenantId,
            email,
            role: inviteRole as "admin" | "manager" | "member",
            token: newToken,
            invitedBy: actorId,
            expiresAt: newExpiresAt,
          })
          .returning({ id: inviteTokens.id });
        inviteId = inserted.id;
      }

      await logAuditEvent(tx, {
        tenantId,
        actorId,
        action: "invite_resent",
        resourceType: "invite_token",
        resourceId: inviteId,
        metadata: { email, role: inviteRole },
        ipAddress: ipAddress ?? undefined,
      });
    });

    // Get tenant and inviter info for email
    const tenant = await adminDb.query.tenants.findFirst({
      where: (t, { eq: e }) => e(t.id, tenantId),
      columns: { name: true, contentLanguage: true },
    });
    const organizationName = tenant?.name || "your organization";
    const locale = tenant?.contentLanguage ?? "en";
    const t = await createEmailTranslator(locale);

    const inviter = await adminDb.query.users.findFirst({
      where: (u, { eq: e }) => e(u.id, actorId),
      columns: { firstName: true, lastName: true },
    });
    const inviterName = inviter
      ? `${inviter.firstName} ${inviter.lastName}`
      : "An administrator";

    const baseUrl = getBaseUrl();
    const inviteUrl = `${baseUrl}/invite/${newToken}`;
    const role = inviteRole;
    const html = await render(
      InviteEmail({
        inviteUrl,
        organizationName,
        inviterName,
        role,
        heading: t("emails.invite.heading"),
        body: t("emails.invite.body", { inviterName, organizationName, role }),
        buttonLabel: t("emails.invite.button"),
        footer: t("emails.invite.footer"),
      })
    );

    await getTransport().sendMail({
      from: getEmailFrom(),
      to: email,
      subject: t("emails.invite.subject", { organizationName }),
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to resend invite:", error);
    return NextResponse.json(
      { error: "Failed to resend invite. Please try again." },
      { status: 500 }
    );
  }
}
