import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Only admins and managers can edit job title
  if (session.user.level !== "admin" && session.user.level !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { jobTitle } = body;

  if (jobTitle !== null && typeof jobTitle !== "string") {
    return NextResponse.json({ error: "Invalid job title" }, { status: 400 });
  }

  const trimmed = typeof jobTitle === "string" ? jobTitle.trim().slice(0, 200) : null;

  await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      await tx
        .update(users)
        .set({ jobTitle: trimmed, updatedAt: new Date() })
        .where(eq(users.id, session.user.id));
    }
  );

  return NextResponse.json({ ok: true });
}
