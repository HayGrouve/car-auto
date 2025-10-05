"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-card text-card-foreground rounded-lg border",
        className,
      )}
    >
      {(title ?? actions) != null && (
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            {title}
          </h2>
          {actions ?? null}
        </header>
      )}
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}
