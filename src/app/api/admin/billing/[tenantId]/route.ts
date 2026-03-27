import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { adminDb } from "@/lib/db";
import { tenants } from "@/lib/db/schema/tenants";
import { subscriptions, invoices, billingEvents } from "@/lib/db/schema/billing";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const patchSchema = z.object({
  isFounder: z.boolean().optional(),
  founderDiscountPct: z.number().int().min(0).max(100).optional(),
  plan: z.enum(["free", "starter", "pro", "enterprise"]).optional(),
});

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [tenant] = await adminDb
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const [subscription] = await adminDb
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tenantId))
    .limit(1);

  const tenantInvoices = await adminDb
    .select()
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId))
    .orderBy(desc(invoices.createdAt));

  const tenantEvents = await adminDb
    .select()
    .from(billingEvents)
    .where(eq(billingEvents.tenantId, tenantId))
    .orderBy(desc(billingEvents.createdAt));

  return NextResponse.json({
    tenant,
    subscription: subscription ?? null,
    invoices: tenantInvoices,
    events: tenantEvents,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { isFounder, founderDiscountPct, plan } = parsed.data;

  // Verify tenant exists
  const [tenant] = await adminDb
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (isFounder !== undefined) updates.isFounder = isFounder;
  if (founderDiscountPct !== undefined)
    updates.founderDiscountPct = founderDiscountPct;
  if (plan !== undefined) updates.plan = plan;

  if (Object.keys(updates).length > 0) {
    await adminDb
      .update(tenants)
      .set(updates)
      .where(eq(tenants.id, tenantId));
  }

  // Return updated tenant
  const [updated] = await adminDb
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  return NextResponse.json({ tenant: updated });
}
