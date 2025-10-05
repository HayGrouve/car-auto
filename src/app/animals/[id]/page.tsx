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
import { fmtDateBG } from "@/lib/format";
import { differenceInYears } from "date-fns";
import { SectionCard } from "@/components/ui/section-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export default function AnimalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"animals">;
  const animalUnknown = useQuery(
    api.animals.getById,
    useMemo(() => ({ id }), [id]),
  ) as unknown;
  const update = useMutation(api.animals.update);
  const owners = useQuery(
    api.owners.list,
    useMemo(() => ({ search: "" }), []),
  ) as { _id: string; name: string; phone?: string }[] | undefined;
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    species: "",
    breed: "",
    microchip: "",
    neutered: false,
    ownerId: "",
    dob: "",
  });
  const [ownerOpen, setOwnerOpen] = useState(false);

  const parsedAnimal = useMemo(
    () => AnimalDocSchema.safeParse(animalUnknown),
    [animalUnknown],
  );

  useEffect(() => {
    if (parsedAnimal.success) {
      const a = parsedAnimal.data as {
        ownerId?: string | null;
      } & typeof parsedAnimal.data;
      setForm({
        name: a.name ?? "",
        species: a.species ?? "",
        breed: a.breed ?? "",
        microchip: a.microchip ?? "",
        neutered: Boolean(a.neutered),
        ownerId: a.ownerId ?? "",
        dob: a.dob ? new Date(a.dob).toISOString().slice(0, 10) : "",
      });
    }
  }, [parsedAnimal]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const res = (await update({
      id,
      name: form.name,
      species: form.species,
      breed: form.breed || null,
      microchip: form.microchip || null,
      neutered: form.neutered,
      dob:
        form.dob && !Number.isNaN(Date.parse(form.dob))
          ? Date.parse(form.dob)
          : null,
      ownerId: (form.ownerId || null) as Id<"owners"> | null,
    })) as { ok: boolean };
    if (res?.ok) {
      toast.success("Записът е обновен");
      router.push("/animals");
    }
  }

  const summaryAge = form.dob
    ? differenceInYears(new Date(), new Date(form.dob))
    : null;

  const owner = form.ownerId
    ? (owners ?? []).find((o) => o._id === form.ownerId)
    : undefined;

  if (!parsedAnimal.success)
    return <main className="mx-auto max-w-3xl p-6">Зареждане...</main>;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Животно: {form.name}</h1>
      <SectionCard
        title="Резюме"
        actions={
          owner ? (
            <a
              href={`/owners/${owner._id}`}
              className="text-primary underline underline-offset-2"
            >
              Към собственик
            </a>
          ) : null
        }
      >
        <dl className="grid gap-3 md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs uppercase">Име</dt>
            <dd className="text-sm font-medium">{form.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase">
              Вид / Порода
            </dt>
            <dd className="text-sm font-medium">
              {[form.species, form.breed].filter(Boolean).join(" · ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase">Възраст</dt>
            <dd className="text-sm font-medium">
              {summaryAge !== null
                ? `${summaryAge} г.`
                : form.dob
                  ? fmtDateBG(new Date(form.dob))
                  : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase">
              Микрочип
            </dt>
            <dd className="text-sm font-medium">{form.microchip || "—"}</dd>
          </div>
        </dl>
      </SectionCard>
      <form onSubmit={onSave} className="grid gap-3">
        <div>
          <Label htmlFor="name">Име</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <Label>Собственик</Label>
          <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {form.ownerId
                  ? (owners ?? []).find((o) => o._id === form.ownerId)?.name
                  : "Без собственик"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Търси собственик..." />
                <CommandList>
                  <CommandEmpty>Няма резултати</CommandEmpty>
                  {(owners ?? []).map((o) => (
                    <CommandItem
                      key={o._id}
                      value={o._id}
                      onSelect={(v) => {
                        setForm((f) => ({ ...f, ownerId: v }));
                        setOwnerOpen(false);
                      }}
                    >
                      {o.name}
                      {o.phone ? ` · ${o.phone}` : ""}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="dob">Дата на раждане</Label>
          <Input
            id="dob"
            type="date"
            value={form.dob}
            onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="microchip">Микрочип</Label>
          <Input
            id="microchip"
            value={form.microchip}
            onChange={(e) =>
              setForm((f) => ({ ...f, microchip: e.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="neutered">Стерилизиран</Label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={form.neutered}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, neutered: Boolean(checked) }))
              }
            />
            <span className="text-sm">Кастриран/а</span>
          </label>
        </div>
        <Button type="submit" className="w-full">
          Запази
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Назад
          </Button>
        </div>
      </form>
    </main>
  );
}
