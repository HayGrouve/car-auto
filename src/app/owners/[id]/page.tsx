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
import { brand } from "@/lib/brand";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { fmtDateTimeBG, fmtNumberBG } from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/StatusBadge";

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
  const ownerUnpaid = useQuery(
    api.invoices.list,
    useMemo(() => ({ ownerId: id, unpaidOnly: true }), [id]),
  ) as { total: number }[] | undefined;
  const router = useRouter();

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
      <h1 className="text-2xl font-semibold">{brand.nameBg}: Собственик</h1>
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
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
        <Link className="underline underline-offset-2" href="/privacy">
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
        <div className="flex gap-2">
          <Button type="submit">Запази</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
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
            Експорт JSON
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
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
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `owner-${owner._id}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Експорт CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const w = window.open("", "_blank", "noopener,noreferrer");
              if (!w) return;
              const html = `<!doctype html><html lang=\"bg\"><head><meta charset=\"utf-8\" /><title>Собственик ${owner.name}</title><style>body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px} h1{font-size:20px;margin:0 0 12px} table{border-collapse:collapse;width:100%} td{border:1px solid #ddd;padding:8px;vertical-align:top} .muted{color:#666}</style></head><body><h1>Данни за собственик</h1><table><tbody>
              <tr><td class=\"muted\">ID</td><td>${owner._id}</td></tr>
              <tr><td class=\"muted\">Име</td><td>${owner.name ?? ""}</td></tr>
              <tr><td class=\"muted\">Телефон</td><td>${owner.phone ?? ""}</td></tr>
              <tr><td class=\"muted\">Имейл</td><td>${owner.email ?? ""}</td></tr>
              <tr><td class=\"muted\">Адрес</td><td>${owner.address ?? ""}</td></tr>
              <tr><td class=\"muted\">Съгласие (GDPR)</td><td>${owner.gdprConsent ? "Да" : "Не"}</td></tr>
              <tr><td class=\"muted\">Създаден</td><td>${new Date(owner.createdAt).toLocaleString()}</td></tr>
            </tbody></table><script>window.onload = () => window.print()</script></body></html>`;
              w.document.open();
              w.document.write(html);
              w.document.close();
            }}
          >
            Печат (PDF)
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="destructive">
                Изтрий (GDPR)
              </Button>
            </DialogTrigger>
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
                <Button variant="outline">Отказ</Button>
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
                  }}
                >
                  Потвърди
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Назад
          </Button>
        </div>
      </form>
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
      <OwnerAuditLog ownerId={id} />
      <OwnerInvoices ownerId={id} />
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
  const invoices = useQuery(
    api.invoices.list,
    useMemo(() => ({ ownerId, unpaidOnly }), [ownerId, unpaidOnly]),
  ) as
    | {
        _id: string;
        code?: string;
        total: number;
        paid?: boolean;
        paidAt?: number | null;
        createdAt: number;
      }[]
    | undefined;
  const markPaid = useMutation(api.invoices.markPaid) as unknown as (args: {
    id: string;
  }) => Promise<{ ok: boolean }>;
  const [loading, setLoading] = useState<string | null>(null);
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
            <input
              type="checkbox"
              checked={unpaidOnly}
              onChange={(e) => setUnpaidOnly(e.target.checked)}
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
              className="grid items-center gap-3 p-3 text-sm md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto]"
            >
              <div>
                <div className="font-medium">
                  <a
                    href={`/invoices/${inv._id}`}
                    className="underline underline-offset-2 hover:underline"
                  >
                    {inv.code ?? `#${String(inv._id)}`}
                  </a>{" "}
                  · {fmtDateTimeBG(inv.createdAt)}
                </div>
                <div className="text-muted-foreground text-xs">
                  <InvoiceStatusBadge
                    paid={inv.paid}
                    paidAt={inv.paidAt ?? null}
                  />
                </div>
              </div>
              <div className="text-right font-medium md:text-right">
                {fmtNumberBG(inv.total, { style: "currency", currency: "BGN" })}
              </div>
              <div className="text-right md:justify-self-end">
                {inv.paid ? null : (
                  <Button
                    variant="outline"
                    disabled={loading === inv._id}
                    className="whitespace-nowrap"
                    onClick={async () => {
                      setLoading(inv._id);
                      const r = await markPaid({ id: inv._id });
                      setLoading(null);
                      if (r?.ok)
                        toast.success("Фактура маркирана като платена");
                    }}
                  >
                    Маркирай платена
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
