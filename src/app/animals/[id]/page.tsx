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
import PdfDownloadButton from "@/components/pdf/PdfDownloadButton";
import { generateVaccinationCertificatePdf } from "@/lib/pdf-generator";

export default function AnimalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"animals">;
  const animalUnknown = useQuery(
    api.animals.getById,
    useMemo(() => ({ id }), [id]),
  ) as unknown;
  const update = useMutation(api.animals.update);
  const createVisit = useMutation(api.visits.create) as unknown as (args: {
    ownerId: string;
    animalId?: string | null;
    datetime?: number;
    soap: { s?: string; o?: string; a?: string; p?: string };
    procedures?: string[];
    medications?: string[];
  }) => Promise<{ ok: boolean; id: string }>;
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
  });
  const [ownerOpen, setOwnerOpen] = useState(false);

  useEffect(() => {
    const parsed = AnimalDocSchema.safeParse(animalUnknown);
    if (parsed.success) {
      const a = parsed.data as { ownerId?: string | null } & typeof parsed.data;
      setForm({
        name: a.name ?? "",
        species: a.species ?? "",
        breed: a.breed ?? "",
        microchip: a.microchip ?? "",
        neutered: Boolean(a.neutered),
        ownerId: a.ownerId ?? "",
      });
    }
  }, [animalUnknown]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const res = (await update({
      id,
      name: form.name,
      species: form.species,
      breed: form.breed || null,
      microchip: form.microchip || null,
      neutered: form.neutered,
      ownerId: (form.ownerId || null) as Id<"owners"> | null,
    })) as { ok: boolean };
    if (res?.ok) {
      toast.success("Записът е обновен");
      router.push("/animals");
    }
  }

  async function onStartVisit() {
    if (!form.ownerId) {
      toast.error("Изберете собственик преди да започнете посещение");
      return;
    }
    const res = await createVisit({
      ownerId: form.ownerId as unknown as string,
      animalId: form.ownerId ? (id as unknown as string) : undefined,
      datetime: Date.now(),
      soap: {},
      procedures: [],
      medications: [],
    });
    if (res?.ok && res.id) {
      toast.success("Стартирано посещение");
      // Open with wizard step=1
      router.push(`/visits/${res.id}?step=1`);
    }
  }

  // Weights
  const weights = useQuery(
    api.weights.listByAnimal,
    useMemo(() => ({ animalId: id }), [id]),
  ) as
    | { _id: string; kg: number; notedAt?: number; createdAt: number }[]
    | undefined;
  const addWeight = useMutation(api.weights.add);
  const [kg, setKg] = useState<string>("");
  async function onAddWeight(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(kg);
    if (Number.isNaN(value) || value <= 0) {
      toast.error("Невалидно тегло");
      return;
    }
    const r = await addWeight({ animalId: id, kg: value });
    if (r?.ok) {
      toast.success("Добавено тегло");
      setKg("");
    }
  }

  const hasAnimal = AnimalDocSchema.safeParse(animalUnknown).success;
  if (!hasAnimal)
    return <main className="mx-auto max-w-3xl p-6">Зареждане...</main>;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">{brand.nameBg}: Животно</h1>
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
          <Label htmlFor="species">Вид</Label>
          <Input
            id="species"
            value={form.species}
            onChange={(e) =>
              setForm((f) => ({ ...f, species: e.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="breed">Порода</Label>
          <Input
            id="breed"
            value={form.breed}
            onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))}
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
        <label className="flex items-center gap-2">
          <Checkbox
            checked={form.neutered}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, neutered: Boolean(checked) }))
            }
          />
          <span className="text-sm">Кастриран/а</span>
        </label>
        <div className="flex gap-2">
          <Button type="submit">Запази</Button>
          <Button type="button" variant="secondary" onClick={onStartVisit}>
            Започни посещение
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Назад
          </Button>
        </div>
      </form>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Тегло</h2>
        <div>
          <a
            href={`/visits?animalId=${id}`}
            className="text-primary underline underline-offset-2"
          >
            Ново посещение за това животно
          </a>
        </div>
        <form onSubmit={onAddWeight} className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="kg">Килограми</Label>
            <Input
              id="kg"
              inputMode="decimal"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              placeholder="напр. 12.4"
            />
          </div>
          <Button type="submit">Добави</Button>
        </form>
        <div className="divide-y rounded-md border">
          {(weights ?? []).length === 0 ? (
            <div className="text-muted-foreground p-3 text-sm">
              Няма записани тегла
            </div>
          ) : (
            (weights ?? []).map((w) => (
              <div key={w._id} className="flex justify-between p-3 text-sm">
                <span>{w.kg.toFixed(2)} кг</span>
                <span className="text-muted-foreground">
                  {fmtDateTimeBG(w.notedAt ?? w.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Документи</h2>
        <div className="flex gap-2">
          <PdfDownloadButton
            ariaLabel="Сертификат за ваксинация"
            variant="outline"
            fileName={`vaccination-${id}.pdf`}
            generatePdf={async () => {
              const parsedAnimal = AnimalDocSchema.safeParse(animalUnknown);
              if (!parsedAnimal.success) throw new Error("Invalid animal data");
              const animal = parsedAnimal.data;
              const owner = (owners ?? []).find((o) => o._id === form.ownerId);
              return generateVaccinationCertificatePdf(animal, {
                name: owner?.name ?? brand.nameBg,
                phone: owner?.phone,
                email: undefined,
              });
            }}
          >
            <span className="flex items-center gap-2">
              <svg
                className="size-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              Сертификат
            </span>
          </PdfDownloadButton>
        </div>
      </section>
    </main>
  );
}
