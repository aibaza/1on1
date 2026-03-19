import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { templateVersions, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string; versionNumber: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  void request;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, versionNumber } = await params;
  const vNum = parseInt(versionNumber, 10);

  if (isNaN(vNum) || vNum < 1) {
    return NextResponse.json(
      { error: "Invalid version number" },
      { status: 400 }
    );
  }

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [row] = await tx
          .select({
            versionNumber: templateVersions.versionNumber,
            snapshot: templateVersions.snapshot,
            createdAt: templateVersions.createdAt,
            createdByName: users.name,
          })
          .from(templateVersions)
          .innerJoin(users, eq(templateVersions.createdBy, users.id))
          .where(
            and(
              eq(templateVersions.templateId, id),
              eq(templateVersions.versionNumber, vNum)
            )
          );

        if (!row) {
          return { error: "Version not found", status: 404 };
        }

        return {
          data: {
            versionNumber: row.versionNumber,
            createdAt: row.createdAt.toISOString(),
            createdByName: row.createdByName,
            snapshot: row.snapshot,
          },
        };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Failed to fetch template version:", error);
    return NextResponse.json(
      { error: "Failed to fetch template version" },
      { status: 500 }
    );
  }
}
