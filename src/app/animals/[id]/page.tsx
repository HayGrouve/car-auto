"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { AnimalDocSchema } from "@/types/animal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { brand } from "@/lib/brand";
import { fmtDateTimeBG } from "@/lib/format";

export default function AnimalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"animals">;
  const animalUnknown = useQuery(api.animals.getById, useMemo(() => ({ id }), [id])) as unknown;
  const update = useMutation(api.animals.update);
  const router = useRouter();

  const [form, setForm] = useState({ name: "", species: "", breed: "", microchip: "", neutered: false });

  useEffect(() => {
    const parsed = AnimalDocSchema.safeParse(animalUnknown);
    if (parsed.success) {
      const a = parsed.data;
      setForm({
        name: a.name ?? "",
        species: a.species ?? "",
        breed: a.breed ?? "",
        microchip: a.microchip ?? "",
        neutered: Boolean(a.neutered),
      });
    }
  }, [animalUnknown]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const res = (await update({ id, name: form.name, species: form.species, breed: form.breed || null, microchip: form.microchip || null, neutered: form.neutered })) as { ok: boolean };
    if (res?.ok) {
      toast.success("Записът е обновен");
      router.push("/animals");
    }
  }

  // Weights
  const weights = useQuery(api.weights.listByAnimal, useMemo(() => ({ animalId: id }), [id])) as { _id: string; kg: number; notedAt?: number; createdAt: number }[] | undefined;
  const addWeight = useMutation(api.weights.add);
  const [kg, setKg] = useState<string>("");
  async function onAddWeight(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(kg);
    if (Number.isNaN(value) || value <= 0) { toast.error("Невалидно тегло"); return; }
    const r = await addWeight({ animalId: id, kg: value });
    if (r?.ok) { toast.success("Добавено тегло"); setKg(""); }
  }

  const hasAnimal = AnimalDocSchema.safeParse(animalUnknown).success;
  if (!hasAnimal) return <main className="p-6 max-w-3xl mx-auto">Зареждане...</main>;

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{brand.nameBg}: Животно</h1>
      <form onSubmit={onSave} className="grid gap-3">
        <div>
          <Label htmlFor="name">Име</Label>
          <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="species">Вид</Label>
          <Input id="species" value={form.species} onChange={(e) => setForm((f) => ({ ...f, species: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="breed">Порода</Label>
          <Input id="breed" value={form.breed} onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="microchip">Микрочип</Label>
          <Input id="microchip" value={form.microchip} onChange={(e) => setForm((f) => ({ ...f, microchip: e.target.value }))} />
        </div>
        <label className="flex items-center gap-2">
          <Checkbox checked={form.neutered} onCheckedChange={(checked) => setForm((f) => ({ ...f, neutered: Boolean(checked) }))} />
          <span className="text-sm">Кастриран/а</span>
        </label>
        <div className="flex gap-2">
          <Button type="submit">Запази</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Назад</Button>
        </div>
      </form>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Тегло</h2>
        <form onSubmit={onAddWeight} className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="kg">Килограми</Label>
            <Input id="kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="напр. 12.4" />
          </div>
          <Button type="submit">Добави</Button>
        </form>
        <div className="border rounded-md divide-y">
          {(weights ?? []).length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">Няма записани тегла</div>
          ) : (
            (weights ?? []).map((w) => (
              <div key={w._id} className="p-3 flex justify-between text-sm">
                <span>{w.kg.toFixed(2)} кг</span>
                <span className="text-muted-foreground">{fmtDateTimeBG(w.notedAt ?? w.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
