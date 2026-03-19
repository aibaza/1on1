import { z } from "zod";
import { uuid } from "./uuid";

/**
 * Schema for standalone action item update (from the dedicated Action Items page).
 * Supports editing title, description, assignee, due date, and toggling status.
 * UI uses two states (Open/Done), mapped to "open"/"completed" in the DB.
 */
export const standaloneUpdateActionItemSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  assigneeId: uuid.optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(["open", "completed"]).optional(),
});

export type StandaloneUpdateActionItemInput = z.infer<
  typeof standaloneUpdateActionItemSchema
>;
