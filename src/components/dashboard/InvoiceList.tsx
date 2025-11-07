"use client";

import Link from "next/link";
import { fmtDateTimeBG, fmtNumberBG } from "@/lib/format";
import { cn } from "@/lib/utils";

export type InvoiceListItem = {
  _id: string;
  code: string | null;
  createdAt: number;
  total: number;
  paid: boolean;
  linkLabel?: string;
  dueDate?: number | null;
};

export function InvoiceList({
  title,
  invoices,
  emptyLabel,
  summary,
  className,
  showStatus = true,
}: {
  title: string;
  invoices: InvoiceListItem[];
  emptyLabel: string;
  summary?: React.ReactNode;
  className?: string;
  showStatus?: boolean;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <Link
          href="/invoices"
          className="text-muted-foreground text-xs underline underline-offset-2 cursor-pointer"
        >
          Към фактури
        </Link>
      </div>
      <div className="divide-y rounded-md border">
        {invoices.length === 0 ? (
          <div className="text-muted-foreground p-3 text-sm">{emptyLabel}</div>
        ) : (
          invoices.map((invoice) => (
            <div
              key={invoice._id}
              className="flex items-center justify-between gap-3 p-3 text-sm min-h-[72px]"
            >
              <div className="space-y-0.5">
                <Link
                  href={`/invoices/${invoice._id}`}
                  className="font-medium underline-offset-2 hover:underline cursor-pointer"
                >
                  {invoice.code ?? `#${invoice._id}`}
                </Link>
                <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                  <span>{fmtDateTimeBG(invoice.createdAt)}</span>
                  {invoice.dueDate ? (
                    <span>· До: {fmtDateTimeBG(invoice.dueDate)}</span>
                  ) : null}
                  {showStatus ? (
                    <span>· {invoice.paid ? "Платена" : "Неплатена"}</span>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1 text-right">
                <div className="font-medium">
                  {fmtNumberBG(invoice.total, {
                    style: "currency",
                    currency: "BGN",
                  })}
                </div>
                {!invoice.paid ? (
                  <Link
                    href={`/invoices/${invoice._id}?pay=true`}
                    className="text-primary text-xs underline cursor-pointer"
                  >
                    Маркирай платена
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
      {summary ? (
        <div className="text-muted-foreground text-xs">{summary}</div>
      ) : null}
    </section>
  );
}
