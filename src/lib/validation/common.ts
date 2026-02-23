import { z } from "zod";

/**
 * Common validation schemas and utilities
 */

/**
 * Validates Bulgarian phone number format
 * Supports:
 * - Domestic: 08xxxxxxxx, 09xxxxxxxx, 02xxxxxxx, etc.
 * - International: +359...
 */
export const bulgarianPhoneSchema = z
  .string()
  .min(1, "Телефонът е задължителен")
  .refine(
    (val) => {
      // Remove all non-digit characters except the leading plus
      const cleaned = val.replace(/[^\d+]/g, "");
      
      // International format: +359 followed by 7-9 digits
      if (cleaned.startsWith("+359")) {
        return /^\+359\d{7,9}$/.test(cleaned);
      }
      
      // Domestic format: starts with 0 and has 9-10 digits total
      // (e.g., 0888123456, 021234567)
      return /^0\d{8,9}$/.test(cleaned);
    },
    {
      message: "Въведете валиден български телефонен номер (напр. 08xxxxxxxx или +359...)",
    },
  );

/**
 * Validates email format
 */
export const emailSchema = z
  .string()
  .email("Въведете валиден имейл адрес")
  .optional()
  .or(z.literal(""));

/**
 * Validates ISO microchip format (15 digits)
 */
export const microchipSchema = z
  .string()
  .refine(
    (val) => {
      if (!val || val.trim() === "") return true; // Optional
      const cleaned = val.replace(/\s+/g, "");
      return /^\d{15}$/.test(cleaned);
    },
    {
      message: "Микрочипът трябва да е 15 цифри (ISO формат)",
    },
  )
  .optional()
  .or(z.literal(""));

/**
 * Validates that a date is not in the future
 */
export function validatePastDate(date: Date | number | string): boolean {
  const dateObj = typeof date === "number" ? new Date(date) : new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  return dateObj <= today;
}

/**
 * Validates that a date is within a reasonable range (not more than maxYears years ago)
 */
export function validateDateRange(
  date: Date | number | string,
  maxYears = 50,
): boolean {
  const dateObj = typeof date === "number" ? new Date(date) : new Date(date);
  const today = new Date();
  const maxDate = new Date();
  maxDate.setFullYear(today.getFullYear() - maxYears);
  return dateObj >= maxDate && dateObj <= today;
}

/**
 * Validates name (letters, spaces, Bulgarian characters)
 */
export const nameSchema = z
  .string()
  .min(1, "Името е задължително")
  .min(2, "Името трябва да е поне 2 символа")
  .max(100, "Името не може да надвишава 100 символа")
  .refine(
    (val) => /^[A-Za-zА-Яа-я\s]+$/.test(val),
    {
      message: "Името трябва да съдържа само букви",
    },
  );

/**
 * Validates optional name field
 */
export const optionalNameSchema = z
  .string()
  .max(100, "Полето не може да надвишава 100 символа")
  .refine(
    (val) => !val || /^[A-Za-zА-Яа-я\s]+$/.test(val),
    {
      message: "Полето трябва да съдържа само букви",
    },
  )
  .optional()
  .or(z.literal(""));

