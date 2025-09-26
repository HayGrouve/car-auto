"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { brand } from "@/lib/brand";
import { User as UserIcon, ShieldCheck, Phone as PhoneIcon, Mail as MailIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { OwnerDoc } from "@/types/owner";
import { toast } from "sonner";

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
        <div className="md:col-span-1">
          <Label htmlFor="name">Име</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="md:col-span-1">
          <Label htmlFor="phone">Телефон</Label>
          <Input id="phone" name="phone" required />
        </div>
        <div className="md:col-span-1">
          <Label htmlFor="email">Имейл</Label>
          <Input id="email" name="email" />
        </div>
        <div className="md:col-span-1">
          <Label htmlFor="address">Адрес</Label>
          <Input id="address" name="address" />
        </div>
        <label className="flex items-center gap-2 md:col-span-1">
          <Checkbox name="gdpr" />
          <span className="text-sm inline-flex items-center gap-1">Съгласие (GDPR)</span>
        </label>
        <div className="md:col-span-5">
          <Button type="submit">Добави собственик</Button>
        </div>
      </form>
      <div className="border rounded-md divide-y">
        {(owners ?? []).map((o) => (
          <div key={o._id} className="p-3 flex justify-between items-center text-sm">
            <div className="flex items-center gap-3">
              <UserIcon className="size-5 text-primary" aria-hidden />
              <div>
                <a href={`/owners/${o._id}`} className="font-medium underline-offset-2 hover:underline">{o.name}</a>
                <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1"><PhoneIcon className="size-4" />{o.phone}</span>
                  {o.email ? <span className="inline-flex items-center gap-1"><MailIcon className="size-4" />{o.email}</span> : null}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {o.gdprConsent ? <ShieldCheck className="size-4 text-secondary" aria-label="GDPR" /> : null}
              <span className="text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}


