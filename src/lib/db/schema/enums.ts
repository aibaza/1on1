import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
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

export const teamMemberRoleEnum = pgEnum("team_member_role", [
  "lead",
  "member",
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
