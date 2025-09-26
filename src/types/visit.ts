import { z } from "zod";

export const VisitDocSchema = z.object({
  _id: z.string(),
  ownerId: z.string(),
  animalId: z.string().nullable().optional(),
  status: z.string(),
  soap: z
    .object({ s: z.string().optional(), o: z.string().optional(), a: z.string().optional(), p: z.string().optional() })
    .optional(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
});

export type VisitDoc = z.infer<typeof VisitDocSchema>;


