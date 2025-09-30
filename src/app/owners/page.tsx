"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { brand } from "@/lib/brand";
import { User as UserIcon, ShieldCheck, Phone as PhoneIcon, Mail as MailIcon, Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { OwnerDoc } from "@/types/owner";
import { toast } from "sonner";
import { fmtDateTimeBG } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";
import { SkeletonList } from "@/components/SkeletonList";

export default function OwnersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [sort, setSort] = useState<"createdAtDesc" | "createdAtAsc">("createdAtDesc");
  const owners = useQuery(
    api.owners.list,
    useMemo(() => ({ search, limit: pageSize, offset: page * pageSize, sort }), [search, page, sort])
  ) as OwnerDoc[] | undefined;
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
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <select className="border rounded-md h-10 px-3" value={sort} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSort(e.target.value as "createdAtDesc" | "createdAtAsc"); setPage(0); }}>
          <option value="createdAtDesc">Най-нови</option>
          <option value="createdAtAsc">Най-стари</option>
        </select>
      </div>
      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <div className="md:col-span-1">
          <Label htmlFor="name">Име</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="md:col-span-1">
          <Label htmlFor="phone">Телефон</Label>
          <Input id="phone" name="phone" required aria-describedby="phone-help" />
          <span id="phone-help" className="sr-only">Въведете телефонния номер във формат 08xx xxx xxx</span>
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
          <a href="/privacy" className="text-xs text-muted-foreground underline underline-offset-2">Политика</a>
        </label>
        <div className="md:col-span-5">
          <Button type="submit">Добави собственик</Button>
        </div>
      </form>
      <div className="border rounded-md divide-y">
        {owners === undefined ? (
          <SkeletonList rows={6} />
        ) : (owners ?? []).length === 0 ? (
          <EmptyState
            icon={UserIcon}
            title="Няма собственици"
            description="Добавете първия собственик за да започнете."
            action={<Link href="/owners" className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-accent">Обнови</Link>}
          />
        ) : (
        (owners ?? []).map((o) => (
          <div key={o._id} className="p-3 flex justify-between items-center text-sm hover:bg-accent">
            <div className="flex items-center gap-3">
              <UserIcon className="size-5 text-primary" aria-hidden />
              <div>
                <Link href={`/owners/${o._id}`} className="font-medium underline-offset-2 hover:underline inline-flex items-center gap-1" aria-label={`Преглед на ${o.name}`}>
                  <Eye className="size-4" aria-hidden /> {o.name}
                </Link>
                <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1"><PhoneIcon className="size-4" />{o.phone}</span>
                  {o.email ? <span className="inline-flex items-center gap-1"><MailIcon className="size-4" />{o.email}</span> : null}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {o.gdprConsent ? <ShieldCheck className="size-4 text-secondary" aria-label="GDPR" /> : null}
              <span className="text-muted-foreground">{fmtDateTimeBG(o.createdAt)}</span>
            </div>
          </div>
        )))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Назад</Button>
        <div className="text-sm text-muted-foreground">Страница {page + 1}</div>
        <Button
          variant="outline"
          onClick={() => setPage((p) => ((owners ?? []).length < pageSize ? p : p + 1))}
          disabled={(owners ?? []).length < pageSize}
        >Напред</Button>
      </div>
    </main>
  );
}


