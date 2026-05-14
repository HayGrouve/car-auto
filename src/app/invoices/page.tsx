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
import { fmtDateTimeBG, fmtNumberBG, APP_CURRENCY } from "@/lib/format";
import { toast } from "sonner";
import type { InvoiceDoc } from "@/types/visit";
import type { Id } from "@/../convex/_generated/dataModel";
import dynamic from "next/dynamic";
import { EmptyState } from "@/components/EmptyState";
import {
  FileText,
  Printer,
  CheckCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SkeletonList } from "@/components/SkeletonList";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";
import { SectionCard } from "@/components/ui/section-card";
import { useRouter } from "next/navigation";
import { printInvoice } from "@/lib/printInvoice";

// Lazy load PDF button component
const InvoicePdfButton = dynamic(
  () => import("@/components/pdf/InvoicePdfButton"),
  { ssr: false },
);

const ALL_CUSTOMERS_VALUE = "__all";

export default function InvoicesPage() {
  const [customerId, setCustomerId] = useState<string>(ALL_CUSTOMERS_VALUE);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [sort, setSort] = useState<"createdAtDesc" | "createdAtAsc">(
    "createdAtDesc",
  );
  const customersQuery = useQuery(
    api.customers.list,
    useMemo(() => ({ search: "" }), []),
  );
  const customersResult = customersQuery as
    | {
        items: { _id: string; name: string }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const customers = customersResult?.items;
  const invoicesQuery = useQuery(
    api.invoices.list,
    useMemo(
      () => ({
        unpaidOnly,
        customerId:
          customerId !== ALL_CUSTOMERS_VALUE ? (customerId as Id<"customers">) : undefined,
        from: from ? Date.parse(from) : undefined,
        to: to ? Date.parse(to) : undefined,
        limit: pageSize,
        offset: page * pageSize,
        sort,
      }),
      [unpaidOnly, customerId, from, to, page, sort],
    ),
  );
  const invoices = invoicesQuery as
    | { items: InvoiceDoc[]; total: number; hasMore: boolean }
    | undefined;
  const invoicesList = invoices?.items ?? undefined;
  const [totalsDay, setTotalsDay] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const totalPages = useMemo(() => {
    const total = invoices?.total ?? 0;
    return total > 0 ? Math.ceil(total / pageSize) : 1;
  }, [invoices?.total, pageSize]);
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

  useBreadcrumbRegistration([
    { label: "Начало", href: "/" } satisfies BreadcrumbItem,
    {
      label: "Фактури",
      href: "/invoices",
      current: true,
    } satisfies BreadcrumbItem,
  ]);

  const [paidLoading, setPaidLoading] = useState<string | null>(null);
  const router = useRouter();
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
        <div className="flex w-full items-center gap-2 md:w-auto">
          <FileText className="text-primary size-5" />
          <h1 className="text-xl font-semibold sm:text-2xl md:text-3xl">
            Фактури: {invoices?.total ?? 0}
          </h1>
        </div>
        <Button
          type="button"
          onClick={() => {
            void router.push("/invoices/new");
          }}
          className="w-full md:w-auto"
        >
          Нова фактура
        </Button>
      </div>
      <SectionCard
        title="Обобщение за деня"
        description="Изберете ден, за да видите обобщение на платени/неплатени фактури."
        responsiveCollapsible
      >
        <div className="space-y-3">
          <div className="grid items-end gap-2 md:grid-cols-3">
            <div>
              <Label htmlFor="totalsDay">Ден за обобщение</Label>
              <Input
                id="totalsDay"
                type="date"
                value={totalsDay}
                onChange={(e) => setTotalsDay(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <div className="border-t" />
          <div className="text-muted-foreground grid gap-3 text-sm md:grid-cols-4">
            <div className="flex items-center justify-between gap-3 md:block md:space-y-1">
              <span className="md:block">Неплатено за деня</span>
              <span className="text-foreground font-medium">
                {fmtNumberBG(totals?.unpaidTotal ?? 0, {
                  style: "currency",
                  currency: APP_CURRENCY,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 md:block md:space-y-1">
              <span className="md:block">Платено за деня</span>
              <span className="text-foreground font-medium">
                {fmtNumberBG(totals?.paidTotal ?? 0, {
                  style: "currency",
                  currency: APP_CURRENCY,
                })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 md:block md:space-y-1">
              <span className="md:block">Общо</span>
              <span className="text-foreground font-medium">
                {fmtNumberBG(
                  (totals?.paidTotal ?? 0) + (totals?.unpaidTotal ?? 0),
                  {
                    style: "currency",
                    currency: APP_CURRENCY,
                  },
                )}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 md:block md:space-y-1">
              <span className="md:block">Брой</span>
              <span className="text-foreground font-medium">
                {totals?.count ?? 0}
              </span>
            </div>
          </div>
        </div>
      </SectionCard>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 md:grid-cols-5">
        <div>
          <Label>Клиент</Label>
          <Select
            value={customerId}
            onValueChange={(value) => {
              setCustomerId(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 min-h-[44px] w-full">
              <SelectValue placeholder="Всички" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CUSTOMERS_VALUE}>Всички</SelectItem>
              {(customers ?? []).map((o) => (
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
            className="h-10 min-h-[44px]"
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
            className="h-10 min-h-[44px]"
          />
        </div>
        <div>
          <Label>Подредба</Label>
          <Select
            value={sort}
            onValueChange={(value: "createdAtDesc" | "createdAtAsc") => {
              setSort(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-10 min-h-[44px] w-full">
              <SelectValue placeholder="Подредба" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAtDesc">Най-нови първо</SelectItem>
              <SelectItem value="createdAtAsc">Най-стари първо</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <Checkbox
            checked={unpaidOnly}
            onCheckedChange={(checked) => {
              setUnpaidOnly(Boolean(checked));
              setPage(0);
            }}
          />
          Само неплатени
        </label>
      </div>

      <div className="-mt-2 md:col-span-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {customerId !== ALL_CUSTOMERS_VALUE && (
            <button
              type="button"
              onClick={() => {
                setCustomerId(ALL_CUSTOMERS_VALUE);
                setPage(0);
              }}
              className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
            >
              <span>
                Клиент:{" "}
                {(customers ?? []).find((o) => o._id === customerId)?.name ?? customerId}
              </span>
              <span aria-hidden>✕</span>
            </button>
          )}
          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
                setPage(0);
              }}
              className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
            >
              <span>
                Период: {from || "—"} – {to || "—"}
              </span>
              <span aria-hidden>✕</span>
            </button>
          )}
          {unpaidOnly && (
            <button
              type="button"
              onClick={() => {
                setUnpaidOnly(false);
                setPage(0);
              }}
              className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
            >
              <span>Само неплатени</span>
              <span aria-hidden>✕</span>
            </button>
          )}
          {(customerId !== ALL_CUSTOMERS_VALUE || from || to || unpaidOnly) && (
            <button
              type="button"
              onClick={() => {
                setCustomerId(ALL_CUSTOMERS_VALUE);
                setFrom("");
                setTo("");
                setUnpaidOnly(false);
                setPage(0);
              }}
              className="bg-muted hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
            >
              Изчисти всички
            </button>
          )}
        </div>
      </div>

      <div className="divide-y rounded-md border">
        {invoices === undefined ? (
          <SkeletonList rows={6} />
        ) : (invoicesList ?? []).length === 0 ? (
          <EmptyState
            icon={FileText}
            title={unpaidOnly ? "Няма неплатени фактури" : "Няма фактури"}
            description={
              unpaidOnly
                ? "В момента няма неплатени фактури. Може да има платени фактури, но те не се показват с активния филтър."
                : "Създайте нова фактура от посещение или от страницата за фактури."
            }
          />
        ) : (
          (invoicesList ?? []).map((inv) => (
            <div
              key={inv._id}
              className="flex flex-col gap-3 p-3 text-sm sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-h-[44px] items-center justify-between gap-2 sm:justify-start sm:gap-3">
                  <a
                    href={`/invoices/${inv._id}`}
                    className="inline-flex min-w-0 flex-1 items-center gap-1 font-medium underline-offset-2 hover:underline sm:flex-initial"
                    aria-label={`Преглед на фактура ${inv.code ?? String(inv._id)}`}
                  >
                    <FileText className="size-4 flex-shrink-0" aria-hidden />
                    <span className="truncate">
                      {inv.code ?? `#${String(inv._id)}`} ·{" "}
                      {fmtDateTimeBG(inv.createdAt)}
                    </span>
                  </a>
                  <div className="flex-shrink-0 text-right text-xs font-medium sm:hidden">
                    Общо:{" "}
                    {fmtNumberBG(inv.totalAmount, {
                      style: "currency",
                      currency: APP_CURRENCY,
                    })}
                  </div>
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                  <InvoiceStatusBadge paid={inv.paid} paidAt={inv.paidAt} />
                  {inv.visitId ? (
                    <a
                      className="inline-flex min-h-[44px] items-center gap-1 underline underline-offset-2"
                      href={`/visits/${inv.visitId}`}
                      aria-label="Към посещение"
                    >
                      <ExternalLink
                        className="size-3 flex-shrink-0"
                        aria-hidden
                      />{" "}
                      Към посещение
                    </a>
                  ) : null}
                </div>
                <ul className="text-muted-foreground ml-5 list-disc">
                  {[...(inv.parts ?? []), ...(inv.labor ?? [])].map((it, idx) => (
                    <li key={idx} className="truncate">
                      {it.name} × {it.quantity} —{" "}
                      {fmtNumberBG(it.price * it.quantity, {
                        style: "currency",
                        currency: APP_CURRENCY,
                      })}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2 sm:flex sm:flex-col sm:items-end sm:justify-between">
                <div className="hidden min-h-[44px] items-center text-right font-medium sm:flex sm:text-right">
                  Общо:{" "}
                  {fmtNumberBG(inv.totalAmount, {
                    style: "currency",
                    currency: APP_CURRENCY,
                  })}
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:mt-auto sm:flex-row sm:items-center sm:justify-end">
                  <div className="flex flex-wrap justify-start gap-2 sm:flex-1 sm:justify-end md:flex-none">
                    {inv.paid ? null : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={paidLoading === inv._id}
                        aria-label="Маркирай фактура като платена"
                        className="min-h-[36px] flex-1 sm:min-h-[44px] sm:flex-none"
                        onClick={async () => {
                          setPaidLoading(inv._id);
                          await markPaid({ id: inv._id });
                          setPaidLoading(null);
                          toast.success("Фактура маркирана като платена");
                          router.push("/");
                        }}
                      >
                        <CheckCircle
                          className="mr-1 size-3 sm:size-4"
                          aria-hidden
                        />{" "}
                        Маркирай платена
                      </Button>
                    )}
                    <InvoicePdfButton
                      inv={inv}
                      fileName={`invoice-${inv.code ?? String(inv._id)}.pdf`}
                      size="sm"
                      className="min-h-[36px] flex-1 sm:min-h-[44px] sm:flex-none"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Печат за фактура ${inv.code ?? String(inv._id)}`}
                      className="min-h-[36px] flex-1 sm:min-h-[44px] sm:flex-none"
                      onClick={() => {
                        printInvoice(inv);
                      }}
                    >
                      <Printer className="mr-1 size-3 sm:size-4" aria-hidden />{" "}
                      Печат
                    </Button>
                  </div>
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
          <ChevronLeft className="mr-1 size-4" aria-hidden />
          Назад
        </Button>
        <div className="text-muted-foreground text-sm">
          <span className="sm:hidden">
            {page + 1}/{totalPages}
          </span>
          <span className="hidden sm:inline">
            Страница {page + 1} от {totalPages}
          </span>
        </div>
        <Button
          variant="outline"
          onClick={() => setPage((p) => (invoices?.hasMore ? p + 1 : p))}
          disabled={!invoices?.hasMore}
        >
          Напред
          <ChevronRight className="ml-1 size-4" aria-hidden />
        </Button>
      </div>
    </main>
  );
}
