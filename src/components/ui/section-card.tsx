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
    <section className={cn("rounded-lg border bg-card text-card-foreground", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h2>
          {actions ? <div className="flex items-center gap-2 text-xs">{actions}</div> : null}
        </header>
      )}
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}
