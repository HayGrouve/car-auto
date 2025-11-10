"use client";

import * as React from "react";
import {
  useForm,
  type UseFormReturn,
  type FieldValues,
  type Path,
  type DefaultValues,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ZodSchema } from "zod";
import { cn } from "@/lib/utils";

export interface FormProps<T extends FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "children"> {
  schema: ZodSchema<T>;
  defaultValues?: Partial<T>;
  onSubmit: (data: T, methods: UseFormReturn<T>) => void | Promise<void>;
  children: (methods: UseFormReturn<T>) => React.ReactNode;
  className?: string;
}

export function Form<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
  ...props
}: FormProps<T>) {
  const methods = useForm<T>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: defaultValues as DefaultValues<T>,
    mode: "onChange", // Validate on change for real-time feedback
  });

  const scrollToFirstError = React.useCallback(() => {
    const errors = methods.formState.errors;
    const firstErrorField = Object.keys(errors)[0] as Path<T> | undefined;
    
    if (!firstErrorField) return;

    // Try to find the input element by id or name
    const fieldName = String(firstErrorField);
    const inputElement = 
      document.getElementById(fieldName) ??
      document.querySelector(`[name="${fieldName}"]`) ??
      document.querySelector(`[aria-invalid="true"]`);

    if (inputElement) {
      inputElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      // Focus the input for better accessibility
      if (inputElement instanceof HTMLElement) {
        inputElement.focus();
      }
    }
  }, [methods.formState.errors]);

  const handleSubmit = methods.handleSubmit(
    async (data) => {
      await onSubmit(data, methods);
    },
    () => {
      // Scroll to first error when validation fails
      setTimeout(() => {
        scrollToFirstError();
      }, 100);
    },
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-4", className)}
      noValidate
      {...props}
    >
      {children(methods)}
    </form>
  );
}

export function getFormFieldProps<T extends FieldValues>(
  form: UseFormReturn<T>,
  name: Path<T>,
) {
  const {
    formState: { errors },
    register,
  } = form;

  const error = errors[name];
  const fieldError = error?.message as string | undefined;

  return {
    ...register(name),
    error: fieldError,
    "aria-invalid": !!error,
  };
}

// Keep useFormField as alias for backward compatibility, but it's not a hook
export const useFormField = getFormFieldProps;

