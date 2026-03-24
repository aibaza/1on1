import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { getAvatarUrl } from "@/lib/avatar";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const seed = randomBytes(8).toString("hex");

  // Fetch the user's level for the role-based background color
  const [user] = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      return tx
        .select({ level: users.level })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
    }
  );

  // Build the full avatar URL so all components pick it up via avatarUrl
  const avatarUrl = getAvatarUrl("", null, seed, user?.level);

  await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      await tx
        .update(users)
        .set({ avatarSeed: seed, avatarUrl, updatedAt: new Date() })
        .where(eq(users.id, session.user.id));
    }
  );

  return NextResponse.json({ seed, avatarUrl });
}
