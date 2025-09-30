"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { brand } from "@/lib/brand";
import { fmtDateTimeBG, fmtNumberBG } from "@/lib/format";
import { toast } from "sonner";
import type { InvoiceDoc } from "@/types/visit";
import type { Id } from "@/../convex/_generated/dataModel";
import InvoicePdfButton from "@/components/pdf/InvoicePdfButton";
import { EmptyState } from "@/components/EmptyState";
import { FileText, Printer, FileDown, CheckCircle, ExternalLink } from "lucide-react";
import { SkeletonList } from "@/components/SkeletonList";
import dynamic from "next/dynamic";
const InvoicePdf = dynamic(() => import("@/components/pdf/InvoicePdf"), { ssr: false });
import { InvoiceStatusBadge } from "@/components/StatusBadge";

export default function InvoicesPage() {
  const [ownerId, setOwnerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [unpaidOnly, setUnpaidOnly] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [sort, setSort] = useState<"createdAtDesc" | "createdAtAsc">("createdAtDesc");
  const owners = useQuery(api.owners.list, useMemo(() => ({ search: "" }), [])) as { _id: string; name: string }[] | undefined;
  const invoices = useQuery(
    api.invoices.list,
    useMemo(() => ({
      unpaidOnly,
      ownerId: ownerId ? (ownerId as Id<"owners">) : undefined,
      from: from ? Date.parse(from) : undefined,
      to: to ? Date.parse(to) : undefined,
      limit: pageSize,
      offset: page * pageSize,
      sort,
    }), [unpaidOnly, ownerId, from, to, page, sort])
  ) as InvoiceDoc[] | undefined;
  const [totalsDay, setTotalsDay] = useState("");
  const totals = useQuery(
    api.invoices.totals,
    useMemo(() => ({ day: totalsDay ? Date.parse(totalsDay) : undefined }), [totalsDay])
  ) as { paidTotal: number; unpaidTotal: number; count: number } | undefined;
  const markPaid = useMutation(api.invoices.markPaid) as unknown as (args: { id: string }) => Promise<{ ok: boolean }>;

  const [paidLoading, setPaidLoading] = useState<string | null>(null);

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{brand.nameBg}: Фактури</h1>
        <div className="text-sm text-muted-foreground">
          <span className="mr-4">Неплатено: {fmtNumberBG(totals?.unpaidTotal ?? 0, { style: "currency", currency: "BGN" })}</span>
          <span>Платено днес: {fmtNumberBG(totals?.paidTotal ?? 0, { style: "currency", currency: "BGN" })}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-2 items-end">
        <div>
          <Label>Собственик</Label>
          <select className="border rounded-md h-9 px-3 w-full" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Всички</option>
            {(owners ?? []).map((o) => (
              <option key={o._id} value={o._id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="from">От дата</Label>
          <Input id="from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
        </div>
        <div>
          <Label htmlFor="to">До дата</Label>
          <Input id="to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={unpaidOnly} onChange={(e) => { setUnpaidOnly(e.target.checked); setPage(0); }} />
          Показвай само неплатени
        </label>
        <div>
          <Label>Подредба</Label>
          <select className="border rounded-md h-9 px-3 w-full" value={sort} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSort(e.target.value as "createdAtDesc" | "createdAtAsc"); setPage(0); }}>
            <option value="createdAtDesc">Най-нови първо</option>
            <option value="createdAtAsc">Най-стари първо</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-2 items-end">
        <div>
          <Label htmlFor="totalsDay">Ден за обобщение</Label>
          <Input id="totalsDay" type="date" value={totalsDay} onChange={(e) => setTotalsDay(e.target.value)} />
        </div>
        <div className="md:col-span-2 text-sm text-muted-foreground flex items-end gap-4">
          <span>Неплатено за деня: {fmtNumberBG(totals?.unpaidTotal ?? 0, { style: "currency", currency: "BGN" })}</span>
          <span>Платено за деня: {fmtNumberBG(totals?.paidTotal ?? 0, { style: "currency", currency: "BGN" })}</span>
          <span>Брой: {totals?.count ?? 0}</span>
        </div>
      </div>

      <div className="border rounded-md divide-y">
        {invoices === undefined ? (
          <SkeletonList rows={6} />
        ) : (invoices ?? []).length === 0 ? (
          <EmptyState icon={FileText} title="Няма фактури" description="Създайте нова фактура от посещение или от страницата за фактури." />
        ) : (
          (invoices ?? []).map((inv) => (
            <div key={inv._id} className="p-3 grid md:grid-cols-6 gap-2 text-sm items-center hover:bg-accent">
              <div className="md:col-span-3">
                <a href={`/invoices/${inv._id}`} className="font-medium underline-offset-2 hover:underline inline-flex items-center gap-1" aria-label={`Преглед на фактура ${inv.code ?? String(inv._id)}`}>
                  <FileText className="size-4" aria-hidden /> {inv.code ?? `#${String(inv._id)}`} · {fmtDateTimeBG(inv.createdAt)}
                </a>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <InvoiceStatusBadge paid={inv.paid} paidAt={inv.paidAt} />
                  {inv.visitId ? (
                    <a className="inline-flex items-center gap-1 underline underline-offset-2" href={`/visits/${inv.visitId}`} aria-label="Към посещение">
                      <ExternalLink className="size-3" aria-hidden /> Към посещение
                    </a>
                  ) : null}
                </div>
                <ul className="list-disc ml-5 text-muted-foreground">
                  {inv.items.map((it, idx) => (
                    <li key={idx}>{it.description} × {it.quantity} — {fmtNumberBG(it.total, { style: "currency", currency: "BGN" })}</li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-2 text-right font-medium">
                Общо: {fmtNumberBG(inv.total, { style: "currency", currency: "BGN" })}
              </div>
              <div className="md:col-span-1 text-right">
                {/** Hide Mark Paid for already paid invoices in case filter allows paid */}
                {inv.paid ? null : (
                  <Button
                    variant="outline"
                    disabled={paidLoading === inv._id}
                    aria-label="Маркирай фактура като платена"
                    onClick={async () => {
                      setPaidLoading(inv._id);
                      await markPaid({ id: inv._id });
                      setPaidLoading(null);
                      toast.success("Фактура маркирана като платена");
                    }}
                  >
                    <CheckCircle className="mr-1 size-4" aria-hidden /> Маркирай платена
                  </Button>
                )}
                <InvoicePdfButton
                  inv={inv}
                  fileName={`invoice-${inv.code ?? String(inv._id)}.pdf`}
                  className="ml-2"
                />
                <Button
                  variant="ghost"
                  className="ml-2"
                  aria-label={`Печат за фактура ${inv.code ?? String(inv._id)}`}
                  onClick={() => {
                    const w = window.open("", "_blank", "noopener,noreferrer");
                    if (!w) return;
                    const rows = inv.items
                      .map((it) => `
                        <tr>
                          <td>${it.description}</td>
                          <td style="text-align:right;">${it.quantity}</td>
                          <td style="text-align:right;">${fmtNumberBG(it.price, { style: 'currency', currency: 'BGN' })}</td>
                          <td style="text-align:right;">${fmtNumberBG(it.total, { style: 'currency', currency: 'BGN' })}</td>
                        </tr>
                      `)
                      .join("");
                    const html = `<!doctype html>
                      <html lang=\"bg\">
                        <head>
                          <meta charset=\"utf-8\" />
                          <title>Фактура ${inv.code ?? `#${String(inv._id)}`}</title>
                          <style>
                            body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;color:#111}
                            h1{font-size:20px;margin:0 0 12px}
                            table{border-collapse:collapse;width:100%;margin-top:12px}
                            th,td{border:1px solid #ddd;padding:8px;vertical-align:top}
                            tfoot td{font-weight:600}
                            .muted{color:#666}
                          </style>
                        </head>
                        <body>
                          <h1>Фактура ${inv.code ?? `#${String(inv._id)}`}</h1>
                          <div class=\"muted\">Дата: ${new Date(inv.createdAt).toLocaleString('bg-BG')}</div>
                          <div class=\"muted\">Статус: ${inv.paid ? 'Платена' : 'Неплатена'}${inv.paid && inv.paidAt ? ' · ' + new Date(inv.paidAt).toLocaleString('bg-BG') : ''}</div>
                          <table>
                            <thead>
                              <tr>
                                <th>Описание</th>
                                <th style=\"text-align:right;\">Кол-во</th>
                                <th style=\"text-align:right;\">Цена</th>
                                <th style=\"text-align:right;\">Сума</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${rows}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colspan=\"3\" style=\"text-align:right;\">Общо</td>
                                <td style=\"text-align:right;\">${fmtNumberBG(inv.total, { style: 'currency', currency: 'BGN' })}</td>
                              </tr>
                            </tfoot>
                          </table>
                          <script>window.onload = () => window.print()</script>
                        </body>
                      </html>`;
                    w.document.open();
                    w.document.write(html);
                    w.document.close();
                  }}
                >
                  <Printer className="mr-1 size-4" aria-hidden /> Печат
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Назад</Button>
        <div className="text-sm text-muted-foreground">Страница {page + 1}</div>
        <Button
          variant="outline"
          onClick={() => setPage((p) => ((invoices ?? []).length < pageSize ? p : p + 1))}
          disabled={(invoices ?? []).length < pageSize}
        >Напред</Button>
      </div>
    </main>
  );
}


