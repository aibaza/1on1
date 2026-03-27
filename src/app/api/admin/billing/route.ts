import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { adminDb } from "@/lib/db";
import { tenants } from "@/lib/db/schema/tenants";
import { subscriptions } from "@/lib/db/schema/billing";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allTenants = await adminDb.select().from(tenants);
  const allSubscriptions = await adminDb.select().from(subscriptions);

  const subsByTenant = new Map(
    allSubscriptions.map((s) => [s.tenantId, s])
  );

  const customers = allTenants.map((tenant) => {
    const sub = subsByTenant.get(tenant.id);
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      isFounder: tenant.isFounder,
      founderDiscountPct: tenant.founderDiscountPct,
      createdAt: tenant.createdAt.toISOString(),
      subscriptionStatus: sub?.status ?? null,
      mrrCents: sub?.mrrCents ?? 0,
      seats: sub?.seats ?? 0,
      billingCycle: sub?.billingCycle ?? null,
    };
  });

  return NextResponse.json({ customers });
}
