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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import Link from "next/link";

export default function OwnerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"owners">;
  const ownerUnknown = useQuery(api.owners.getById, useMemo(() => ({ id }), [id])) as unknown;
  const update = useMutation(api.owners.update);
  const softDelete = useMutation(api.owners.softDelete);
  const setLegalHold = useMutation(api.owners.setLegalHold) as unknown as (args: { id: string; legalHold: boolean }) => Promise<{ ok: boolean }>;
  const animals = useQuery(api.animals.listByOwner, useMemo(() => ({ ownerId: id }), [id])) as { _id: string; name: string; species: string }[] | undefined;
  const router = useRouter();

  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", gdpr: false, legalHold: false });
  const [hydrated, setHydrated] = useState(false);
  const parsed = OwnerDocSchema.safeParse(ownerUnknown);
  const owner = parsed.success ? parsed.data : null;

  useEffect(() => {
    if (!hydrated && owner) {
      setForm({ name: owner.name ?? "", phone: owner.phone ?? "", email: owner.email ?? "", address: owner.address ?? "", gdpr: !!owner.gdprConsent, legalHold: !!owner.legalHold });
      setHydrated(true);
    }
  }, [owner, hydrated]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await update({ id, name: form.name, phone: form.phone, email: form.email || null, address: form.address || null, gdprConsent: form.gdpr });
    if (res?.ok) {
      toast.success("Записът е обновен");
      router.push("/owners");
    }
  }

  if (!owner) return <main className="p-6 max-w-3xl mx-auto">Зареждане...</main>;

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{brand.nameBg}: Собственик</h1>
      <p className="text-sm text-muted-foreground">
        Прочетете нашата <Link className="underline underline-offset-2" href="/privacy">политика за поверителност</Link>.
      </p>
      <form onSubmit={onSave} className="grid gap-3">
        <div>
          <Label htmlFor="name">Име</Label>
          <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="phone">Телефон</Label>
          <Input id="phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="email">Имейл</Label>
          <Input id="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="address">Адрес</Label>
          <Input id="address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
        </div>
        <label className="flex items-center gap-2">
          <Checkbox checked={form.gdpr} onCheckedChange={(checked) => setForm((f) => ({ ...f, gdpr: Boolean(checked) }))} />
          <span className="text-sm">Съгласие (GDPR)</span>
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={form.legalHold}
            onCheckedChange={async (checked) => {
              const next = Boolean(checked);
              setForm((f) => ({ ...f, legalHold: next }));
              const r = await setLegalHold({ id, legalHold: next });
              if (r?.ok) toast.success(next ? "Правен запор активиран" : "Правен запор изключен");
            }}
          />
          <span className="text-sm">Правен запор (Legal Hold)</span>
        </label>
        <div className="flex gap-2">
          <Button type="submit">Запази</Button>
          <Button type="button" variant="secondary" onClick={() => {
            const data = JSON.stringify(owner, null, 2);
            const blob = new Blob([data], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `owner-${owner._id}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}>Експорт JSON</Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="destructive">Изтрий (GDPR)</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Потвърдете изтриване</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Това действие ще скрие собственика от списъците (soft delete). Данните няма да са видими в UI. Ако е активиран правен запор, изтриването е блокирано.</p>
              <DialogFooter>
                <Button variant="ghost">Отказ</Button>
                <Button variant="destructive" onClick={async () => { const r = await softDelete({ id }); if (r?.ok) { toast.success("Изтрито"); router.push("/owners"); } else { toast.error("Не може да се изтрие поради правен запор"); } }}>Потвърди</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button type="button" variant="outline" onClick={() => router.back()}>Назад</Button>
        </div>
      </form>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Животни</h2>
        <div className="border rounded-md divide-y">
          {(animals ?? []).length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">Няма свързани животни</div>
          ) : (
            (animals ?? []).map((a) => (
              <div key={a._id} className="p-3 flex justify-between items-center text-sm">
                <div>
                  <a href={`/animals/${a._id}`} className="underline underline-offset-2">{a.name} ({a.species})</a>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}


