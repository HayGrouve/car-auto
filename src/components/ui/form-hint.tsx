import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormHintProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
}

export function FormHint({ message, className, ...props }: FormHintProps) {
  if (!message) return null;

  return (
    <div
      className={cn("text-muted-foreground text-xs", className)}
      {...props}
    >
      {message}
    </div>
  );
}

