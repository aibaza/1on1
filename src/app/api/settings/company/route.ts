import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { orgSettingsSchema } from "@/lib/validations/organization";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.user.level !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const tenant = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [result] = await tx
          .select()
          .from(tenants)
          .where(eq(tenants.id, session.user.tenantId))
          .limit(1);
        return result;
      }
    );

    if (!tenant) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: tenant.name,
      slug: tenant.slug,
      orgType: tenant.orgType,
      settings: tenant.settings,
    });
  } catch (error) {
    console.error("Failed to fetch organization settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.user.level !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = orgSettingsSchema.parse(body);

    const updated = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Build update payload: settings always updated, name only if provided
        // Preserve existing settings and merge new values
        const [existing] = await tx
          .select({ settings: tenants.settings })
          .from(tenants)
          .where(eq(tenants.id, session.user.tenantId))
          .limit(1);
        const existingSettings = (existing?.settings ?? {}) as Record<string, unknown>;

        const updatePayload: Record<string, unknown> = {
          settings: {
            ...existingSettings,
            timezone: data.timezone,
            defaultCadence: data.defaultCadence,
            defaultDurationMinutes: data.defaultDurationMinutes,
            preferredLanguage: data.preferredLanguage ?? "en",
            colorTheme: data.colorTheme ?? existingSettings.colorTheme ?? "neutral",
            companyContext: data.companyContext ?? existingSettings.companyContext ?? "",
          },
          updatedAt: new Date(),
        };

        if (data.name) {
          updatePayload.name = data.name;
        }

        const [result] = await tx
          .update(tenants)
          .set(updatePayload)
          .where(eq(tenants.id, session.user.tenantId))
          .returning();
        return result;
      }
    );

    return NextResponse.json({
      name: updated.name,
      slug: updated.slug,
      orgType: updated.orgType,
      settings: updated.settings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to update organization settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
