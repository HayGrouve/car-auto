import { z } from "zod";
import { bulgarianPhoneSchema, emailSchema, nameSchema } from "./common";

export const customerFormSchema = z.object({
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
  notes: z
    .string()
    .max(1000, "Бележките не могат да надвишават 1000 символа")
    .optional()
    .or(z.literal("")),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;
