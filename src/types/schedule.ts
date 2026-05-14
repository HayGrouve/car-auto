import { z } from "zod";
import { CALENDAR_KINDS } from "@/lib/calendar-kind";

export const ScheduleSlotSchema = z.object({
  _id: z.string(),
  date: z.number(),
  startTime: z.number(),
  endTime: z.number(),
  title: z.string(),
  calendarKind: z
    .union([z.enum(CALENDAR_KINDS), z.null(), z.undefined()])
    .transform((v) => (v === "inspection" ? "inspection" : "workshop")),
  description: z.string().optional().nullable(),
  visitId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  createdAt: z.number().default(0),
  updatedAt: z.number().default(0),
});

export type ScheduleSlot = z.infer<typeof ScheduleSlotSchema>;

export function parseScheduleSlot(raw: unknown): ScheduleSlot {
  return ScheduleSlotSchema.parse(raw);
}
