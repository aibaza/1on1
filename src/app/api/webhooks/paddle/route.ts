import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { EventName } from "@paddle/paddle-node-sdk";
import { paddle } from "@/lib/billing/paddle";
import { adminDb } from "@/lib/db";
import { billingEvents, subscriptions, tenants } from "@/lib/db/schema";
import { syncSubscription, syncTransaction } from "@/lib/billing/sync";

export const dynamic = "force-dynamic";

/**
 * Paddle webhook handler.
 *
 * No authentication middleware — Paddle calls this externally.
 * Signature verification ensures authenticity.
 * All events are processed idempotently (duplicate event IDs are skipped).
 */
export async function POST(request: Request) {
  if (!paddle) {
    console.error("[webhook/paddle] Paddle SDK not initialized (missing API key)");
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 }
    );
  }

  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook/paddle] PADDLE_WEBHOOK_SECRET not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 }
    );
  }

  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature") ?? "";

  // Verify webhook signature and unmarshal the event
  let event;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature);
  } catch (err) {
    console.error("[webhook/paddle] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!event) {
    return NextResponse.json({ error: "Could not parse event" }, { status: 400 });
  }

  const paddleEventId = event.eventId;
  const eventType = event.eventType;

  // Idempotency check: skip if this event was already processed
  if (paddleEventId) {
    const [existing] = await adminDb
      .select({ id: billingEvents.id })
      .from(billingEvents)
      .where(eq(billingEvents.paddleEventId, paddleEventId))
      .limit(1);

    if (existing) {
      return NextResponse.json({ status: "already_processed" });
    }
  }

  // Cast data to a generic record — the sync functions handle mapping internally
  const data = event.data as unknown as Record<string, unknown>;

  // Process the business-critical sync operation first.
  // If sync fails, return 500 so Paddle retries.
  // Event recording is best-effort — a failure there should not block the sync.
  type BillingEventType =
    | "subscription_created"
    | "subscription_updated"
    | "subscription_canceled"
    | "payment_succeeded"
    | "payment_failed";

  let billingEventInfo: {
    customerId: string | null;
    subscriptionId: string | null;
    eventType: BillingEventType;
  } | null = null;

  try {
    switch (eventType) {
      case EventName.SubscriptionCreated: {
        await syncSubscription(data, adminDb);
        billingEventInfo = {
          customerId: data.customerId as string,
          subscriptionId: data.id as string,
          eventType: "subscription_created",
        };
        break;
      }

      case EventName.SubscriptionUpdated: {
        await syncSubscription(data, adminDb);
        billingEventInfo = {
          customerId: data.customerId as string,
          subscriptionId: data.id as string,
          eventType: "subscription_updated",
        };
        break;
      }

      case EventName.SubscriptionCanceled: {
        await syncSubscription(data, adminDb);
        billingEventInfo = {
          customerId: data.customerId as string,
          subscriptionId: data.id as string,
          eventType: "subscription_canceled",
        };
        break;
      }

      case EventName.TransactionCompleted: {
        await syncTransaction(data, "paid", adminDb);
        billingEventInfo = {
          customerId: (data.customerId as string) ?? null,
          subscriptionId: (data.subscriptionId as string) ?? null,
          eventType: "payment_succeeded",
        };
        break;
      }

      case EventName.TransactionPaymentFailed: {
        await syncTransaction(data, "past_due", adminDb);
        billingEventInfo = {
          customerId: (data.customerId as string) ?? null,
          subscriptionId: (data.subscriptionId as string) ?? null,
          eventType: "payment_failed",
        };
        break;
      }

      default:
        console.log(`[webhook/paddle] Unhandled event type: ${eventType}`);
        return NextResponse.json({ status: "ignored" });
    }
  } catch (err) {
    console.error(`[webhook/paddle] Error processing ${eventType}:`, err);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }

  // Best-effort event recording — don't fail the webhook if this errors
  if (billingEventInfo) {
    try {
      await recordBillingEvent(
        billingEventInfo.customerId,
        billingEventInfo.subscriptionId,
        billingEventInfo.eventType,
        paddleEventId,
        data
      );
    } catch (err) {
      console.error(
        `[webhook/paddle] Failed to record billing event for ${eventType}:`,
        err
      );
    }
  }

  return NextResponse.json({ status: "processed" });
}

/**
 * Record a billing event for idempotency tracking and audit.
 */
async function recordBillingEvent(
  paddleCustomerId: string | null,
  paddleSubscriptionId: string | null,
  eventType:
    | "subscription_created"
    | "subscription_updated"
    | "subscription_canceled"
    | "payment_succeeded"
    | "payment_failed",
  paddleEventId: string | undefined,
  metadata: unknown
) {
  // Resolve tenant from Paddle customer ID
  let tenantId: string | null = null;
  if (paddleCustomerId) {
    const [tenant] = await adminDb
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.paddleCustomerId, paddleCustomerId))
      .limit(1);
    tenantId = tenant?.id ?? null;
  }

  // Resolve local subscription ID
  let localSubId: string | null = null;
  if (paddleSubscriptionId) {
    const [sub] = await adminDb
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.paddleSubscriptionId, paddleSubscriptionId))
      .limit(1);
    localSubId = sub?.id ?? null;
  }

  if (!tenantId) {
    console.warn(
      `[webhook/paddle] Could not resolve tenant for customer ${paddleCustomerId}, skipping event record`
    );
    return;
  }

  await adminDb.insert(billingEvents).values({
    tenantId,
    subscriptionId: localSubId,
    eventType,
    paddleEventId: paddleEventId ?? null,
    metadata: metadata as Record<string, unknown>,
  });
}
