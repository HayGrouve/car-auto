import { z } from "zod";

export const VisitDocSchema = z.object({
  _id: z.string(),
  customerId: z.string(),
  vehicleId: z.string().nullable().optional(),
  status: z.string(),
  code: z.string().optional(),
  datetime: z.number().optional(),
  vehicleName: z.string().optional().nullable(),
  vehicleMake: z.string().optional().nullable(),
  alerts: z.array(z.string()).optional(),
  invoiceCode: z.string().optional().nullable(),
  outstandingAmount: z.string().optional().nullable(),
  mileage: z.number().optional(),
  notes: z
    .object({
      issue: z.string().optional(),
      inspection: z.string().optional(),
      diagnosis: z.string().optional(),
      plan: z.string().optional(),
    })
    .optional(),
  services: z.array(z.string()).optional(),
  parts: z.array(z.string()).optional(),
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
  customerId: z.string(),
  vehicleId: z.string().nullable().optional(),
  visitId: z.string().nullable().optional(),
  code: z.string().optional(),
  parts: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
    }),
  ),
  labor: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
    }),
  ),
  totalAmount: z.number(),
  paid: z.boolean(),
  paidAt: z.number().nullable().optional(),
  createdAt: z.number(),
});
export type InvoiceDoc = z.infer<typeof InvoiceDocSchema>;
