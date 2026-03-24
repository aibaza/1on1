import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { isNull } from "drizzle-orm";
import { render } from "@react-email/render";
import { auth } from "@/lib/auth/config";
import { requireLevel } from "@/lib/auth/rbac";
import { inviteUsersSchema } from "@/lib/validations/user";
import { withTenantContext } from "@/lib/db/tenant-context";
import { adminDb } from "@/lib/db";
import { inviteTokens } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/audit/log";
import { InviteEmail } from "@/lib/email/templates/invite";
import { getTransport, getEmailFrom } from "@/lib/email/send";
import { createEmailTranslator } from "@/lib/email/translator";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const roleError = requireLevel(session.user.level, "admin");
  if (roleError) return roleError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inviteUsersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { emails, level } = parsed.data;
  const tenantId = session.user.tenantId;
  const inviterId = session.user.id;

  // Get tenant name, content language, and inviter name for the email
  const tenant = await adminDb.query.tenants.findFirst({
    where: (t, { eq: e }) => e(t.id, tenantId),
    columns: { name: true, contentLanguage: true },
  });
  const organizationName = tenant?.name || "your organization";
  const locale = tenant?.contentLanguage ?? "en";
  const t = await createEmailTranslator(locale);

  const inviter = await adminDb.query.users.findFirst({
    where: (u, { eq: e }) => e(u.id, inviterId),
    columns: { firstName: true, lastName: true },
  });
  const inviterName = inviter
    ? `${inviter.firstName} ${inviter.lastName}`
    : "An administrator";

  const baseUrl = getBaseUrl();
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  let sent = 0;
  const skipped: { email: string; reason: string }[] = [];

  for (const email of emails) {
    // Check if user with this email already exists in tenant
    const existingUser = await adminDb.query.users.findFirst({
      where: (u, ops) =>
        ops.and(ops.eq(u.tenantId, tenantId), ops.eq(u.email, email)),
      columns: { id: true },
    });

    if (existingUser) {
      skipped.push({ email, reason: "Already a member" });
      continue;
    }

    // Check if active (non-accepted) invite already exists for this email in tenant
    const existingInvite = await adminDb.query.inviteTokens.findFirst({
      where: (i, ops) =>
        ops.and(
          ops.eq(i.tenantId, tenantId),
          ops.eq(i.email, email),
          isNull(i.acceptedAt)
        ),
      columns: { id: true },
    });

    if (existingInvite) {
      skipped.push({ email, reason: "Already invited" });
      continue;
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      await withTenantContext(tenantId, inviterId, async (tx) => {
        await tx.insert(inviteTokens).values({
          tenantId,
          email,
          level,
          token,
          invitedBy: inviterId,
          expiresAt,
        });

        await logAuditEvent(tx, {
          tenantId,
          actorId: inviterId,
          action: "invite_sent",
          resourceType: "invite_token",
          metadata: { email, level },
          ipAddress: ipAddress ?? undefined,
        });
      });

      // Send email
      const inviteUrl = `${baseUrl}/invite/${token}`;
      const html = await render(
        InviteEmail({
          inviteUrl,
          organizationName,
          inviterName,
          role: level,
          heading: t("emails.invite.heading"),
          body: t("emails.invite.body", { inviterName, organizationName, role: level }),
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

      sent++;
    } catch (error: unknown) {
      // Handle unique constraint violation (race condition)
      const errMsg =
        error instanceof Error ? error.message : String(error);
      if (errMsg.includes("unique") || errMsg.includes("duplicate")) {
        skipped.push({ email, reason: "Already invited" });
      } else {
        skipped.push({ email, reason: "Failed to send" });
        console.error(`Failed to invite ${email}:`, error);
      }
    }
  }

  return NextResponse.json({ sent, skipped });
}
