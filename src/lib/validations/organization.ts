import { z } from "zod";

export const orgTypeEnum = z.enum(["for_profit", "non_profit"]);

export const supportedLanguages = [
  "en",
  "ro",
  "de",
  "fr",
  "es",
  "pt",
] as const;

export const orgSettingsSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(255)
    .optional(),
  timezone: z.string().min(1, "Timezone is required"),
  defaultCadence: z.enum(["weekly", "biweekly", "monthly", "custom"]),
  defaultDurationMinutes: z
    .number()
    .min(15, "Minimum 15 minutes")
    .max(120, "Maximum 120 minutes"),
  preferredLanguage: z.enum(supportedLanguages).optional(),
});

export type OrgSettings = z.infer<typeof orgSettingsSchema>;
export type OrgType = z.infer<typeof orgTypeEnum>;
