import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { paddle } from "@/lib/billing/paddle";

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.user.level !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!paddle) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 }
    );
  }

  try {
    const data = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [tenant] = await tx
          .select({
            paddleCustomerId: tenants.paddleCustomerId,
          })
          .from(tenants)
          .where(eq(tenants.id, session.user.tenantId))
          .limit(1);

        const [subscription] = await tx
          .select({
            paddleSubscriptionId: subscriptions.paddleSubscriptionId,
          })
          .from(subscriptions)
          .where(eq(subscriptions.tenantId, session.user.tenantId))
          .limit(1);

        return {
          customerId: tenant?.paddleCustomerId ?? null,
          subscriptionId: subscription?.paddleSubscriptionId ?? null,
        };
      }
    );

    if (!data.subscriptionId) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 404 }
      );
    }

    // Paddle provides a cancel/update URL on subscriptions.
    // Fetch the subscription to get the management URLs.
    const subscription = await paddle.subscriptions.get(data.subscriptionId);

    const url =
      subscription.managementUrls?.updatePaymentMethod ??
      subscription.managementUrls?.cancel ??
      null;

    if (!url) {
      return NextResponse.json(
        { error: "Portal URL not available" },
        { status: 404 }
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to get billing portal URL:", error);
    return NextResponse.json(
      { error: "Failed to get portal URL" },
      { status: 500 }
    );
  }
}
