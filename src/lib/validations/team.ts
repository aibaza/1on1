import { z } from "zod";
import { uuid } from "./uuid";

export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(200),
  description: z.string().max(1000).optional(),
  managerId: uuid.optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  managerId: uuid.nullable().optional(),
});

export const addTeamMembersSchema = z.object({
  userIds: z.array(uuid).min(1).max(50),
});

export const removeTeamMemberSchema = z.object({
  userId: uuid,
});
