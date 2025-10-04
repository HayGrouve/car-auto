"use client";
import type { ComponentType, ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="text-muted-foreground p-6 text-center text-sm"
    >
      <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full border">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="text-foreground font-medium">{title}</div>
      {description ? <div className="mt-1">{description}</div> : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}
