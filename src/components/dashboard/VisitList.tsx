"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fmtDateTimeBG } from "@/lib/format";
import { cn } from "@/lib/utils";

export type VisitListItem = {
  _id: string;
  code: string | null;
  datetime: number;
  status: string;
  ownerName: string | null;
  ownerId: string | null;
  animalId: string | null;
  highlight?: boolean;
  badge?: string;
};

export function VisitList({
  title,
  visits,
  emptyLabel,
  actionLabel,
  className,
  footer,
}: {
  title: string;
  visits: VisitListItem[];
  emptyLabel: string;
  actionLabel?: string;
  className?: string;
  footer?: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        {actionLabel ? (
          <Link href="/visits" className="text-xs text-muted-foreground underline underline-offset-2">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="border rounded-md divide-y">
        {visits.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          visits.map((visit) => (
            <div
              key={visit._id}
              className={cn(
                "p-3 flex items-center justify-between text-sm",
                visit.highlight && "bg-muted/50"
              )}
            >
              <div className="space-y-1">
                <Link href={`/visits/${visit._id}`} className="font-medium underline-offset-2 hover:underline">
                  {visit.code ?? `#${visit._id}`}
                </Link>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
                  <span>{fmtDateTimeBG(visit.datetime)}</span>
                  <span>
                    · {visit.status === "draft" ? "Чернова" : visit.status === "finalized" ? "Приключено" : visit.status}
                  </span>
                  {visit.ownerName ? <span>· {visit.ownerName}</span> : null}
                  {visit.badge ? (
                    <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-primary text-[10px] uppercase tracking-wide">
                      {visit.badge}
                    </span>
                  ) : null}
                </div>
              </div>
              <Link
                href={`/invoices/new?ownerId=${encodeURIComponent(visit.ownerId ?? "")}${
                  visit.animalId ? `&animalId=${encodeURIComponent(visit.animalId)}` : ""
                }&visitId=${encodeURIComponent(visit._id)}`}
              >
                <Button size="sm" variant="outline">
                  Нова фактура
                </Button>
              </Link>
            </div>
          ))
        )}
      </div>
      {footer ? <div className="text-xs text-muted-foreground">{footer}</div> : null}
    </section>
  );
}