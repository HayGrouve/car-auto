import { z } from "zod";

export const visitMeasurementsSchema = z.object({
  mileage: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Optional
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      {
        message: "Пробегът трябва да е положително число",
      },
    )
    .or(z.literal("")),
});

export type VisitMeasurementsFormData = z.infer<typeof visitMeasurementsSchema>;
