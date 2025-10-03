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
        <Link href="/invoices" className="text-xs text-muted-foreground underline underline-offset-2">
          Към фактури
        </Link>
      </div>
      <div className="border rounded-md divide-y">
        {invoices.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          invoices.map((invoice) => (
            <div key={invoice._id} className="p-3 flex items-center justify-between text-sm">
              <div className="space-y-0.5">
                <Link href={`/invoices/${invoice._id}`} className="font-medium underline-offset-2 hover:underline">
                  {invoice.code ?? `#${invoice._id}`}
                </Link>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                  <span>{fmtDateTimeBG(invoice.createdAt)}</span>
                  {invoice.dueDate ? <span>· До: {fmtDateTimeBG(invoice.dueDate)}</span> : null}
                  {showStatus ? <span>· {invoice.paid ? "Платена" : "Неплатена"}</span> : null}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="font-medium">
                  {fmtNumberBG(invoice.total, { style: "currency", currency: "BGN" })}
                </div>
                {!invoice.paid ? (
                  <Link href={`/invoices/${invoice._id}?pay=true`} className="text-xs text-primary underline">
                    Маркирай платена
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
      {summary ? <div className="text-xs text-muted-foreground">{summary}</div> : null}
    </section>
  );
}