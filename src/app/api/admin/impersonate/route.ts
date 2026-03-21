import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth/config";
import { adminDb } from "@/lib/db";

const COOKIE_NAME = "1on1_impersonate";
const COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
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
    columns: { id: true, role: true, isActive: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!targetUser.isActive) {
    return NextResponse.json({ error: "User is not active" }, { status: 400 });
  }
  if (targetUser.role === "admin") {
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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);

  return NextResponse.json({ ok: true });
}
