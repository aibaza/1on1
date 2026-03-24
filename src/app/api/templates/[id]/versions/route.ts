import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { templateVersions, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { TemplateVersionSnapshot } from "@/lib/templates/snapshot";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  void request;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const rows = await tx
          .select({
            versionNumber: templateVersions.versionNumber,
            snapshot: templateVersions.snapshot,
            createdAt: templateVersions.createdAt,
            createdByName: users.name,
          })
          .from(templateVersions)
          .innerJoin(users, eq(templateVersions.createdBy, users.id))
          .where(eq(templateVersions.templateId, id))
          .orderBy(desc(templateVersions.versionNumber));

        const versions = rows.map((row) => {
          const snap = row.snapshot as TemplateVersionSnapshot;
          const questionCount = snap.sections.reduce(
            (sum, s) => sum + s.questions.length,
            0
          );
          return {
            versionNumber: row.versionNumber,
            createdAt: row.createdAt.toISOString(),
            createdByName: row.createdByName,
            questionCount,
          };
        });

        return { versions };
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch template versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch template versions" },
      { status: 500 }
    );
  }
}
