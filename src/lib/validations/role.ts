import { z } from "zod";
import { uuid } from "./uuid";

export const createJobRoleSchema = z.object({
  name: z.string().min(1, "Role name is required").max(100),
  description: z.string().max(1000).optional(),
});

export const updateJobRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
});

export const assignJobRolesSchema = z.object({
  roleIds: z.array(uuid).max(20),
});

export const updateTeamNameSchema = z.object({
  teamName: z.string().min(1, "Team name is required").max(200),
});
