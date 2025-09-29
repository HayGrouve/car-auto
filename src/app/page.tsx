"use client";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { brand } from "@/lib/brand";
import { fmtDateTimeBG, fmtNumberBG } from "@/lib/format";
import type { VisitDoc, InvoiceDoc } from "@/types/visit";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  const owners = useQuery(api.owners.list, useMemo(() => ({ search: "" }), [])) as { _id: string; name?: string }[] | undefined;
  const animals = useQuery(api.animals.list, useMemo(() => ({ search: "" }), [])) as { _id: string }[] | undefined;
  const visits = useQuery(api.visits.list, useMemo(() => ({ limit: 5 }), [])) as VisitDoc[] | undefined;
  const invoices = useQuery(api.invoices.list, useMemo(() => ({ unpaidOnly: undefined }), [])) as InvoiceDoc[] | undefined;
  const todayTotals = useQuery(api.invoices.totals, useMemo(() => ({ day: Date.now() }), [])) as { paidTotal: number; unpaidTotal: number; count: number } | undefined;

  const recentInvoices = (invoices ?? []).slice(0, 5);

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{brand.nameBg}: Табло</h1>
        <div className="text-sm text-muted-foreground">
          <span className="mr-4">Неплатено днес: {fmtNumberBG(todayTotals?.unpaidTotal ?? 0, { style: "currency", currency: "BGN" })}</span>
          <span>Платено днес: {fmtNumberBG(todayTotals?.paidTotal ?? 0, { style: "currency", currency: "BGN" })}</span>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted-foreground">Собственици</div>
          <div className="text-2xl font-semibold">{(owners ?? []).length}</div>
          <div className="mt-3"><Link href="/owners"><Button size="sm" variant="outline">Към списъка</Button></Link></div>
        </div>
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted-foreground">Животни</div>
          <div className="text-2xl font-semibold">{(animals ?? []).length}</div>
          <div className="mt-3"><Link href="/animals"><Button size="sm" variant="outline">Към списъка</Button></Link></div>
        </div>
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted-foreground">Фактури (днес)</div>
          <div className="text-2xl font-semibold">{todayTotals?.count ?? 0}</div>
          <div className="mt-3"><Link href="/invoices"><Button size="sm" variant="outline">Към фактури</Button></Link></div>
        </div>
        <div className="rounded-md border p-4">
          <div className="text-sm text-muted-foreground">Последни посещения</div>
          <div className="text-2xl font-semibold">{(visits ?? []).length}</div>
          <div className="mt-3"><Link href="/visits"><Button size="sm" variant="outline">Към посещения</Button></Link></div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Последни посещения</h2>
          <div className="border rounded-md divide-y">
            {(visits ?? []).length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Няма записи</div>
            ) : (
              (visits ?? []).map((v) => (
                <div key={v._id} className="p-3 flex items-center justify-between text-sm">
                  <div className="space-y-0.5">
                    <a href={`/visits/${v._id}`} className="font-medium underline-offset-2 hover:underline">{(v as VisitDoc & { code?: string }).code ?? `#${String(v._id)}`}</a>
                    <div className="text-muted-foreground">{fmtDateTimeBG((v as VisitDoc & { datetime?: number }).datetime ?? v.createdAt)} · {v.status === "draft" ? "Чернова" : v.status === "finalized" ? "Приключено" : v.status}</div>
                  </div>
                  <Link href={`/invoices/new?ownerId=${encodeURIComponent(v.ownerId)}${v.animalId ? `&animalId=${encodeURIComponent(v.animalId)}` : ""}&visitId=${encodeURIComponent(v._id)}`}>
                    <Button size="sm" variant="outline">Нова фактура</Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Последни фактури</h2>
          <div className="border rounded-md divide-y">
            {recentInvoices.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Няма фактури</div>
            ) : (
              recentInvoices.map((inv) => (
                <div key={inv._id} className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 items-center text-sm">
                  <div className="font-medium">{inv.code ?? `#${String(inv._id)}`}</div>
                  <div className="text-muted-foreground">{fmtDateTimeBG(inv.createdAt)}</div>
                  <div className="text-right md:col-span-1 font-medium">{fmtNumberBG(inv.total, { style: "currency", currency: "BGN" })}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
