import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const seed = randomBytes(8).toString("hex");

  await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      await tx
        .update(users)
        .set({ avatarSeed: seed, updatedAt: new Date() })
        .where(eq(users.id, session.user.id));
    }
  );

  return NextResponse.json({ seed });
}
