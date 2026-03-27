import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { tenants, plans } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const checkoutSchema = z.object({
  priceId: z.string().min(1),
  quantity: z.number().int().min(1).max(1000).default(1),
});

/**
 * POST /api/billing/checkout
 *
 * Validates the requested price ID and returns the configuration
 * needed for the client-side Paddle.js checkout.
 * The actual checkout is opened client-side via Paddle.js overlay.
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.user.level !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { priceId, quantity } = parsed.data;

    // Verify the price ID belongs to one of our active plans
    const plan = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [tenant] = await tx
          .select({ billingEmail: tenants.billingEmail })
          .from(tenants)
          .where(eq(tenants.id, session.user.tenantId))
          .limit(1);

        const [matchedPlan] = await tx
          .select()
          .from(plans)
          .where(
            and(
              eq(plans.isActive, true),
            )
          );

        // Check across all active plans for matching price ID
        const allPlans = await tx
          .select()
          .from(plans)
          .where(eq(plans.isActive, true));

        const validPlan = allPlans.find(
          (p) =>
            p.paddlePriceIdMonthly === priceId ||
            p.paddlePriceIdYearly === priceId
        );

        return {
          plan: validPlan ?? null,
          billingEmail: tenant?.billingEmail ?? session.user.email ?? "",
        };
      }
    );

    if (!plan.plan) {
      return NextResponse.json(
        { error: "Invalid price ID" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      priceId,
      quantity,
      planSlug: plan.plan.slug,
      planName: plan.plan.name,
      customerEmail: plan.billingEmail,
    });
  } catch (error) {
    console.error("Checkout validation failed:", error);
    return NextResponse.json(
      { error: "Failed to validate checkout" },
      { status: 500 }
    );
  }
}
