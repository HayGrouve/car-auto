import { z } from "zod";

/**
 * Invoice item validation schema
 */
export const invoiceItemSchema = z.object({
  description: z
    .string()
    .min(1, "Описанието е задължително")
    .max(200, "Описанието не може да надвишава 200 символа"),
  quantity: z
    .number()
    .positive("Количеството трябва да е положително число")
    .int("Количеството трябва да е цяло число")
    .min(1, "Количеството трябва да е поне 1")
    .max(9999, "Количеството не може да надвишава 9999"),
  price: z
    .number()
    .nonnegative("Цената не може да е отрицателна")
    .min(0, "Цената не може да е отрицателна")
    .max(999999.99, "Цената не може да надвишава 999999.99"),
  total: z.number(),
});

/**
 * Invoice creation validation schema
 */
export const invoiceFormSchema = z.object({
  ownerId: z.string().min(1, "Трябва да изберете собственик"),
  animalId: z.string().optional(),
  visitId: z.string().optional(),
  items: z
    .array(invoiceItemSchema)
    .min(1, "Трябва да добавите поне един ред към фактурата"),
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>;

