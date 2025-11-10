import { z } from "zod";
import { nameSchema, microchipSchema, validatePastDate } from "./common";

/**
 * Animal creation/update validation schema
 */
export const animalFormSchema = z.object({
  name: nameSchema,
  species: z
    .string()
    .min(1, "Видът е задължителен")
    .max(50, "Видът не може да надвишава 50 символа"),
  breed: z
    .string()
    .max(50, "Породата не може да надвишава 50 символа")
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .max(50, "Цветът не може да надвишава 50 символа")
    .optional()
    .or(z.literal("")),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  neutered: z.boolean().optional(),
  microchip: microchipSchema,
  dob: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === "") return true; // Optional
        const date = new Date(val);
        if (isNaN(date.getTime())) return false;
        return validatePastDate(date);
      },
      {
        message: "Датата на раждане не може да бъде в бъдещето",
      },
    )
    .or(z.literal("")),
  ownerId: z.string().optional(),
});

export type AnimalFormData = z.infer<typeof animalFormSchema>;

