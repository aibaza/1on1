import { z } from "zod";

export const inviteUsersSchema = z.object({
  emails: z
    .string()
    .min(1, "At least one email is required")
    .transform((val) =>
      val
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0)
    )
    .pipe(
      z
        .array(z.string().email("Invalid email address"))
        .min(1, "At least one valid email is required")
        .max(50, "Maximum 50 invites at once")
    ),
  role: z.enum(["admin", "manager", "member"]),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  jobTitle: z.string().max(200).optional(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  jobTitle: z.string().max(200).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["admin", "manager", "member"]),
});

export const assignManagerSchema = z.object({
  managerId: z.string().uuid().nullable(),
});
