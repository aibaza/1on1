import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { adminDb } from "@/lib/db";
import { tenants } from "@/lib/db/schema/tenants";
import { subscriptions } from "@/lib/db/schema/billing";
import { computeMRR } from "@/lib/billing/metrics";

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

  const mrr = computeMRR(allSubscriptions);
  const activeCount = allSubscriptions.filter((s) => s.status === "active").length;
  const trialingCount = allSubscriptions.filter((s) => s.status === "trialing").length;
  const pastDueCount = allSubscriptions.filter((s) => s.status === "past_due").length;
  const canceledCount = allSubscriptions.filter((s) => s.status === "canceled").length;
  const founderCount = allTenants.filter((t) => t.isFounder).length;
  const totalCustomers = allTenants.length;

  return NextResponse.json({
    mrrCents: mrr,
    arrCents: mrr * 12,
    activeCount,
    trialingCount,
    pastDueCount,
    canceledCount,
    founderCount,
    totalCustomers,
  });
}
