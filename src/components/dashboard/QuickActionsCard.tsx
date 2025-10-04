"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuickActionsCardProps = {
  className?: string;
  onNewDraftVisit?: () => void;
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
  {
    href: "/visits?status=draft",
    label: "Чернови",
    ariaLabel: "Чернови посещения",
  },
  {
    href: "/payments",
    label: "Плащания",
    ariaLabel: "Всички плащания",
  },
];

export function QuickActionsCard({
  className,
  onNewDraftVisit,
}: QuickActionsCardProps) {
  return (
    <section className={cn("grid gap-2 md:grid-cols-3", className)}>
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
      <Button
        size="sm"
        variant="default"
        className="w-full justify-start"
        onClick={onNewDraftVisit}
      >
        Бърза чернова за посещение
      </Button>
    </section>
  );
}
