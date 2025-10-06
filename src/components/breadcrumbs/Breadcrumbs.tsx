"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "./BreadcrumbProvider";
import { useBreadcrumbs } from "./BreadcrumbProvider";

type BreadcrumbsProps = {
  items?: BreadcrumbItem[];
  className?: string;
};

type NormalizedItem = BreadcrumbItem & { ellipsis?: boolean };

function normalizeItems(items: BreadcrumbItem[]): NormalizedItem[] {
  if (!items.length) return items;
  return items.map((item, index) => {
    if (index === items.length - 1) {
      return {
        ...item,
        current: true,
      } satisfies NormalizedItem;
    }
    return {
      ...item,
      current: Boolean(item.current && index === items.length - 1),
    } satisfies NormalizedItem;
  });
}

export function Breadcrumbs({ items = [], className }: BreadcrumbsProps) {
  const { items: contextItems } = useBreadcrumbs();
  const source = items.length ? items : contextItems;
  const normalized = useMemo(() => normalizeItems(source), [source]);
  const displayItems = useMemo(() => {
    if (normalized.length <= 3) return normalized;
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    if (!first || !last) return normalized;
    return [
      first,
      {
        id: "ellipsis",
        label: "…",
        ellipsis: true,
        current: false,
      },
      last,
    ] satisfies NormalizedItem[];
  }, [normalized]);

  if (displayItems.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "bg-muted/40 text-muted-foreground mb-6 rounded-md px-3 py-2 text-sm",
        "max-sm:rounded-none max-sm:px-4 max-sm:py-3",
        className,
      )}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1 && !item.ellipsis;
          const isEllipsis = Boolean(item.ellipsis);
          const key = item.id ?? `${item.href ?? "crumb"}-${index}`;

          const content = isEllipsis ? (
            <span className="text-muted-foreground" aria-hidden="true">
              …
            </span>
          ) : isLast || !item.href ? (
            <span
              className={cn(
                "max-w-[14ch] truncate",
                isLast && "text-foreground font-semibold",
              )}
              aria-current={isLast ? "page" : undefined}
            >
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <span className="max-w-[14ch] truncate">{item.label}</span>
              <span className="sr-only"> към {item.label}</span>
            </Link>
          );

          return (
            <li key={key} className={cn(isEllipsis && "max-sm:hidden")}>
              <div className="flex items-center gap-1.5">
                {index > 0 ? (
                  <ChevronRight
                    className="text-muted-foreground/70 h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                ) : null}
                {content}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
