import { z } from "zod";

/**
 * Visit measurements validation schema
 */
export const visitMeasurementsSchema = z.object({
  weight: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Optional
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0.1 && num <= 200;
      },
      {
        message: "Теглото трябва да е между 0.1 и 200 кг",
      },
    )
    .or(z.literal("")),
  temperature: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Optional
        const num = parseFloat(val);
        return !isNaN(num) && num >= 30 && num <= 45;
      },
      {
        message: "Температурата трябва да е между 30 и 45°C",
      },
    )
    .or(z.literal("")),
  pulse: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Optional
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 30 && num <= 300 && Number.isInteger(num);
      },
      {
        message: "Пулсът трябва да е цяло число между 30 и 300 удара/мин",
      },
    )
    .or(z.literal("")),
});

export type VisitMeasurementsFormData = z.infer<typeof visitMeasurementsSchema>;

