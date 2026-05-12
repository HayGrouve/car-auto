import { z } from "zod";

export const VehicleDocSchema = z.object({
  _id: z.string(),
  licensePlate: z.string(),
  make: z.string(),
  model: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  vin: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  customerId: z.string().nullable().optional(),
  createdAt: z.number(),
});

export type VehicleDoc = z.infer<typeof VehicleDocSchema>;
