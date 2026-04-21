import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { adminDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * GET /api/admin/feedback/assignees — returns the list of platform super-admins
 * who can be assigned to feedback tickets.
 *
 * The source of truth is the SUPERADMIN_EMAILS env var (same comma-separated
 * parsing as `@/lib/auth/super-admin`). We map each email to a concrete
 * user row (if one exists) so the UI can render name + avatar.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const emails = (process.env.SUPERADMIN_EMAILS || "ciprian.dobrea@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  if (emails.length === 0) {
    return NextResponse.json([]);
  }

  try {
    // Case-insensitive lookup: compare lowercase of stored email vs input.
    const rows = await adminDb
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(sql`lower(${users.email}) IN ${emails}`);

    // Deduplicate by email: the same super-admin may appear across multiple
    // tenants as distinct user rows — collapse to the first match per email.
    const byEmail = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
      }
    >();
    for (const row of rows) {
      const key = row.email.toLowerCase();
      if (byEmail.has(key)) continue;
      const displayName =
        row.name ||
        `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() ||
        row.email;
      byEmail.set(key, {
        id: row.id,
        name: displayName,
        email: row.email,
        avatarUrl: row.avatarUrl,
      });
    }

    return NextResponse.json(Array.from(byEmail.values()));
  } catch (err) {
    console.error("Failed to list feedback assignees:", err);
    return NextResponse.json(
      { error: "Failed to list assignees" },
      { status: 500 }
    );
  }
}
