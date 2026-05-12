import { z } from "zod";

export const invoiceItemSchema = z.object({
  name: z
    .string()
    .min(1, "Описанието е задължително")
    .max(200, "Описанието не може да надвишава 200 символа"),
  quantity: z
    .number()
    .positive("Количеството трябва да е положително число")
    .min(0.01, "Количеството трябва да е поне 0.01")
    .max(9999, "Количеството не може да надвишава 9999"),
  price: z
    .number()
    .nonnegative("Цената не може да е отрицателна")
    .min(0, "Цената не може да е отрицателна")
    .max(999999.99, "Цената не може да надвишава 999999.99"),
});

export const invoiceFormSchema = z.object({
  customerId: z.string().min(1, "Трябва да изберете клиент"),
  vehicleId: z.string().optional(),
  visitId: z.string().optional(),
  parts: z.array(invoiceItemSchema).optional(),
  labor: z.array(invoiceItemSchema).optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>;
