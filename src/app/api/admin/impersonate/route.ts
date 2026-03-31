import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth/config";
import { adminDb } from "@/lib/db";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logAuditEvent } from "@/lib/audit/log";

const COOKIE_NAME = "1on1_impersonate";
const COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.user.level !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { userId } = body as { userId?: string };
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Validate target: must exist, be in same tenant, be active, and not be an admin
  const targetUser = await adminDb.query.users.findFirst({
    where: (u, { eq, and }) =>
      and(eq(u.id, userId), eq(u.tenantId, session.user.tenantId)),
    columns: { id: true, level: true, isActive: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!targetUser.isActive) {
    return NextResponse.json({ error: "User is not active" }, { status: 400 });
  }
  if (targetUser.level === "admin") {
    return NextResponse.json(
      { error: "Cannot impersonate another admin" },
      { status: 400 }
    );
  }
  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot impersonate yourself" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, userId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  // Audit log: record impersonation start
  await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      await logAuditEvent(tx, {
        tenantId: session.user.tenantId,
        actorId: session.user.id,
        action: "impersonation_started",
        resourceType: "user",
        resourceId: userId,
        metadata: { targetUserId: userId },
      });
    }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const previousTarget = cookieStore.get(COOKIE_NAME)?.value;

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Audit log: record impersonation stop
  // Use the real admin ID (impersonatedBy.id if currently impersonating, otherwise user.id)
  const realAdminId = session.user.impersonatedBy?.id ?? session.user.id;
  await withTenantContext(
    session.user.tenantId,
    realAdminId,
    async (tx) => {
      await logAuditEvent(tx, {
        tenantId: session.user.tenantId,
        actorId: realAdminId,
        action: "impersonation_stopped",
        resourceType: "user",
        resourceId: previousTarget ?? undefined,
        metadata: previousTarget ? { targetUserId: previousTarget } : {},
      });
    }
  );

  return NextResponse.json({ ok: true });
}
