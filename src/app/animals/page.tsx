"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { brand } from "@/lib/brand";
import { toast } from "sonner";
import type { AnimalDoc } from "@/types/animal";
import { PawPrint, Hash, Eye, User as UserIcon, Phone as PhoneIcon } from "lucide-react";
import { fmtDateTimeBG } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import type { Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/SkeletonList";
import Link from "next/link";

export default function AnimalsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [sort, setSort] = useState<"createdAtDesc" | "createdAtAsc">("createdAtDesc");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const animals = useQuery(
    api.animals.list,
    useMemo(() => ({ search, limit: pageSize, offset: page * pageSize, sort }), [search, page, sort])
  ) as AnimalDoc[] | undefined;
  const createAnimal = useMutation(api.animals.create);
  const [ownerId, setOwnerId] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");
  const owners = useQuery(
    api.owners.list,
    useMemo(() => ({ search: ownerSearch }), [ownerSearch])
  ) as { _id: string; name: string; phone?: string }[] | undefined;

  const ownersById = useMemo(() => {
    const map: Record<string, { _id: string; name: string; phone?: string }> = {};
    (owners ?? []).forEach((o) => { map[o._id] = o; });
    return map;
  }, [owners]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = (fd.get("name") ?? "") as string;
    const species = (fd.get("species") ?? "") as string;
    const breed = (fd.get("breed") ?? undefined) as string | undefined;
    const microchip = (fd.get("microchip") ?? undefined) as string | undefined;
    const res = (await createAnimal({ name, species, breed, microchip, ownerId: ownerId ? (ownerId as Id<"owners">) : undefined })) as
      | { ok: true; id: string }
      | { ok: false; reason: "microchip" };
    if (!res?.ok) {
      toast.error("Съществува животно с този микрочип");
      return;
    }
    toast.success("Животното е добавено успешно");
    form.reset();
    setOwnerId("");
    setOwnerSearch("");
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{brand.nameBg}: Животни</h1>
        <Button className="md:hidden" variant="outline" onClick={() => setShowCreatePanel(true)} aria-label="Ново животно">Ново животно</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_380px] gap-4">
        <nav className="md:hidden mb-2 text-xs text-muted-foreground inline-flex items-center gap-3">
          <a href="#search" className="underline underline-offset-2">Търсене</a>
          <a href="#create" className="underline underline-offset-2">Създаване</a>
        </nav>
        {/* Left: Search/List */}
        <section className="space-y-4">
          <div className="flex gap-2 items-center">
            <input
              placeholder="Търсене по име, вид, порода, микрочип"
              className="border rounded-md px-3 h-10 w-full"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              aria-label="Търсене на животни"
            />
            <select
              className="border rounded-md h-10 px-3"
              value={sort}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSort(e.target.value as "createdAtDesc" | "createdAtAsc"); setPage(0); }}
              aria-label="Подреждане"
            >
              <option value="createdAtDesc">Най-нови</option>
              <option value="createdAtAsc">Най-стари</option>
            </select>
          </div>

          <div className="border rounded-md divide-y">
            {animals === undefined ? (
              <SkeletonList rows={6} />
            ) : (animals ?? []).length === 0 ? (
              <EmptyState icon={PawPrint} title="Няма животни" description="Добавете животно към собственик." />
            ) : (
              (animals ?? []).map((a) => {
                const owner = a.ownerId ? ownersById[String(a.ownerId)] : undefined;
                return (
                  <div key={a._id} className="p-3 flex justify-between items-center text-sm hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <PawPrint className="size-5 text-primary" aria-hidden />
                      <div>
                        <Link href={`/animals/${a._id}`} className="font-medium underline-offset-2 hover:underline inline-flex items-center gap-1" aria-label={`Преглед на ${a.name}`}>
                          <Eye className="size-4" aria-hidden /> {a.name} ({a.species})
                        </Link>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>{a.breed ?? ""}</span>
                          {a.microchip ? <span className="inline-flex items-center gap-1"><Hash className="size-4" />{a.microchip}</span> : null}
                          {a.neutered ? <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">Кастриран</span> : null}
                          {owner ? (
                            <span className="inline-flex items-center gap-2">
                              <Link href={`/owners/${owner._id}`} className="inline-flex items-center gap-1 underline-offset-2 hover:underline" aria-label={`Собственик ${owner.name}`}>
                                <UserIcon className="size-4" aria-hidden /> {owner.name}
                              </Link>
                              {owner.phone ? <span className="inline-flex items-center gap-1 text-muted-foreground"><PhoneIcon className="size-4" />{owner.phone}</span> : null}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="text-muted-foreground">{fmtDateTimeBG(a.createdAt)}</div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Назад</Button>
            <div className="text-sm text-muted-foreground">Страница {page + 1}</div>
            <Button
              variant="outline"
              onClick={() => setPage((p) => ((animals ?? []).length < pageSize ? p : p + 1))}
              disabled={(animals ?? []).length < pageSize}
            >Напред</Button>
          </div>
        </section>

        {/* Right: Create Panel */}
        <aside className={`${showCreatePanel ? "block" : "hidden"} md:block`}>
          <div className="border rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Ново животно</h2>
              <Button className="md:hidden" variant="ghost" size="sm" onClick={() => setShowCreatePanel(false)} aria-label="Затвори панела">Затвори</Button>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="aname">Име</Label>
                <Input id="aname" name="name" required aria-label="Име на животно" />
              </div>
              <div>
                <Label htmlFor="species">Вид</Label>
                <Input id="species" name="species" required />
              </div>
              <div>
                <Label htmlFor="breed">Порода</Label>
                <Input id="breed" name="breed" />
              </div>
              <div>
                <Label htmlFor="microchip">Микрочип</Label>
                <Input id="microchip" name="microchip" />
              </div>
              <div>
                <Label>Собственик</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {ownerId ? (owners ?? []).find((o) => o._id === ownerId)?.name : "Без собственик"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                    <Command>
                      <CommandInput placeholder="Търси собственик..." value={ownerSearch} onValueChange={setOwnerSearch} />
                      <CommandList>
                        <CommandEmpty>Няма резултати</CommandEmpty>
                        {(owners ?? []).map((o) => (
                          <CommandItem key={o._id} value={o._id} onSelect={(v) => { setOwnerId(v); }}>
                            {o.name}{o.phone ? ` · ${o.phone}` : ""}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Button type="submit" className="w-full md:w-auto">Добави животно</Button>
              </div>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}


