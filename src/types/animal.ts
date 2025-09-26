import { z } from "zod";

export const AnimalDocSchema = z.object({
  _id: z.string(),
  name: z.string(),
  species: z.string(),
  breed: z.string().nullable().optional(),
  microchip: z.string().nullable().optional(),
  sex: z.string().nullable().optional(),
  neutered: z.boolean().optional(),
  dob: z.number().nullable().optional(),
  createdAt: z.number(),
});

export type AnimalDoc = z.infer<typeof AnimalDocSchema>;


