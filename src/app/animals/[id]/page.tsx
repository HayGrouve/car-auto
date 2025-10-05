"use client";
import Link from "next/link";
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
import { fmtDateBG, fmtDateTimeBG } from "@/lib/format";
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
import PdfDownloadButton from "@/components/pdf/PdfDownloadButton";
import { generateVaccinationCertificatePdf } from "@/lib/pdf-generator";
import {
  VisitList,
  type VisitListItem,
} from "@/components/dashboard/VisitList";
import { SkeletonList } from "@/components/SkeletonList";

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
  const visits = useQuery(
    api.visits.list,
    useMemo(() => ({ animalId: id, limit: 5, sort: "datetimeDesc" }), [id]),
  ) as
    | {
        _id: string;
        code?: string | null;
        datetime?: number | null;
        status: string;
        ownerId?: string | null;
        procedures?: string[];
        medications?: string[];
      }[]
    | undefined;
  const visitsLoading = visits === undefined;
  const lastVisit = (visits ?? [])[0];
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
              Последно посещение
            </dt>
            <dd className="text-sm font-medium">
              {lastVisit?.datetime ? fmtDateTimeBG(lastVisit.datetime) : "—"}
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
        <div>
          <Label htmlFor="dob">Дата на раждане</Label>
          <Input
            id="dob"
            type="date"
            value={form.dob}
            onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
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
      {visitsLoading ? (
        <SkeletonList rows={3} />
      ) : (
        <VisitList
          title="Последни посещения"
          visits={
            (visits ?? []).map((visit) => ({
              _id: visit._id,
              code: visit.code ?? null,
              datetime: visit.datetime ?? visit.createdAt ?? Date.now(),
              status: visit.status,
              ownerName: owner?.name ?? null,
              ownerId: owner?._id ?? null,
              animalId: String(id),
            })) as VisitListItem[]
          }
          emptyLabel="Няма посещения"
          actionLabel="Всички посещения"
          className="bg-card"
        />
      )}
    </main>
  );
}
