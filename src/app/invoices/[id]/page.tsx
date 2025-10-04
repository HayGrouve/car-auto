"use client";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { fmtDateTimeBG, fmtNumberBG } from "@/lib/format";
import InvoicePdfButton from "@/components/pdf/InvoicePdfButton";
// import dynamic from "next/dynamic";
// const InvoicePdf = dynamic(() => import("@/components/pdf/InvoicePdf"), { ssr: false });
import type { InvoiceDoc } from "@/types/visit";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"invoices">;
  const inv = useQuery(
    api.invoices.getById,
    useMemo(() => ({ id }), [id]),
  ) as InvoiceDoc | undefined;
  const markPaid = useMutation(api.invoices.markPaid) as unknown as (args: {
    id: string;
  }) => Promise<{ ok: boolean }>;
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!inv) return <main className="mx-auto max-w-3xl p-6">Зареждане...</main>;

  function onPrint() {
    if (!inv) return;
    const rows = (inv.items ?? [])
      .map(
        (it) => `
        <tr>
          <td>${it.description}</td>
          <td style="text-align:right;">${it.quantity}</td>
          <td style="text-align:right;">${fmtNumberBG(it.price, { style: "currency", currency: "BGN" })}</td>
          <td style="text-align:right;">${fmtNumberBG(it.total, { style: "currency", currency: "BGN" })}</td>
        </tr>
      `,
      )
      .join("");
    const html = `<!doctype html><html lang="bg"><head><meta charset="utf-8" /><title>Фактура ${inv.code ?? `#${String(inv._id)}`}</title>
      <style>body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;color:#111} h1{font-size:20px;margin:0 0 12px} table{border-collapse:collapse;width:100%;margin-top:12px} th,td{border:1px solid #ddd;padding:8px;vertical-align:top} tfoot td{font-weight:600} .muted{color:#666}</style></head><body>
      <h1>Фактура ${inv.code ?? `#${String(inv._id)}`}</h1>
      <div class="muted">Дата: ${new Date(inv.createdAt).toLocaleString("bg-BG")}</div>
      <div class="muted">Статус: ${inv.paid ? "Платена" : "Неплатена"}${inv.paid && inv.paidAt ? " · " + new Date(inv.paidAt).toLocaleString("bg-BG") : ""}</div>
      <table><thead><tr><th>Описание</th><th style="text-align:right;">Кол-во</th><th style="text-align:right;">Цена</th><th style="text-align:right;">Сума</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3" style="text-align:right;">Общо</td><td style="text-align:right;">${fmtNumberBG(inv.total, { style: "currency", currency: "BGN" })}</td></tr></tfoot>
      </table>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) {
      URL.revokeObjectURL(url);
      return;
    }
    const handleLoad = () => {
      w.focus();
      w.print();
      w.removeEventListener("load", handleLoad);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    w.addEventListener("load", handleLoad);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Фактура</h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Назад
          </Button>
        </div>
      </div>
      <div className="divide-y rounded-md border">
        <div className="flex items-center justify-between p-3 text-sm">
          <div>
            <div className="font-medium">
              {inv.code ?? `#${String(inv._id)}`} ·{" "}
              {fmtDateTimeBG(inv.createdAt)}
            </div>
            <div className="text-muted-foreground">
              {inv.paid
                ? `Платена${inv.paidAt ? ` · ${fmtDateTimeBG(inv.paidAt)}` : ""}`
                : "Неплатена"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {inv.paid ? null : (
              <Button
                variant="outline"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  await markPaid({ id: inv._id });
                  setLoading(false);
                }}
              >
                Маркирай платена
              </Button>
            )}
            <InvoicePdfButton
              inv={inv}
              fileName={`invoice-${inv.code ?? String(inv._id)}.pdf`}
            />
            <Button variant="outline" onClick={onPrint}>
              Печат
            </Button>
          </div>
        </div>
        <div className="p-3">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Описание</th>
                <th className="text-right">Кол-во</th>
                <th className="text-right">Цена</th>
                <th className="text-right">Сума</th>
              </tr>
            </thead>
            <tbody>
              {(inv.items ?? []).map((it, idx) => (
                <tr key={idx}>
                  <td>{it.description}</td>
                  <td className="text-right">{it.quantity}</td>
                  <td className="text-right">
                    {fmtNumberBG(it.price, {
                      style: "currency",
                      currency: "BGN",
                    })}
                  </td>
                  <td className="text-right">
                    {fmtNumberBG(it.total, {
                      style: "currency",
                      currency: "BGN",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-right font-medium">
                  Общо
                </td>
                <td className="text-right font-medium">
                  {fmtNumberBG(inv.total, {
                    style: "currency",
                    currency: "BGN",
                  })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </main>
  );
}
