"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuickActionsCardProps = {
  className?: string;
};

const actions = [
  {
    href: "/owners",
    label: "Нов собственик",
    ariaLabel: "Нов собственик",
  },
  {
    href: "/animals",
    label: "Ново животно",
    ariaLabel: "Ново животно",
  },
  {
    href: "/visits",
    label: "Ново посещение",
    ariaLabel: "Ново посещение",
  },
  {
    href: "/invoices/new",
    label: "Нова фактура",
    ariaLabel: "Нова фактура",
  },
];

export function QuickActionsCard({ className }: QuickActionsCardProps) {
  return (
    <section className={cn("grid gap-2 md:grid-cols-4", className)}>
      {actions.map(({ href, label, ariaLabel }) => (
        <Link key={href} href={href} aria-label={ariaLabel}>
          <Button
            size="sm"
            variant="secondary"
            className="w-full justify-start"
          >
            {label}
          </Button>
        </Link>
      ))}
    </section>
  );
}
