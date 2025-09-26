import { z } from "zod";

export const VisitDocSchema = z.object({
  _id: z.string(),
  ownerId: z.string(),
  animalId: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.number(),
});

export type VisitDoc = z.infer<typeof VisitDocSchema>;


