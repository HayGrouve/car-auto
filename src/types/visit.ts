import { z } from "zod";

export const VisitDocSchema = z.object({
  _id: z.string(),
  ownerId: z.string(),
  animalId: z.string().nullable().optional(),
  status: z.string(),
  code: z.string().optional(),
  datetime: z.number().optional(),
  animalName: z.string().optional().nullable(),
  animalSpecies: z.string().optional().nullable(),
  alerts: z.array(z.string()).optional(),
  invoiceCode: z.string().optional().nullable(),
  outstandingAmount: z.string().optional().nullable(),
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
  documents: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        type: z.string().optional(),
        storageId: z.string().optional(),
        url: z.string().optional(),
        size: z.number().optional(),
        uploadedAt: z.number().optional(),
      }),
    )
    .optional(),
  history: z
    .array(
      z.object({
        timestamp: z.number(),
        actor: z.string().optional(),
        action: z.string(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
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
