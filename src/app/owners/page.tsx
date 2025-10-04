"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brand } from "@/lib/brand";
import {
  User as UserIcon,
  ShieldCheck,
  Phone as PhoneIcon,
  Mail as MailIcon,
  Eye,
} from "lucide-react";
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
  const [sort, setSort] = useState<"createdAtDesc" | "createdAtAsc">(
    "createdAtDesc",
  );
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const owners = useQuery(
    api.owners.list,
    useMemo(
      () => ({ search, limit: pageSize, offset: page * pageSize, sort }),
      [search, page, sort],
    ),
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
    const res = (await createOwner({
      name,
      phone,
      email,
      address,
      gdprConsent,
    })) as { ok: true; id: string } | { ok: false; reason: "phone" | "email" };
    if (!res?.ok) {
      toast.error(
        res?.reason === "phone"
          ? "Има собственик с този телефон"
          : "Има собственик с този имейл",
      );
      return;
    }
    form.reset();
    toast.success("Собственикът е добавен успешно");
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{brand.nameBg}: Собственици</h1>
        <Button
          className="md:hidden"
          variant="outline"
          onClick={() => setShowCreatePanel(true)}
          aria-label="Нов собственик"
        >
          Нов собственик
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_380px]">
        <nav className="text-muted-foreground mb-2 inline-flex items-center gap-3 text-xs md:hidden">
          <a href="#search" className="underline underline-offset-2">
            Търсене
          </a>
          <a href="#create" className="underline underline-offset-2">
            Създаване
          </a>
        </nav>
        {/* Left: Search/List */}
        <section id="search" className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Търсене по име, телефон, имейл"
              className="h-10 w-full"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              aria-label="Търсене на собственици"
            />
            <Select
              value={sort}
              onValueChange={(value: "createdAtDesc" | "createdAtAsc") => {
                setSort(value);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-10 min-w-[160px]">
                <SelectValue placeholder="Подреждане" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAtDesc">Най-нови</SelectItem>
                <SelectItem value="createdAtAsc">Най-стари</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="divide-y rounded-md border">
            {owners === undefined ? (
              <SkeletonList rows={6} />
            ) : (owners ?? []).length === 0 ? (
              <EmptyState
                icon={UserIcon}
                title="Няма собственици"
                description="Добавете първия собственик за да започнете."
                action={
                  <Link
                    href="/owners"
                    className="hover:bg-accent inline-flex items-center rounded-md border px-3 py-2 text-sm"
                  >
                    Обнови
                  </Link>
                }
              />
            ) : (
              (owners ?? []).map((o) => (
                <div
                  key={o._id}
                  className="hover:bg-accent flex items-center justify-between p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <UserIcon className="text-primary size-5" aria-hidden />
                    <div>
                      <Link
                        href={`/owners/${o._id}`}
                        className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                        aria-label={`Преглед на ${o.name}`}
                      >
                        <Eye className="size-4" aria-hidden /> {o.name}
                      </Link>
                      <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <PhoneIcon className="size-4" />
                          {o.phone}
                        </span>
                        {o.email ? (
                          <span className="inline-flex items-center gap-1">
                            <MailIcon className="size-4" />
                            {o.email}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.gdprConsent ? (
                      <ShieldCheck
                        className="text-secondary size-4"
                        aria-label="GDPR"
                      />
                    ) : null}
                    <span className="text-muted-foreground">
                      {fmtDateTimeBG(o.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Назад
            </Button>
            <div className="text-muted-foreground text-sm">
              Страница {page + 1}
            </div>
            <Button
              variant="outline"
              onClick={() =>
                setPage((p) => ((owners ?? []).length < pageSize ? p : p + 1))
              }
              disabled={(owners ?? []).length < pageSize}
            >
              Напред
            </Button>
          </div>
        </section>

        {/* Right: Create Panel */}
        <aside
          id="create"
          className={`${showCreatePanel ? "block" : "hidden"} md:block`}
        >
          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Нов собственик</h2>
              <Button
                className="md:hidden"
                variant="outline"
                size="sm"
                onClick={() => setShowCreatePanel(false)}
                aria-label="Затвори панела"
              >
                Затвори
              </Button>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="name">Име</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  name="phone"
                  required
                  aria-describedby="phone-help"
                />
                <span id="phone-help" className="sr-only">
                  Въведете телефонния номер във формат 08xx xxx xxx
                </span>
              </div>
              <div>
                <Label htmlFor="email">Имейл</Label>
                <Input id="email" name="email" />
              </div>
              <div>
                <Label htmlFor="address">Адрес</Label>
                <Input id="address" name="address" />
              </div>
              <label className="flex items-center gap-2">
                <Checkbox name="gdpr" />
                <span className="inline-flex items-center gap-1 text-sm">
                  Съгласие (GDPR)
                </span>
                <Link
                  href="/privacy"
                  className="text-muted-foreground text-xs underline underline-offset-2"
                >
                  Политика
                </Link>
              </label>
              <div>
                <Button type="submit" className="w-full md:w-auto">
                  Добави собственик
                </Button>
              </div>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}
