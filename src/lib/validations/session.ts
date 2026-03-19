import { z } from "zod";
import { uuid } from "./uuid";

/**
 * Schema for upserting a single answer during auto-save.
 */
export const answerUpsertSchema = z.object({
  questionId: uuid,
  answerText: z.string().optional(),
  answerNumeric: z.number().optional(),
  answerJson: z.any().optional(),
  skipped: z.boolean().optional(),
});

export type AnswerUpsertInput = z.infer<typeof answerUpsertSchema>;

/**
 * Schema for upserting shared notes per category.
 */
export const sharedNotesUpsertSchema = z.object({
  category: z.string().min(1).max(50),
  content: z.string(),
});

export type SharedNotesUpsertInput = z.infer<typeof sharedNotesUpsertSchema>;

/**
 * Schema for upserting private notes per category.
 */
export const privateNoteUpsertSchema = z.object({
  category: z.string().min(1).max(50),
  content: z.string(),
});

export type PrivateNoteUpsertInput = z.infer<typeof privateNoteUpsertSchema>;

/**
 * Schema for creating a talking point.
 */
export const createTalkingPointSchema = z.object({
  content: z.string().min(1),
  category: z.string().min(1).max(50),
  sortOrder: z.number().int(),
});

export type CreateTalkingPointInput = z.infer<typeof createTalkingPointSchema>;

/**
 * Schema for toggling a talking point's discussed status.
 */
export const toggleTalkingPointSchema = z.object({
  id: uuid,
  isDiscussed: z.boolean(),
});

export type ToggleTalkingPointInput = z.infer<typeof toggleTalkingPointSchema>;

/**
 * Schema for deleting a talking point.
 */
export const deleteTalkingPointSchema = z.object({
  id: uuid,
});

export type DeleteTalkingPointInput = z.infer<typeof deleteTalkingPointSchema>;

/**
 * Schema for creating an action item inline.
 */
export const createActionItemSchema = z.object({
  title: z.string().min(1).max(500),
  assigneeId: uuid,
  dueDate: z.string().optional(),
  category: z.string().max(50).optional(),
});

export type CreateActionItemInput = z.infer<typeof createActionItemSchema>;

/**
 * Schema for updating an action item (title, status).
 */
export const updateActionItemSchema = z.object({
  id: uuid,
  title: z.string().min(1).max(500).optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
});

export type UpdateActionItemInput = z.infer<typeof updateActionItemSchema>;
