import { z } from "zod";

export const VisitDocSchema = z.object({
  _id: z.string(),
  ownerId: z.string(),
  animalId: z.string().nullable().optional(),
  status: z.string(),
  code: z.string().optional(),
  datetime: z.number().optional(),
  // Guided wizard measurements (optional for drafts)
  weight: z.number().optional(),
  temperature: z.number().optional(),
  pulse: z.number().optional(),
  soap: z
    .object({
      s: z.string().optional(),
      o: z.string().optional(),
      a: z.string().optional(),
      p: z.string().optional(),
    })
    .optional(),
  procedures: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
});

export type VisitDoc = z.infer<typeof VisitDocSchema>;

export const InvoiceDocSchema = z.object({
  _id: z.string(),
  ownerId: z.string(),
  animalId: z.string().nullable().optional(),
  visitId: z.string().nullable().optional(),
  code: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      price: z.number(),
      total: z.number(),
    }),
  ),
  total: z.number(),
  paid: z.boolean(),
  paidAt: z.number().nullable().optional(),
  createdAt: z.number(),
});
export type InvoiceDoc = z.infer<typeof InvoiceDocSchema>;
