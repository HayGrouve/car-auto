"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { VisitDocSchema, type VisitDoc } from "@/types/visit";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { toast } from "sonner";
import { brand } from "@/lib/brand";

export default function VisitDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"visits">;
  const visitUnknown = useQuery(api.visits.getById, useMemo(() => ({ id }), [id])) as unknown;
  const update = useMutation(api.visits.update);
  const finalize = useMutation(api.visits.finalize);
  const router = useRouter();

  const [s, setS] = useState("");
  const [o, setO] = useState("");
  const [a, setA] = useState("");
  const [p, setP] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [procedures, setProcedures] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [procInput, setProcInput] = useState("");
  const [medInput, setMedInput] = useState("");
  const [animalId, setAnimalId] = useState<string | null>(null);
  const [animalSearch, setAnimalSearch] = useState("");
  const animals = useQuery(api.animals.list, useMemo(() => ({ search: animalSearch }), [animalSearch])) as { _id: string; name: string; species: string }[] | undefined;

  const parsed = VisitDocSchema.safeParse(visitUnknown);
  const visit: VisitDoc | null = parsed.success ? parsed.data : null;

  useEffect(() => {
    if (!hydrated && visit) {
      setS(visit.soap?.s ?? "");
      setO(visit.soap?.o ?? "");
      setA(visit.soap?.a ?? "");
      setP(visit.soap?.p ?? "");
      setAnimalId(visit.animalId ?? null);
      setProcedures(visit.procedures ?? []);
      setMedications(visit.medications ?? []);
      setHydrated(true);
    }
  }, [visit, hydrated]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const res = (await update({
      id,
      soap: { s, o, a, p },
      procedures,
      medications,
      animalId: animalId ? (animalId as Id<"animals">) : null,
    })) as { ok: boolean };
    if (res?.ok) toast.success("Записът е обновен");
  }

  async function onFinalize() {
    const res = await finalize({ id });
    if (res?.ok) {
      toast.success("Приключено");
      router.push("/visits");
    }
  }

  if (!visit) return <main className="p-6 max-w-3xl mx-auto">Зареждане...</main>;

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{brand.nameBg}: Посещение</h1>
      <form onSubmit={onSave} className="grid md:grid-cols-4 gap-2">
        <div className="md:col-span-2">
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
                  {(animals ?? []).map((an) => (
                    <CommandItem key={an._id} value={an._id} onSelect={(v) => { setAnimalId(v); }}>
                      {an.name} ({an.species})
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
        <div className="md:col-span-4 grid md:grid-cols-2 gap-4">
          <div>
            <Label>Процедури</Label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <input className="border rounded-md px-3 h-10 w-full" value={procInput} onChange={(e) => setProcInput(e.target.value)} placeholder="напр. Ваксинация" />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const v = procInput.trim();
                  if (!v) return;
                  setProcedures((arr) => [...arr, v]);
                  setProcInput("");
                }}
              >
                Добави
              </Button>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {procedures.map((pr, i) => (
                <li key={i} className="flex justify-between">
                  <span>{pr}</span>
                  <Button type="button" variant="ghost" onClick={() => setProcedures((arr) => arr.filter((_, idx) => idx !== i))}>Премахни</Button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Label>Медикаменти</Label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <input className="border rounded-md px-3 h-10 w-full" value={medInput} onChange={(e) => setMedInput(e.target.value)} placeholder="напр. Амоксицилин" />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const v = medInput.trim();
                  if (!v) return;
                  setMedications((arr) => [...arr, v]);
                  setMedInput("");
                }}
              >
                Добави
              </Button>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {medications.map((md, i) => (
                <li key={i} className="flex justify-between">
                  <span>{md}</span>
                  <Button type="button" variant="ghost" onClick={() => setMedications((arr) => arr.filter((_, idx) => idx !== i))}>Премахни</Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="md:col-span-4 flex gap-2">
          <Button type="submit">Запази</Button>
          <Button type="button" variant="outline" onClick={onFinalize}>Приключи</Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>Назад</Button>
        </div>
      </form>
    </main>
  );
}
