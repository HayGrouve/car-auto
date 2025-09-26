"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

export default function OwnerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"owners">;
  const ownerUnknown = useQuery(api.owners.getById, useMemo(() => ({ id }), [id])) as unknown;
  const update = useMutation(api.owners.update);
  const router = useRouter();

  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", gdpr: false });

  useEffect(() => {
    const parsed = OwnerDocSchema.safeParse(ownerUnknown);
    if (parsed.success) {
      const o = parsed.data;
      setForm({
        name: o.name ?? "",
        phone: o.phone ?? "",
        email: o.email ?? "",
        address: o.address ?? "",
        gdpr: !!o.gdprConsent,
      });
    }
  }, [ownerUnknown]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await update({ id, name: form.name, phone: form.phone, email: form.email || null, address: form.address || null, gdprConsent: form.gdpr });
    if (res?.ok) {
      toast.success("Записът е обновен");
      router.push("/owners");
    }
  }

  const hasOwner = OwnerDocSchema.safeParse(ownerUnknown).success;
  if (!hasOwner) return <main className="p-6 max-w-3xl mx-auto">Зареждане...</main>;

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{brand.nameBg}: Собственик</h1>
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
        <div className="flex gap-2">
          <Button type="submit">Запази</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Назад</Button>
        </div>
      </form>
    </main>
  );
}


