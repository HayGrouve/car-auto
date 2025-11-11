"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { OwnerDocSchema } from "@/types/owner";
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

export default function OwnerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"owners">;
  const ownerUnknown = useQuery(
    api.owners.getById,
    useMemo(() => ({ id }), [id]),
  ) as unknown;
  const update = useMutation(api.owners.update);
  const softDelete = useMutation(api.owners.softDelete);
  const setLegalHold = useMutation(api.owners.setLegalHold);
  const animals = useQuery(
    api.animals.listByOwner,
    useMemo(() => ({ ownerId: id }), [id]),
  ) as { _id: string; name: string; species: string }[] | undefined;
  const ownerUnpaidQuery = useQuery(
    api.invoices.list,
    useMemo(() => ({ ownerId: id, unpaidOnly: true }), [id]),
  );
  const ownerUnpaidResult = ownerUnpaidQuery as
    | { items: { total: number }[]; total: number; hasMore: boolean }
    | undefined;
  const ownerUnpaid = ownerUnpaidResult?.items;
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gdpr: false,
    legalHold: false,
  });
  const [hydrated, setHydrated] = useState(false);
  const parsed = OwnerDocSchema.safeParse(ownerUnknown);
  const owner = parsed.success ? parsed.data : null;

  useBreadcrumbRegistration(
    [
      { label: "Начало", href: "/" } satisfies BreadcrumbItem,
      { label: "Собственици", href: "/owners" } satisfies BreadcrumbItem,
      owner?.name
        ? ({
            id: String(id),
            label: owner.name,
            href: `/owners/${id}`,
            current: true,
          } satisfies BreadcrumbItem)
        : ({ label: "Собственик", current: true } satisfies BreadcrumbItem),
    ].filter(Boolean) as BreadcrumbItem[],
  );

  useEffect(() => {
    if (!hydrated && owner) {
      setForm({
        name: owner.name ?? "",
        phone: owner.phone ?? "",
        email: owner.email ?? "",
        address: owner.address ?? "",
        gdpr: !!owner.gdprConsent,
        legalHold: !!owner.legalHold,
      });
      setHydrated(true);
    }
  }, [owner, hydrated]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await update({
      id,
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      address: form.address || null,
      gdprConsent: form.gdpr,
    });
    if (res?.ok) {
      toast.success("Записът е обновен");
      router.push("/owners");
    }
  }

  if (!owner)
    return <main className="mx-auto max-w-3xl p-6">Зареждане...</main>;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold sm:text-2xl md:text-3xl">
          Собственик: {owner.name}
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
                const data = JSON.stringify(owner, null, 2);
                const blob = new Blob([data], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `owner-${owner._id}.json`;
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
                  "gdprConsent",
                  "createdAt",
                ].join(",");
                const row = [
                  owner._id,
                  owner.name ?? "",
                  owner.phone ?? "",
                  owner.email ?? "",
                  owner.address ?? "",
                  String(!!owner.gdprConsent),
                  new Date(owner.createdAt).toISOString(),
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
                a.download = `owner-${owner._id}.csv`;
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
                const html = `<!doctype html><html lang="bg"><head><meta charset="utf-8" /><title>Собственик ${owner.name}</title><style>body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px} h1{font-size:20px;margin:0 0 12px} table{border-collapse:collapse;width:100%} td{border:1px solid #ddd;padding:8px;vertical-align:top} .muted{color:#666}</style></head><body><h1>Данни за собственик</h1><table><tbody>
                <tr><td class="muted">ID</td><td>${owner._id}</td></tr>
                <tr><td class="muted">Име</td><td>${owner.name ?? ""}</td></tr>
                <tr><td class="muted">Телефон</td><td>${owner.phone ?? ""}</td></tr>
                <tr><td class="muted">Имейл</td><td>${owner.email ?? ""}</td></tr>
                <tr><td class="muted">Адрес</td><td>${owner.address ?? ""}</td></tr>
                <tr><td class="muted">Съгласие (GDPR)</td><td>${owner.gdprConsent ? "Да" : "Не"}</td></tr>
                <tr><td class="muted">Създаден</td><td>${new Date(owner.createdAt).toLocaleString()}</td></tr>
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
        {/* when owner has unpaid color it red */}
        <div
          className={`text-muted-foreground text-sm ${ownerUnpaid?.length && ownerUnpaid.length > 0 ? "font-medium text-red-500" : ""}`}
        >
          Неплатени общо:{" "}
          {fmtNumberBG(
            (ownerUnpaid ?? []).reduce((s: number, i) => s + (i.total ?? 0), 0),
            { style: "currency", currency: "BGN" },
          )}
        </div>
        <div>
          <a
            className="hover:bg-accent inline-flex items-center rounded-md border px-3 py-2 text-sm"
            href={`/invoices/new?ownerId=${encodeURIComponent(String(id))}`}
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
            Това действие ще скрие собственика от списъците (soft delete).
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
                  router.push("/owners");
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
        <h2 className="text-lg font-medium">Животни</h2>
        <div className="divide-y rounded-md border">
          {(animals ?? []).length === 0 ? (
            <div className="text-muted-foreground p-3 text-sm">
              Няма свързани животни
            </div>
          ) : (
            (animals ?? []).map((a) => (
              <div
                key={a._id}
                className="flex items-center justify-between p-3 text-sm"
              >
                <div>
                  <a
                    href={`/animals/${a._id}`}
                    className="underline underline-offset-2"
                  >
                    {a.name} ({a.species})
                  </a>
                </div>
                <div>
                  <a
                    href={`/visits?ownerId=${id}&animalId=${a._id}`}
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
      <OwnerInvoices ownerId={id} />
      <OwnerAuditLog ownerId={id} />
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Потвърдете изтриване</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Това действие ще скрие собственика от списъците (soft delete).
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
                  router.push("/owners");
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
    </main>
  );
}

type AuditLogEntry = {
  at?: number;
  action?: string;
  actor?: string;
  details?: unknown;
};
function OwnerAuditLog({ ownerId }: { ownerId: Id<"owners"> }) {
  const logs = useQuery(
    api.auditLogs.listByEntity,
    useMemo(
      () => ({ entityType: "owner", entityId: String(ownerId), limit: 10 }),
      [ownerId],
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

function OwnerInvoices({ ownerId }: { ownerId: Id<"owners"> }) {
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const router = useRouter();
  const invoicesQuery = useQuery(
    api.invoices.list,
    useMemo(() => ({ ownerId, unpaidOnly }), [ownerId, unpaidOnly]),
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
      if (inv.paid) acc.paid += inv.total;
      else acc.unpaid += inv.total;
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
                    {fmtNumberBG(inv.total, {
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
                  {inv.items.map((it, idx) => (
                    <li key={idx} className="truncate">
                      {it.description} × {it.quantity} —{" "}
                      {fmtNumberBG(it.total, {
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
                  {fmtNumberBG(inv.total, {
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
