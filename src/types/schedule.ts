import { z } from "zod";

export const ScheduleSlotSchema = z.object({
  _id: z.string(),
  date: z.number(),
  startTime: z.number(),
  endTime: z.number(),
  title: z.string(),
  description: z.string().optional().nullable(),
  visitId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  animalId: z.string().optional().nullable(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ScheduleSlot = z.infer<typeof ScheduleSlotSchema>;

