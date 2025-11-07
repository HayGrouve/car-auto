"use client";
import { useMemo, useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { fmtDateTimeBG, fmtNumberBG } from "@/lib/format";
import InvoicePdfButton from "@/components/pdf/InvoicePdfButton";
// import dynamic from "next/dynamic";
// const InvoicePdf = dynamic(() => import("@/components/pdf/InvoicePdf"), { ssr: false });
import type { InvoiceDoc } from "@/types/visit";
import { printInvoice } from "@/lib/printInvoice";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";

export default function InvoiceDetailPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl p-6">Зареждане...</main>}>
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
  const list = useQuery(
    api.invoices.list,
    useMemo(() => ({}), []),
  ) as { code?: string }[] | undefined;
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
        <h1 className="text-2xl font-semibold">Фактура: {inv.code}</h1>
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
                  router.push("/");
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
