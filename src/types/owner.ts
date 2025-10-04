import { z } from "zod";

export const OwnerDocSchema = z.object({
  _id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  gdprConsent: z.boolean().optional(),
  legalHold: z.boolean().optional(),
  createdAt: z.number(),
});

export type OwnerDoc = z.infer<typeof OwnerDocSchema>;
