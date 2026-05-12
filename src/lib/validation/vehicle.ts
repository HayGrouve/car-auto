import { z } from "zod";

export const vehicleFormSchema = z.object({
  licensePlate: z
    .string()
    .min(1, "Рег. номер е задължителен")
    .max(20, "Рег. номер не може да надвишава 20 символа"),
  make: z
    .string()
    .min(1, "Марката е задължителна")
    .max(50, "Марката не може да надвишава 50 символа"),
  model: z
    .string()
    .max(50, "Моделът не може да надвишава 50 символа")
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .max(50, "Цветът не може да надвишава 50 символа")
    .optional()
    .or(z.literal("")),
  vin: z
    .string()
    .max(17, "VIN номерът не може да надвишава 17 символа")
    .optional()
    .or(z.literal("")),
  year: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === "") return true; // Optional
        const num = parseInt(val, 10);
        const currentYear = new Date().getFullYear();
        return !isNaN(num) && num >= 1900 && num <= currentYear + 1;
      },
      {
        message: "Въведете валидна година",
      },
    )
    .or(z.literal("")),
  customerId: z.string().optional(),
});

export type VehicleFormData = z.infer<typeof vehicleFormSchema>;
