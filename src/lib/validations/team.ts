import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(200),
  description: z.string().max(1000).optional(),
  managerId: z.string().uuid().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
});

export const addTeamMembersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
});

export const removeTeamMemberSchema = z.object({
  userId: z.string().uuid(),
});
