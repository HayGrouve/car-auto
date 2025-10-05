"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { fmtDateTimeBG, fmtNumberBG } from "@/lib/format";
import { toast } from "sonner";
import type { InvoiceDoc } from "@/types/visit";
import type { Id } from "@/../convex/_generated/dataModel";
import InvoicePdfButton from "@/components/pdf/InvoicePdfButton";
import { EmptyState } from "@/components/EmptyState";
import { FileText, Printer, CheckCircle, ExternalLink } from "lucide-react";
import { SkeletonList } from "@/components/SkeletonList";
// import dynamic from "next/dynamic";
// const InvoicePdf = dynamic(() => import("@/components/pdf/InvoicePdf"), { ssr: false });
import { InvoiceStatusBadge } from "@/components/StatusBadge";

const ALL_OWNERS_VALUE = "__all";

export default function InvoicesPage() {
  const [ownerId, setOwnerId] = useState<string>(ALL_OWNERS_VALUE);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [unpaidOnly, setUnpaidOnly] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [sort, setSort] = useState<"createdAtDesc" | "createdAtAsc">(
    "createdAtDesc",
  );
  const owners = useQuery(
    api.owners.list,
    useMemo(() => ({ search: "" }), []),
  ) as { _id: string; name: string }[] | undefined;
  const invoices = useQuery(
    api.invoices.list,
    useMemo(
      () => ({
        unpaidOnly,
        ownerId:
          ownerId !== ALL_OWNERS_VALUE ? (ownerId as Id<"owners">) : undefined,
        from: from ? Date.parse(from) : undefined,
        to: to ? Date.parse(to) : undefined,
        limit: pageSize,
        offset: page * pageSize,
        sort,
      }),
      [unpaidOnly, ownerId, from, to, page, sort],
    ),
  ) as InvoiceDoc[] | undefined;
  const [totalsDay, setTotalsDay] = useState("");
  const totals = useQuery(
    api.invoices.totals,
    useMemo(
      () => ({ day: totalsDay ? Date.parse(totalsDay) : undefined }),
      [totalsDay],
    ),
  ) as { paidTotal: number; unpaidTotal: number; count: number } | undefined;
  const markPaid = useMutation(api.invoices.markPaid) as unknown as (args: {
    id: string;
  }) => Promise<{ ok: boolean }>;

  const [paidLoading, setPaidLoading] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Фактури: {invoices?.length}</h1>
        <div className="text-muted-foreground text-sm">
          <span className="mr-4">
            Неплатено:{" "}
            {fmtNumberBG(totals?.unpaidTotal ?? 0, {
              style: "currency",
              currency: "BGN",
            })}
          </span>
          <span>
            Платено днес:{" "}
            {fmtNumberBG(totals?.paidTotal ?? 0, {
              style: "currency",
              currency: "BGN",
            })}
          </span>
        </div>
      </div>

      <div className="grid items-end gap-2 md:grid-cols-5">
        <div>
          <Label>Собственик</Label>
          <Select
            value={ownerId}
            onValueChange={(value) => {
              setOwnerId(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Всички" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_OWNERS_VALUE}>Всички</SelectItem>
              {(owners ?? []).map((o) => (
                <SelectItem key={o._id} value={o._id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="from">От дата</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div>
          <Label htmlFor="to">До дата</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={unpaidOnly}
            onCheckedChange={(checked) => {
              setUnpaidOnly(Boolean(checked));
              setPage(0);
            }}
          />
          Показвай само неплатени
        </label>
        <div>
          <Label>Подредба</Label>
          <Select
            value={sort}
            onValueChange={(value: "createdAtDesc" | "createdAtAsc") => {
              setSort(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Подредба" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAtDesc">Най-нови първо</SelectItem>
              <SelectItem value="createdAtAsc">Най-стари първо</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid items-end gap-2 md:grid-cols-3">
        <div>
          <Label htmlFor="totalsDay">Ден за обобщение</Label>
          <Input
            id="totalsDay"
            type="date"
            value={totalsDay}
            onChange={(e) => setTotalsDay(e.target.value)}
          />
        </div>
        <div className="text-muted-foreground flex items-end gap-4 text-sm md:col-span-2">
          <span>
            Неплатено за деня:{" "}
            {fmtNumberBG(totals?.unpaidTotal ?? 0, {
              style: "currency",
              currency: "BGN",
            })}
          </span>
          <span>
            Платено за деня:{" "}
            {fmtNumberBG(totals?.paidTotal ?? 0, {
              style: "currency",
              currency: "BGN",
            })}
          </span>
          <span>Брой: {totals?.count ?? 0}</span>
        </div>
      </div>

      <div className="divide-y rounded-md border">
        {invoices === undefined ? (
          <SkeletonList rows={6} />
        ) : (invoices ?? []).length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Няма фактури"
            description="Създайте нова фактура от посещение или от страницата за фактури."
          />
        ) : (
          (invoices ?? []).map((inv) => (
            <div
              key={inv._id}
              className="hover:bg-accent grid gap-3 p-3 text-sm md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(0,1.6fr)]"
            >
              <div>
                <a
                  href={`/invoices/${inv._id}`}
                  className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                  aria-label={`Преглед на фактура ${inv.code ?? String(inv._id)}`}
                >
                  <FileText className="size-4" aria-hidden />{" "}
                  {inv.code ?? `#${String(inv._id)}`} ·{" "}
                  {fmtDateTimeBG(inv.createdAt)}
                </a>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <InvoiceStatusBadge paid={inv.paid} paidAt={inv.paidAt} />
                  {inv.visitId ? (
                    <a
                      className="inline-flex items-center gap-1 underline underline-offset-2"
                      href={`/visits/${inv.visitId}`}
                      aria-label="Към посещение"
                    >
                      <ExternalLink className="size-3" aria-hidden /> Към
                      посещение
                    </a>
                  ) : null}
                </div>
                <ul className="text-muted-foreground ml-5 list-disc">
                  {inv.items.map((it, idx) => (
                    <li key={idx}>
                      {it.description} × {it.quantity} —{" "}
                      {fmtNumberBG(it.total, {
                        style: "currency",
                        currency: "BGN",
                      })}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right font-medium">
                Общо:{" "}
                {fmtNumberBG(inv.total, { style: "currency", currency: "BGN" })}
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
                <div className="flex flex-1 justify-end gap-2 md:flex-none">
                  {inv.paid ? null : (
                    <Button
                      size="sm"
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
                      <CheckCircle className="mr-1 size-4" aria-hidden />{" "}
                      Маркирай платена
                    </Button>
                  )}
                  <InvoicePdfButton
                    inv={inv}
                    fileName={`invoice-${inv.code ?? String(inv._id)}.pdf`}
                    size="sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Печат за фактура ${inv.code ?? String(inv._id)}`}
                    onClick={() => {
                      const w = window.open(
                        "",
                        "_blank",
                        "noopener,noreferrer",
                      );
                      if (!w) return;
                      const rows = inv.items
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
                            <div class=\"muted\">Дата: ${new Date(inv.createdAt).toLocaleString("bg-BG")}</div>
                            <div class=\"muted\">Статус: ${inv.paid ? "Платена" : "Неплатена"}${inv.paid && inv.paidAt ? " · " + new Date(inv.paidAt).toLocaleString("bg-BG") : ""}</div>
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
                                  <td style=\"text-align:right;\">${fmtNumberBG(inv.total, { style: "currency", currency: "BGN" })}</td>
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
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Назад
        </Button>
        <div className="text-muted-foreground text-sm">Страница {page + 1}</div>
        <Button
          variant="outline"
          onClick={() =>
            setPage((p) => ((invoices ?? []).length < pageSize ? p : p + 1))
          }
          disabled={(invoices ?? []).length < pageSize}
        >
          Напред
        </Button>
      </div>
    </main>
  );
}
