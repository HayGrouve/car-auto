import { z } from "zod";

/**
 * Common validation schemas for API routes
 */

/**
 * Login request schema
 */
export const loginRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/**
 * Validates request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @param body - Request body to validate
 * @returns Validation result with parsed data or error
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors.map((e) => e.message).join(", "),
  };
}


