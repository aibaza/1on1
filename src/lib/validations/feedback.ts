import { z } from "zod";

export const FEEDBACK_TYPES = ["bug", "suggestion"] as const;
export const FEEDBACK_STATUSES = [
  "new",
  "triaged",
  "in_progress",
  "awaiting_user",
  "resolved",
  "closed",
] as const;
export const FEEDBACK_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const FEEDBACK_CLOSE_REASONS = ["duplicate", "wont_fix", "invalid"] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number];
export type FeedbackCloseReason = (typeof FEEDBACK_CLOSE_REASONS)[number];

export const viewportSchema = z.object({
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});

export const createFeedbackSchema = z.object({
  type: z.enum(FEEDBACK_TYPES),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  pageUrl: z.string().url().max(2000),
  viewport: viewportSchema,
  userAgent: z.string().min(1).max(500),
  screenshotDataUrl: z
    .string()
    .startsWith("data:image/png")
    .optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

export const createMessageSchema = z.object({
  body: z.string().min(1).max(5000),
  action: z.enum(["reply", "reopen"]).optional().default("reply"),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;

export const createAdminMessageSchema = z.object({
  body: z.string().min(1).max(5000),
  isInternal: z.boolean().optional().default(false),
});

export type CreateAdminMessageInput = z.infer<typeof createAdminMessageSchema>;

export const updateFeedbackAdminSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES).optional(),
  priority: z.enum(FEEDBACK_PRIORITIES).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  closeReason: z.enum(FEEDBACK_CLOSE_REASONS).nullable().optional(),
});

export type UpdateFeedbackAdminInput = z.infer<typeof updateFeedbackAdminSchema>;

export const adminListFiltersSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES).optional(),
  priority: z.enum(FEEDBACK_PRIORITIES).optional(),
  type: z.enum(FEEDBACK_TYPES).optional(),
  tenantId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type AdminListFilters = z.infer<typeof adminListFiltersSchema>;
