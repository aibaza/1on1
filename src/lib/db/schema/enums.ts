import { pgEnum } from "drizzle-orm/pg-core";

export const userLevelEnum = pgEnum("user_level", [
  "admin",
  "manager",
  "member",
]);

export const orgTypeEnum = pgEnum("org_type", ["for_profit", "non_profit"]);

export const planEnum = pgEnum("plan", [
  "free",
  "starter",
  "pro",
  "enterprise",
]);


export const answerTypeEnum = pgEnum("answer_type", [
  "text",
  "rating_1_5",
  "rating_1_10",
  "yes_no",
  "multiple_choice",
  "mood",
  "scale_custom",
]);

export const conditionalOperatorEnum = pgEnum("conditional_operator", [
  "eq",
  "neq",
  "lt",
  "gt",
  "lte",
  "gte",
]);

export const cadenceEnum = pgEnum("cadence", [
  "weekly",
  "biweekly",
  "monthly",
  "custom",
]);

export const preferredDayEnum = pgEnum("preferred_day", [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
]);

export const seriesStatusEnum = pgEnum("series_status", [
  "active",
  "paused",
  "archived",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "missed",
]);

export const actionItemStatusEnum = pgEnum("action_item_status", [
  "open",
  "in_progress",
  "completed",
  "cancelled",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "pre_meeting",
  "agenda_prep",
  "overdue_action",
  "session_summary",
  "missed_meeting",
  "system",
  "session_correction",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "in_app",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
  "cancelled",
]);

export const periodTypeEnum = pgEnum("period_type", [
  "week",
  "month",
  "quarter",
  "year",
]);

export const aiStatusEnum = pgEnum("ai_status", [
  "pending",
  "generating",
  "completed",
  "failed",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing", "active", "past_due", "unpaid", "canceled", "paused",
]);

export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly"]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft", "open", "paid", "past_due", "canceled",
]);

export const calendarProviderEnum = pgEnum("calendar_provider", [
  "google",
  "microsoft",
]);

export const calendarSyncStatusEnum = pgEnum("calendar_sync_status", [
  "synced",
  "pending",
  "error",
]);

export const calendarChangeTypeEnum = pgEnum("calendar_change_type", [
  "reschedule",
  "cancel",
]);

export const calendarChangeStatusEnum = pgEnum("calendar_change_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export const billingEventTypeEnum = pgEnum("billing_event_type", [
  "subscription_created", "subscription_updated", "subscription_canceled",
  "payment_succeeded", "payment_failed",
  "trial_started", "trial_ended", "trial_converted",
  "plan_changed", "refund_issued",
]);
