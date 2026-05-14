"use client";
import Link from "next/link";
import { useMemo, useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { fmtDateTimeBG, fmtNumberBG, APP_CURRENCY } from "@/lib/format";
import dynamic from "next/dynamic";
import { Printer, CheckCircle } from "lucide-react";
// import dynamic from "next/dynamic";
// const InvoicePdf = dynamic(() => import("@/components/pdf/InvoicePdf"), { ssr: false });
import type { InvoiceDoc } from "@/types/visit";
import { printInvoice } from "@/lib/printInvoice";
import { invoiceGrandTotal } from "@/lib/invoice-totals";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";

// Lazy load PDF button component
const InvoicePdfButton = dynamic(
  () => import("@/components/pdf/InvoicePdfButton"),
  { ssr: false },
);

export default function InvoiceDetailPage() {
  return (
    <Suspense
      fallback={<main className="mx-auto max-w-3xl p-6">Зареждане...</main>}
    >
      <InvoiceDetailPageContent />
    </Suspense>
  );
}

function InvoiceDetailPageContent() {
  const params = useParams<{ id: string }>();
  const raw = params.id;
  // Support either Convex _id or human code in the URL param
  const byId =
    raw?.startsWith("inv_") || (/^\w{15,}$/i.exec(raw ?? "") ? true : false)
      ? (raw as Id<"invoices">)
      : undefined;
  const invById = useQuery(
    api.invoices.getById,
    useMemo(() => (byId ? { id: byId } : "skip"), [byId]),
  ) as InvoiceDoc | undefined;
  const listQuery = useQuery(
    api.invoices.list,
    useMemo(() => ({}), []),
  );
  const listResult = listQuery as
    | { items: { code?: string }[]; total: number; hasMore: boolean }
    | undefined;
  const list = listResult?.items;
  const inv = useMemo(() => {
    if (invById) return invById;
    if (!list) return undefined;
    return list.find((i) => String(i.code ?? "") === String(raw ?? ""));
  }, [invById, list, raw]) as InvoiceDoc | undefined;
  const markPaid = useMutation(api.invoices.markPaid) as unknown as (args: {
    id: string;
  }) => Promise<{ ok: boolean }>;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Handle auto-mark as paid from query param
  useEffect(() => {
    const payParam = searchParams.get("pay");
    if (payParam === "true" && inv && !inv.paid && !loading) {
      const handleAutoPay = async () => {
        setLoading(true);
        await markPaid({ id: inv._id });
        setLoading(false);
        router.push("/");
      };
      void handleAutoPay();
    }
  }, [searchParams, inv, loading, markPaid, router]);

  useBreadcrumbRegistration(
    [
      { label: "Начало", href: "/" } satisfies BreadcrumbItem,
      { label: "Фактури", href: "/invoices" } satisfies BreadcrumbItem,
      inv?.code
        ? ({
            id: String(raw ?? inv._id),
            label: inv.code,
            href: `/invoices/${encodeURIComponent(String(raw ?? inv._id))}`,
            current: true,
          } satisfies BreadcrumbItem)
        : ({ label: "Фактура", current: true } satisfies BreadcrumbItem),
    ].filter(Boolean) as BreadcrumbItem[],
  );

  if (!inv) return <main className="mx-auto max-w-3xl p-6">Зареждане...</main>;

  function onPrint() {
    if (!inv) return;
    printInvoice(inv);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold sm:text-2xl md:text-3xl">
          Фактура: {inv.code}
        </h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Назад
          </Button>
        </div>
      </div>
      <div className="divide-y rounded-md border">
        <div className="flex flex-col gap-4 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="font-medium">
              {inv.code ?? `#${String(inv._id)}`} ·{" "}
              {fmtDateTimeBG(inv.createdAt)}
            </div>
            <div className="text-muted-foreground">
              {inv.paid
                ? `Платена${inv.paidAt ? ` · ${fmtDateTimeBG(inv.paidAt)}` : ""}`
                : "Неплатена"}
            </div>
            {inv.visitId ? (
              <div className="pt-1">
                <Link
                  href={`/visits/${inv.visitId}`}
                  className="text-primary font-medium underline underline-offset-2 hover:no-underline"
                >
                  Към посещението
                </Link>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {inv.paid ? null : (
              <Button
                variant="outline"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  await markPaid({ id: inv._id });
                  setLoading(false);
                  router.push("/");
                }}
                className="min-h-[44px] w-full sm:w-auto sm:flex-none"
              >
                <CheckCircle className="mr-1 size-4" aria-hidden /> Маркирай
                платена
              </Button>
            )}
            <InvoicePdfButton
              inv={inv}
              fileName={`invoice-${inv.code ?? String(inv._id)}.pdf`}
              size="default"
              className="min-h-[44px] w-full sm:w-auto sm:flex-none"
            />
            <Button
              variant="outline"
              onClick={onPrint}
              className="min-h-[44px] w-full sm:w-auto sm:flex-none"
            >
              <Printer className="mr-1 size-4" aria-hidden /> Печат
            </Button>
          </div>
        </div>
        <div className="p-3">
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            <h3 className="font-semibold px-1">Части</h3>
            {(inv.parts ?? []).map((it, idx) => (
              <div
                key={`part-${idx}`}
                className="flex flex-col gap-2 rounded-md border p-3"
              >
                <div className="font-medium">{it.name}</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Кол-во: {it.quantity}
                  </span>
                  <span className="text-muted-foreground">
                    Цена:{" "}
                    {fmtNumberBG(it.price, {
                      style: "currency",
                      currency: APP_CURRENCY,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 font-medium">
                  <span>Сума:</span>
                  <span>
                    {fmtNumberBG(it.price * it.quantity, {
                      style: "currency",
                      currency: APP_CURRENCY,
                    })}
                  </span>
                </div>
              </div>
            ))}
            <h3 className="font-semibold px-1 mt-4">Труд/Услуги</h3>
            {(inv.labor ?? []).map((it, idx) => (
              <div
                key={`labor-${idx}`}
                className="flex flex-col gap-2 rounded-md border p-3"
              >
                <div className="font-medium">{it.name}</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Кол-во: {it.quantity}
                  </span>
                  <span className="text-muted-foreground">
                    Цена:{" "}
                    {fmtNumberBG(it.price, {
                      style: "currency",
                      currency: APP_CURRENCY,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 font-medium">
                  <span>Сума:</span>
                  <span>
                    {fmtNumberBG(it.price * it.quantity, {
                      style: "currency",
                      currency: APP_CURRENCY,
                    })}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-end gap-2 border-t pt-3 font-medium">
              <span>Общо:</span>
              <span>
                {fmtNumberBG(invoiceGrandTotal(inv), {
                  style: "currency",
                  currency: APP_CURRENCY,
                })}
              </span>
            </div>
          </div>

          {/* Desktop table view */}
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr>
                <th className="text-left">Описание</th>
                <th className="text-right">Кол-во</th>
                <th className="text-right">Цена</th>
                <th className="text-right">Сума</th>
              </tr>
            </thead>
            <tbody>
              {((inv.parts ?? []).length > 0) && (
                <tr>
                  <td colSpan={4} className="py-2 font-semibold bg-muted/50 px-2">Части</td>
                </tr>
              )}
              {(inv.parts ?? []).map((it, idx) => (
                <tr key={`part-${idx}`}>
                  <td className="py-2 px-2">{it.name}</td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">
                    {fmtNumberBG(it.price, {
                      style: "currency",
                      currency: APP_CURRENCY,
                    })}
                  </td>
                  <td className="py-2 text-right">
                    {fmtNumberBG(it.price * it.quantity, {
                      style: "currency",
                      currency: APP_CURRENCY,
                    })}
                  </td>
                </tr>
              ))}
              {((inv.labor ?? []).length > 0) && (
                <tr>
                  <td colSpan={4} className="py-2 font-semibold bg-muted/50 px-2 mt-2">Труд/Услуги</td>
                </tr>
              )}
              {(inv.labor ?? []).map((it, idx) => (
                <tr key={`labor-${idx}`}>
                  <td className="py-2 px-2">{it.name}</td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">
                    {fmtNumberBG(it.price, {
                      style: "currency",
                      currency: APP_CURRENCY,
                    })}
                  </td>
                  <td className="py-2 text-right">
                    {fmtNumberBG(it.price * it.quantity, {
                      style: "currency",
                      currency: APP_CURRENCY,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="py-2 text-right font-medium">
                  <span className="inline-flex flex-wrap items-baseline justify-end gap-x-2">
                    <span>Общо:</span>
                    <span>
                      {fmtNumberBG(invoiceGrandTotal(inv), {
                        style: "currency",
                        currency: APP_CURRENCY,
                      })}
                    </span>
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </main>
  );
}
