"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";
import type { OwnerDoc } from "@/types/owner";
import { toast } from "sonner";
import { BackButton } from "@/components/back-button";

export default function OwnersPage() {
  const [search, setSearch] = useState("");
  const owners = useQuery(api.owners.list, useMemo(() => ({ search }), [search])) as OwnerDoc[] | undefined;
  const createOwner = useMutation(api.owners.create);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = (fd.get("name") ?? "") as string;
    const phone = (fd.get("phone") ?? "") as string;
    const email = (fd.get("email") ?? undefined) as string | undefined;
    const address = (fd.get("address") ?? undefined) as string | undefined;
    const gdprConsent = (fd.get("gdpr") ?? "") === "on";
    const res = (await createOwner({ name, phone, email, address, gdprConsent })) as
      | { ok: true; id: string }
      | { ok: false; reason: "phone" | "email" };
    if (!res?.ok) {
      toast.error(res?.reason === "phone" ? "Има собственик с този телефон" : "Има собственик с този имейл");
      return;
    }
    form.reset();
    toast.success("Собственикът е добавен успешно");
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-2xl font-semibold">{brand.nameBg}: Собственици</h1>
      </div>
      <div className="flex gap-2 items-center">
        <input
          placeholder="Търсене по име, телефон, имейл"
          className="border rounded-md px-3 h-10 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <input name="name" placeholder="Име" className="border rounded-md px-3 h-10 md:col-span-1" required />
        <input name="phone" placeholder="Телефон" className="border rounded-md px-3 h-10 md:col-span-1" required />
        <input name="email" placeholder="Имейл" className="border rounded-md px-3 h-10 md:col-span-1" />
        <input name="address" placeholder="Адрес" className="border rounded-md px-3 h-10 md:col-span-1" />
        <label className="flex items-center gap-2 md:col-span-1">
          <input type="checkbox" name="gdpr" />
          <span className="text-sm">Съгласие (GDPR)</span>
        </label>
        <div className="md:col-span-5">
          <Button type="submit">Добави собственик</Button>
        </div>
      </form>
      <div className="border rounded-md divide-y">
        {(owners ?? []).map((o) => (
          <div key={o._id} className="p-3 flex justify-between text-sm">
            <div>
              <div className="font-medium">{o.name}</div>
              <div className="text-muted-foreground">{o.phone}{o.email ? ` · ${o.email}` : ""}</div>
            </div>
            <div>{new Date(o.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </main>
  );
}


