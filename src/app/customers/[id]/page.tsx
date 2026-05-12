"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { CustomerDocSchema } from "@/types/customer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { fmtDateTimeBG, fmtNumberBG } from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/StatusBadge";
import {
  FileText,
  Printer,
  CheckCircle,
  ExternalLink,
  MoreHorizontal,
  FileJson,
  Trash2,
  Undo2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { printInvoice } from "@/lib/printInvoice";
import type { InvoiceDoc } from "@/types/visit";

// Lazy load PDF button component
const InvoicePdfButton = dynamic(
  () => import("@/components/pdf/InvoicePdfButton"),
  { ssr: false },
);
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"customers">;
  const customerUnknown = useQuery(
    api.customers.getById,
    useMemo(() => ({ id }), [id]),
  ) as unknown;
  const update = useMutation(api.customers.update);
  const softDelete = useMutation(api.customers.softDelete);
  const setLegalHold = useMutation(api.customers.setLegalHold);
  const vehicles = useQuery(
    api.vehicles.listByCustomer,
    useMemo(() => ({ customerId: id }), [id]),
  ) as { _id: string; licensePlate: string; make: string }[] | undefined;
  const customerUnpaidQuery = useQuery(
    api.invoices.list,
    useMemo(() => ({ customerId: id, unpaidOnly: true }), [id]),
  );
  const customerUnpaidResult = customerUnpaidQuery as
    | { items: Pick<InvoiceDoc, "totalAmount">[]; total: number; hasMore: boolean }
    | undefined;
  const customerUnpaid = customerUnpaidResult?.items;
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    gdpr: false,
    legalHold: false,
  });
  const [hydrated, setHydrated] = useState(false);
  const parsed = CustomerDocSchema.safeParse(customerUnknown);
  const customer = parsed.success ? parsed.data : null;

  useBreadcrumbRegistration(
    [
      { label: "Начало", href: "/" } satisfies BreadcrumbItem,
      { label: "Клиенти", href: "/customers" } satisfies BreadcrumbItem,
      customer?.name
        ? ({
            id: String(id),
            label: customer.name,
            href: `/customers/${id}`,
            current: true,
          } satisfies BreadcrumbItem)
        : ({ label: "Клиент", current: true } satisfies BreadcrumbItem),
    ].filter(Boolean) as BreadcrumbItem[],
  );

  useEffect(() => {
    if (!hydrated && customer) {
      setForm({
        name: customer.name ?? "",
        phone: customer.phone ?? "",
        email: customer.email ?? "",
        address: customer.address ?? "",
        notes: customer.notes ?? "",
        gdpr: !!customer.gdprConsent,
        legalHold: !!customer.legalHold,
      });
      setHydrated(true);
    }
  }, [customer, hydrated]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await update({
      id,
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
      gdprConsent: form.gdpr,
    });
    if (res?.ok) {
      toast.success("Записът е обновен");
      router.push("/customers");
    }
  }

  if (!customer)
    return <main className="mx-auto max-w-3xl p-6">Зареждане...</main>;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold sm:text-2xl md:text-3xl">
          Клиент: {customer.name}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Още действия</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              className="gap-2"
              onSelect={() => {
                const data = JSON.stringify(customer, null, 2);
                const blob = new Blob([data], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `customer-${customer._id}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <FileJson className="h-4 w-4" /> Експорт JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onSelect={() => {
                const header = [
                  "id",
                  "name",
                  "phone",
                  "email",
                  "address",
                  "notes",
                  "gdprConsent",
                  "createdAt",
                ].join(",");
                const row = [
                  customer._id,
                  customer.name ?? "",
                  customer.phone ?? "",
                  customer.email ?? "",
                  customer.address ?? "",
                  customer.notes ?? "",
                  String(!!customer.gdprConsent),
                  new Date(customer.createdAt).toISOString(),
                ]
                  .map((v: unknown) => `"${String(v).replace(/"/g, '""')}"`)
                  .join(",");
                const csv = header + "\n" + row + "\n";
                const blob = new Blob([csv], {
                  type: "text/csv;charset=utf-8;",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `customer-${customer._id}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <FileText className="h-4 w-4" /> Експорт CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onSelect={() => {
                const w = window.open("", "_blank", "noopener,noreferrer");
                if (!w) return;
                const html = `<!doctype html><html lang="bg"><head><meta charset="utf-8" /><title>Клиент ${customer.name}</title><style>body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px} h1{font-size:20px;margin:0 0 12px} table{border-collapse:collapse;width:100%} td{border:1px solid #ddd;padding:8px;vertical-align:top} .muted{color:#666}</style></head><body><h1>Данни за клиент</h1><table><tbody>
                <tr><td class="muted">ID</td><td>${customer._id}</td></tr>
                <tr><td class="muted">Име</td><td>${customer.name ?? ""}</td></tr>
                <tr><td class="muted">Телефон</td><td>${customer.phone ?? ""}</td></tr>
                <tr><td class="muted">Имейл</td><td>${customer.email ?? ""}</td></tr>
                <tr><td class="muted">Адрес</td><td>${customer.address ?? ""}</td></tr>
                <tr><td class="muted">Бележки</td><td>${customer.notes ?? ""}</td></tr>
                <tr><td class="muted">Съгласие (GDPR)</td><td>${customer.gdprConsent ? "Да" : "Не"}</td></tr>
                <tr><td class="muted">Създаден</td><td>${new Date(customer.createdAt).toLocaleString()}</td></tr>
              </tbody></table><script>window.onload = () => window.print()</script></body></html>`;
                w.document.open();
                w.document.write(html);
                w.document.close();
              }}
            >
              <Printer className="h-4 w-4" /> Печат (PDF)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onSelect={() => router.back()}>
              <Undo2 className="h-4 w-4" /> Назад
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive gap-2"
              onSelect={() => setShowDelete(true)}
            >
              <Trash2 className="h-4 w-4" /> Изтрий (GDPR)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center justify-between">
        <div
          className={`text-muted-foreground text-sm ${customerUnpaid?.length && customerUnpaid.length > 0 ? "font-medium text-red-500" : ""}`}
        >
          Неплатени общо:{" "}
          {fmtNumberBG(
            (customerUnpaid ?? []).reduce(
              (s: number, i) => s + (i.totalAmount ?? 0),
              0,
            ),
            { style: "currency", currency: "BGN" },
          )}
        </div>
        <div>
          <a
            className="hover:bg-accent inline-flex items-center rounded-md border px-3 py-2 text-sm"
            href={`/invoices/new?customerId=${encodeURIComponent(String(id))}`}
          >
            Нова фактура
          </a>
        </div>
      </div>
      <p className="text-muted-foreground text-sm">
        Прочетете нашата{" "}
        <Link
          className="cursor-pointer underline underline-offset-2"
          href="/privacy"
        >
          политика за поверителност
        </Link>
        .
      </p>
      <form onSubmit={onSave} className="grid gap-3">
        <div>
          <Label htmlFor="name">Име</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="phone">Телефон</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="email">Имейл</Label>
          <Input
            id="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="address">Адрес</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="notes">Бележки</Label>
          <Input
            id="notes"
            value={form.notes}
            onChange={(e) =>
              setForm((f) => ({ ...f, notes: e.target.value }))
            }
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={form.gdpr}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, gdpr: Boolean(checked) }))
              }
            />
            <span className="text-sm">Съгласие (GDPR)</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={form.legalHold}
              onCheckedChange={async (checked) => {
                const next = Boolean(checked);
                setForm((f) => ({ ...f, legalHold: next }));
                const res = (await setLegalHold({ id, legalHold: next })) as {
                  ok: boolean;
                };
                if (res.ok)
                  toast.success(
                    next ? "Правен запор активиран" : "Правен запор изключен",
                  );
              }}
            />
            <span className="text-sm">Правен запор (Legal Hold)</span>
          </label>
        </div>
        <div className="flex justify-end">
          <Button type="submit">Запази</Button>
        </div>
      </form>
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Потвърдете изтриване</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Това действие ще скрие клиента от списъците (soft delete).
            Данните няма да са видими в UI. Ако е активиран правен запор,
            изтриването е блокирано.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Отказ
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const r = (await softDelete({ id })) as
                  | { ok: boolean }
                  | { ok: false; reason?: string };
                if ("ok" in r && r.ok) {
                  toast.success("Изтрито");
                  router.push("/customers");
                } else {
                  toast.error("Не може да се изтрие поради правен запор");
                }
                setShowDelete(false);
              }}
            >
              Потвърди
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Автомобили</h2>
        <div className="divide-y rounded-md border">
          {(vehicles ?? []).length === 0 ? (
            <div className="text-muted-foreground p-3 text-sm">
              Няма свързани автомобили
            </div>
          ) : (
            (vehicles ?? []).map((a) => (
              <div
                key={a._id}
                className="flex items-center justify-between p-3 text-sm"
              >
                <div>
                  <a
                    href={`/vehicles/${a._id}`}
                    className="underline underline-offset-2"
                  >
                    {a.licensePlate} ({a.make})
                  </a>
                </div>
                <div>
                  <a
                    href={`/visits?customerId=${id}&vehicleId=${a._id}`}
                    className="text-primary underline underline-offset-2"
                  >
                    Ново посещение
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <CustomerInvoices customerId={id} />
      <CustomerAuditLog customerId={id} />
    </main>
  );
}

type AuditLogEntry = {
  at?: number;
  action?: string;
  actor?: string;
  details?: unknown;
};
function CustomerAuditLog({ customerId }: { customerId: Id<"customers"> }) {
  const logs = useQuery(
    api.auditLogs.listByEntity,
    useMemo(
      () => ({ entityType: "customer", entityId: String(customerId), limit: 10 }),
      [customerId],
    ),
  ) as AuditLogEntry[] | undefined;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium">Аудит лог</h2>
      <div className="divide-y rounded-md border">
        {(logs ?? []).length === 0 ? (
          <div className="text-muted-foreground p-3 text-sm">Няма записи</div>
        ) : (
          (logs ?? []).map((l, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 text-sm"
            >
              <div className="space-y-0.5">
                <div className="font-medium">{l.action ?? "действие"}</div>
                <div className="text-muted-foreground">
                  {l.actor ?? "system"}
                </div>
              </div>
              <div className="text-muted-foreground">
                {l.at ? fmtDateTimeBG(l.at) : ""}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function CustomerInvoices({ customerId }: { customerId: Id<"customers"> }) {
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const router = useRouter();
  const invoicesQuery = useQuery(
    api.invoices.list,
    useMemo(() => ({ customerId, unpaidOnly }), [customerId, unpaidOnly]),
  );
  const invoicesResult = invoicesQuery as
    | {
        items: InvoiceDoc[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const invoices = invoicesResult?.items;
  const markPaid = useMutation(api.invoices.markPaid) as unknown as (args: {
    id: string;
  }) => Promise<{ ok: boolean }>;
  const [paidLoading, setPaidLoading] = useState<string | null>(null);
  const totals = (invoices ?? []).reduce(
    (acc, inv) => {
      if (inv.paid) acc.paid += inv.totalAmount;
      else acc.unpaid += inv.totalAmount;
      return acc;
    },
    { paid: 0, unpaid: 0 },
  );
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Фактури</h2>
        <div className="text-muted-foreground flex items-center gap-3 text-sm">
          <span>
            Неплатени:{" "}
            {fmtNumberBG(totals.unpaid, { style: "currency", currency: "BGN" })}
          </span>
          <span>
            Платени:{" "}
            {fmtNumberBG(totals.paid, { style: "currency", currency: "BGN" })}
          </span>
          <label className="inline-flex items-center gap-2">
            <Checkbox
              checked={unpaidOnly}
              onCheckedChange={(checked) => setUnpaidOnly(Boolean(checked))}
            />
            Само неплатени
          </label>
        </div>
      </div>
      <div className="divide-y rounded-md border">
        {(invoices ?? []).length === 0 ? (
          <div className="text-muted-foreground p-3 text-sm">Няма фактури</div>
        ) : (
          (invoices ?? []).map((inv) => (
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
                      currency: "BGN",
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
                  {inv.parts?.map((it, idx) => (
                    <li key={`p-${idx}`} className="truncate">
                      {it.name} × {it.quantity} —{" "}
                      {fmtNumberBG(it.price * it.quantity, {
                        style: "currency",
                        currency: "BGN",
                      })}
                    </li>
                  ))}
                  {inv.labor?.map((it, idx) => (
                    <li key={`l-${idx}`} className="truncate">
                      {it.name} × {it.quantity} —{" "}
                      {fmtNumberBG(it.price * it.quantity, {
                        style: "currency",
                        currency: "BGN",
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
                    currency: "BGN",
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
                          const r = await markPaid({ id: inv._id });
                          setPaidLoading(null);
                          if (r?.ok) {
                            toast.success("Фактура маркирана като платена");
                            router.push("/");
                          }
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
    </section>
  );
}
