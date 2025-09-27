"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { brand } from "@/lib/brand";
import { fmtDateTimeBG, fmtNumberBG } from "@/lib/format";

export default function InvoicesPage() {
  const invoices = useQuery(api.invoices.list, useMemo(() => ({ unpaidOnly: true }), [])) as { _id: string; ownerId: string; animalId?: string | null; items: { description: string; quantity: number; price: number; total: number }[]; total: number; createdAt: number }[] | undefined;
  const totals = useQuery(api.invoices.totals, useMemo(() => ({ }), [])) as { paidTotal: number; unpaidTotal: number; count: number } | undefined;
  const markPaid = useMutation(api.invoices.markPaid) as unknown as (args: { id: string }) => Promise<{ ok: boolean }>;

  const [paidLoading, setPaidLoading] = useState<string | null>(null);

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{brand.nameBg}: Неплатени</h1>
        <div className="text-sm text-muted-foreground">
          <span className="mr-4">Неплатено: {fmtNumberBG(totals?.unpaidTotal ?? 0, { style: "currency", currency: "BGN" })}</span>
          <span>Платено днес: {fmtNumberBG(totals?.paidTotal ?? 0, { style: "currency", currency: "BGN" })}</span>
        </div>
      </div>

      <div className="border rounded-md divide-y">
        {(invoices ?? []).length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">Няма неплатени фактури</div>
        ) : (
          (invoices ?? []).map((inv) => (
            <div key={inv._id} className="p-3 grid md:grid-cols-6 gap-2 text-sm items-center">
              <div className="md:col-span-3">
                <div className="font-medium">#{String(inv._id)} · {fmtDateTimeBG(inv.createdAt)}</div>
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
                <Button
                  variant="outline"
                  disabled={paidLoading === inv._id}
                  onClick={async () => {
                    setPaidLoading(inv._id);
                    const r = await markPaid({ id: inv._id });
                    setPaidLoading(null);
                  }}
                >Маркирай платена</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}


