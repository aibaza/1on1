import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { labelSchema } from "@/lib/validations/template";
import { templateLabels } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        return tx
          .select({
            id: templateLabels.id,
            name: templateLabels.name,
            color: templateLabels.color,
            createdAt: templateLabels.createdAt,
          })
          .from(templateLabels)
          .where(eq(templateLabels.tenantId, session.user.tenantId));
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch labels:", error);
    return NextResponse.json(
      { error: "Failed to fetch labels" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = labelSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [label] = await tx
          .insert(templateLabels)
          .values({
            tenantId: session.user.tenantId,
            name: data.name,
            color: data.color ?? null,
          })
          .returning();

        return label;
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("unique")) {
      return NextResponse.json(
        { error: "A label with this name already exists" },
        { status: 409 }
      );
    }
    console.error("Failed to create label:", error);
    return NextResponse.json(
      { error: "Failed to create label" },
      { status: 500 }
    );
  }
}
