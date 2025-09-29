"use client";
import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { brand } from "@/lib/brand";
import { toast } from "sonner";
import { CalendarCheck } from "lucide-react";
import type { VisitDoc } from "@/types/visit";
import { fmtDateTimeBG } from "@/lib/format";
import type { Id } from "@/../convex/_generated/dataModel";

function VisitsPageInner() {
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [ownerId, setOwnerId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const visits = useQuery(
    api.visits.list,
    useMemo(
      () => ({
        limit: 50,
        status: status || undefined,
        ownerId: ownerId ? (ownerId as Id<"owners">) : undefined,
        animalId: animalId ? (animalId as Id<"animals">) : undefined,
        from: from ? Date.parse(from) : undefined,
        to: to ? Date.parse(to) : undefined,
      }),
      [status, ownerId, animalId, from, to]
    )
  ) as VisitDoc[] | undefined;
  const createVisit = useMutation(api.visits.create) as unknown as (args: { ownerId: string; animalId?: string; soap: { s?: string; o?: string; a?: string; p?: string } }) => Promise<{ ok: boolean }>;
  const finalizeVisit = useMutation(api.visits.finalize) as unknown as (args: { id: string }) => Promise<{ ok: boolean }>;

  const params = useSearchParams();
  useEffect(() => {
    const o = params.get("ownerId") ?? "";
    const a = params.get("animalId") ?? "";
    if (o) setOwnerId(o);
    if (a) setAnimalId(a);
  }, [params]);
  const [s, setS] = useState("");
  const [o, setO] = useState("");
  const [a, setA] = useState("");
  const [p, setP] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [animalSearch, setAnimalSearch] = useState("");

  const owners = useQuery(api.owners.list, useMemo(() => ({ search: ownerSearch }), [ownerSearch])) as { _id: string; name: string; phone: string }[] | undefined;
  const animals = useQuery(
    api.animals.list,
    useMemo(
      () => ({ search: animalSearch }),
      [animalSearch]
    )
  ) as { _id: string; name: string; species: string; ownerId?: string | null }[] | undefined;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId) {
      toast.error("Изберете собственик (ownerId)");
      return;
    }
    const res = await createVisit({ ownerId, animalId: animalId || undefined, soap: { s, o, a, p } });
    if (res?.ok) {
      toast.success("Посещението е създадено");
      setS(""); setO(""); setA(""); setP("");
    }
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <CalendarCheck className="size-5 text-primary" />
        <h1 className="text-2xl font-semibold">{brand.nameBg}: Посещения</h1>
      </div>

      <form onSubmit={onCreate} className="grid md:grid-cols-4 gap-2">
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <Label>Собственик</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {ownerId ? (owners ?? []).find((o) => o._id === ownerId)?.name : "Изберете собственик"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                <Command>
                  <CommandInput placeholder="Търси собственик..." value={ownerSearch} onValueChange={setOwnerSearch} />
                  <CommandList>
                    <CommandEmpty>Няма резултати</CommandEmpty>
                    {(owners ?? []).map((o) => (
                      <CommandItem key={o._id} value={o._id} onSelect={(v) => { setOwnerId(v); setAnimalId(""); }}>
                        {o.name} · {o.phone}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Животно</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {animalId ? (animals ?? []).find((a) => a._id === animalId)?.name : "Без животно"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                <Command>
                  <CommandInput placeholder="Търси животно..." value={animalSearch} onValueChange={setAnimalSearch} />
                  <CommandList>
                    <CommandEmpty>Няма резултати</CommandEmpty>
                    {(animals ?? [])
                      .filter((an) => !ownerId || String(an.ownerId) === String(ownerId))
                      .map((an) => (
                    <CommandItem key={an._id} value={an._id} onSelect={(v) => { setAnimalId(v); const chosen = (animals ?? []).find((x) => x._id === v); if (chosen?.ownerId) setOwnerId(String(chosen.ownerId)); }}>
                        {an.name} ({an.species})
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <Label>Статус</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">{status || "Всички"}</Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                <Command>
                  <CommandList>
                    <CommandItem onSelect={() => setStatus("")}>Всички</CommandItem>
                    <CommandItem onSelect={() => setStatus("draft")}>Чернова</CommandItem>
                    <CommandItem onSelect={() => setStatus("finalized")}>Приключени</CommandItem>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="from">От дата</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="to">До дата</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="md:col-span-4 grid grid-cols-1 gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {ownerId && (
              <button type="button" onClick={() => setOwnerId("")} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 hover:bg-accent">
                <span>Собственик: {(owners ?? []).find((o) => o._id === ownerId)?.name ?? ownerId}</span>
                <span aria-hidden>✕</span>
              </button>
            )}
            {animalId && (
              <button type="button" onClick={() => setAnimalId("")} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 hover:bg-accent">
                <span>Животно: {(animals ?? []).find((an) => an._id === animalId)?.name ?? animalId}</span>
                <span aria-hidden>✕</span>
              </button>
            )}
          </div>
        </div>
        <div className="md:col-span-4 grid md:grid-cols-4 gap-2">
          <div>
            <Label htmlFor="s">S - Субективно</Label>
            <Textarea id="s" value={s} onChange={(e) => setS(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="o">O - Обективно</Label>
            <Textarea id="o" value={o} onChange={(e) => setO(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="a">A - Оценка</Label>
            <Textarea id="a" value={a} onChange={(e) => setA(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="p">P - План</Label>
            <Textarea id="p" value={p} onChange={(e) => setP(e.target.value)} />
          </div>
        </div>
        <div className="md:col-span-4"><Button type="submit">Ново посещение</Button></div>
      </form>

      <div className="border rounded-md divide-y">
        {(visits ?? []).map((v) => (
          <div key={v._id} className="p-3 flex items-center justify-between text-sm">
            <div className="space-y-1">
              <a href={`/visits/${v._id}`} className="font-medium underline-offset-2 hover:underline">{(v as VisitDoc & { code?: string }).code ?? `#${String(v._id)}`} - {fmtDateTimeBG((v as VisitDoc & { datetime?: number }).datetime ?? v.createdAt)}</a>
              <div className="text-muted-foreground">Статус: {v.status}</div>
            </div>
            <div className="flex items-center gap-2">
              {v.status === "draft" ? (
                <Button variant="outline" onClick={async () => { const r = await finalizeVisit({ id: v._id }); if (r?.ok) toast.success("Приключено"); }}>
                  Приключи
                </Button>
              ) : null}
              <a
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                href={`/invoices/new?ownerId=${encodeURIComponent(String(v.ownerId))}${v.animalId ? `&animalId=${encodeURIComponent(String(v.animalId))}` : ""}&visitId=${encodeURIComponent(String(v._id))}`}
              >
                Нова фактура
              </a>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function VisitsPage() {
  return (
    <Suspense fallback={<main className="p-6 max-w-5xl mx-auto">Зареждане...</main>}>
      <VisitsPageInner />
    </Suspense>
  );
}


