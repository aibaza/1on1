import { z } from "zod";
import { uuid } from "./uuid";

// Series cadences (mirrors DB enum)
export const cadences = ["weekly", "biweekly", "monthly", "custom"] as const;

// Preferred days (mirrors DB enum)
export const preferredDays = ["mon", "tue", "wed", "thu", "fri"] as const;

// Series statuses (mirrors DB enum)
export const seriesStatuses = ["active", "paused", "archived"] as const;

// Create series
export const createSeriesSchema = z
  .object({
    reportId: z.string().uuid("Invalid report ID"),
    cadence: z.enum(cadences),
    cadenceCustomDays: z.number().int().min(1).max(365).optional(),
    defaultTemplateId: uuid.optional(),
    preferredDay: z.enum(preferredDays).optional(),
    preferredTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
      .optional(),
    defaultDurationMinutes: z.number().int().min(15).max(180).default(30),
    nextSessionAt: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.cadence === "custom") {
        return data.cadenceCustomDays !== undefined;
      }
      return true;
    },
    {
      message: "Custom interval (days) is required when cadence is 'custom'",
      path: ["cadenceCustomDays"],
    }
  );

// Update series (all optional, plus status)
export const updateSeriesSchema = z.object({
  cadence: z.enum(cadences).optional(),
  cadenceCustomDays: z.number().int().min(1).max(365).nullable().optional(),
  defaultTemplateId: uuid.nullable().optional(),
  preferredDay: z.enum(preferredDays).nullable().optional(),
  preferredTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .nullable()
    .optional(),
  defaultDurationMinutes: z.number().int().min(15).max(180).optional(),
  reminderHoursBefore: z.number().int().min(1).max(168).optional(),
  status: z.enum(seriesStatuses).optional(),
  nextSessionAt: z.string().datetime().nullable().optional(),
});

// Transfer series to a new manager
export const transferSeriesSchema = z.object({
  newManagerId: uuid,
});

// Inferred types
export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;
export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>;
export type TransferSeriesInput = z.infer<typeof transferSeriesSchema>;
