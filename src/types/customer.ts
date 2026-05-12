import { z } from "zod";

export const CustomerDocSchema = z.object({
  _id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  gdprConsent: z.boolean().optional(),
  legalHold: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.number(),
});

export type CustomerDoc = z.infer<typeof CustomerDocSchema>;
