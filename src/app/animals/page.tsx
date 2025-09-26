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
import { PawPrint, Hash } from "lucide-react";

export default function AnimalsPage() {
  const [search, setSearch] = useState("");
  const animals = useQuery(api.animals.list, useMemo(() => ({ search }), [search])) as AnimalDoc[] | undefined;
  const createAnimal = useMutation(api.animals.create);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = (fd.get("name") ?? "") as string;
    const species = (fd.get("species") ?? "") as string;
    const breed = (fd.get("breed") ?? undefined) as string | undefined;
    const microchip = (fd.get("microchip") ?? undefined) as string | undefined;
    const res = (await createAnimal({ name, species, breed, microchip })) as
      | { ok: true; id: string }
      | { ok: false; reason: "microchip" };
    if (!res?.ok) {
      toast.error("Съществува животно с този микрочип");
      return;
    }
    toast.success("Животното е добавено успешно");
    form.reset();
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{brand.nameBg}: Животни</h1>
      </div>
      <div className="flex gap-2 items-center">
        <input
          placeholder="Търсене по име, вид, порода, микрочип"
          className="border rounded-md px-3 h-10 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <div>
          <Label htmlFor="aname">Име</Label>
          <Input id="aname" name="name" required />
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
          <Button type="submit">Добави животно</Button>
        </div>
      </form>
      <div className="border rounded-md divide-y">
        {(animals ?? []).map((a) => (
          <div key={a._id} className="p-3 flex justify-between items-center text-sm">
            <div className="flex items-center gap-3">
              <PawPrint className="size-5 text-primary" aria-hidden />
              <div>
                <div className="font-medium">{a.name} ({a.species})</div>
                <div className="text-muted-foreground flex items-center gap-3">
                  <span>{a.breed ?? ""}</span>
                  {a.microchip ? <span className="inline-flex items-center gap-1"><Hash className="size-4" />{a.microchip}</span> : null}
                </div>
              </div>
            </div>
            <div className="text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </main>
  );
}


