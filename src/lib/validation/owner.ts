import { z } from "zod";
import { bulgarianPhoneSchema, emailSchema, nameSchema } from "./common";

/**
 * Owner creation/update validation schema
 */
export const ownerFormSchema = z.object({
  name: nameSchema,
  phone: bulgarianPhoneSchema,
  email: emailSchema,
  address: z
    .string()
    .max(200, "Адресът не може да надвишава 200 символа")
    .optional()
    .or(z.literal("")),
  gdprConsent: z.boolean().refine((val) => val === true, {
    message: "Трябва да се съгласите с политиката за поверителност",
  }),
});

export type OwnerFormData = z.infer<typeof ownerFormSchema>;

