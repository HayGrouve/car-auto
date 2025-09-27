"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { useRouter } from "next/navigation";

export default function NewInvoicePage() {
  const router = useRouter();
  const [ownerSearch, setOwnerSearch] = useState("");
  const [animalSearch, setAnimalSearch] = useState("");
  const owners = useQuery(api.owners.list, useMemo(() => ({ search: ownerSearch }), [ownerSearch])) as { _id: string; name: string; phone: string }[] | undefined;
  const animals = useQuery(api.animals.list, useMemo(() => ({ search: animalSearch }), [animalSearch])) as { _id: string; name: string; species: string }[] | undefined;
  const create = useMutation(api.invoices.create) as unknown as (args: { ownerId: string; animalId?: string; items: { description: string; quantity: number; price: number; total: number }[] }) => Promise<{ ok: boolean; id: string }>;

  const [ownerId, setOwnerId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [items, setItems] = useState<{ description: string; quantity: string; price: string; total: number }[]>([
    { description: "", quantity: "1", price: "0", total: 0 }
  ]);

  function recalcTotal(idx: number, next?: Partial<{ description: string; quantity: string; price: string }>) {
    setItems((arr) => {
      const copy = arr.map((it) => ({ ...it }));
      const target = copy[idx];
      if (!target) return arr;
      if (next?.description !== undefined) target.description = next.description;
      if (next?.quantity !== undefined) target.quantity = next.quantity;
      if (next?.price !== undefined) target.price = next.price;
      const q = parseFloat(target.quantity || "0");
      const p = parseFloat(target.price || "0");
      target.total = Number.isFinite(q * p) ? q * p : 0;
      return copy;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId) return;
    const payloadItems = items
      .filter((it) => it.description.trim())
      .map((it) => ({ description: it.description.trim(), quantity: parseFloat(it.quantity || "0"), price: parseFloat(it.price || "0"), total: it.total }));
    const res = await create({ ownerId, animalId: animalId || undefined, items: payloadItems });
    if (res?.ok && res.id) router.push("/invoices");
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Нова фактура</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <Label>Собственик</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">{ownerId ? (owners ?? []).find((o) => o._id === ownerId)?.name : "Изберете собственик"}</Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                <Command>
                  <CommandInput placeholder="Търси собственик..." value={ownerSearch} onValueChange={setOwnerSearch} />
                  <CommandList>
                    <CommandEmpty>Няма резултати</CommandEmpty>
                    {(owners ?? []).map((o) => (
                      <CommandItem key={o._id} value={o._id} onSelect={(v) => { setOwnerId(v); }}>{o.name} · {o.phone}</CommandItem>
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
                <Button variant="outline" className="w-full justify-between">{animalId ? (animals ?? []).find((a) => a._id === animalId)?.name : "Без животно"}</Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                <Command>
                  <CommandInput placeholder="Търси животно..." value={animalSearch} onValueChange={setAnimalSearch} />
                  <CommandList>
                    <CommandEmpty>Няма резултати</CommandEmpty>
                    {(animals ?? []).map((an) => (
                      <CommandItem key={an._id} value={an._id} onSelect={(v) => { setAnimalId(v); }}>{an.name} ({an.species})</CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="border rounded-md divide-y">
          {items.map((it, idx) => (
            <div key={idx} className="p-3 grid md:grid-cols-5 gap-2 items-end">
              <div className="md:col-span-2">
                <Label htmlFor={`desc-${idx}`}>Описание</Label>
                <Input id={`desc-${idx}`} value={it.description} onChange={(e) => recalcTotal(idx, { description: e.target.value })} />
              </div>
              <div>
                <Label htmlFor={`qty-${idx}`}>Кол-во</Label>
                <Input id={`qty-${idx}`} inputMode="decimal" value={it.quantity} onChange={(e) => recalcTotal(idx, { quantity: e.target.value })} />
              </div>
              <div>
                <Label htmlFor={`price-${idx}`}>Цена</Label>
                <Input id={`price-${idx}`} inputMode="decimal" value={it.price} onChange={(e) => recalcTotal(idx, { price: e.target.value })} />
              </div>
              <div className="text-right">{Number.isFinite(it.total) ? it.total.toFixed(2) : "0.00"} BGN</div>
            </div>
          ))}
          <div className="p-3">
            <Button type="button" variant="secondary" onClick={() => setItems((arr) => [...arr, { description: "", quantity: "1", price: "0", total: 0 }])}>Добави ред</Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit">Създай</Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>Назад</Button>
        </div>
      </form>
    </main>
  );
}


