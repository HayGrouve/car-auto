import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
}

export function FormError({ message, className, ...props }: FormErrorProps) {
  if (!message) return null;

  return (
    <div
      className={cn("text-destructive text-sm font-medium", className)}
      role="alert"
      aria-live="polite"
      {...props}
    >
      {message}
    </div>
  );
}

