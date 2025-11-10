"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { AnimalDocSchema } from "@/types/animal";
import { animalFormSchema } from "@/lib/validation/animal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmtDateTimeBG } from "@/lib/format";
import { differenceInYears } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { brand } from "@/lib/brand";
import { generateVaccinationCertificatePdf } from "@/lib/pdf-generator";
import { SkeletonList } from "@/components/SkeletonList";
import { AnimalSummaryCard } from "./components/AnimalSummaryCard";
import { AnimalControlsCard } from "./components/AnimalControlsCard";
import { Save } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import Link from "next/link";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AnimalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"animals">;
  const animalUnknown = useQuery(
    api.animals.getById,
    useMemo(() => ({ id }), [id]),
  ) as unknown;
  const update = useMutation(api.animals.update);
  const createVisit = useMutation(api.visits.create);
  const removeAnimal = useMutation(api.animals.remove);
  const owners = useQuery(
    api.owners.list,
    useMemo(() => ({ search: "" }), []),
  ) as { _id: string; name: string; phone?: string }[] | undefined;
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
        weight?: number | null;
        temperature?: number | null;
        pulse?: number | null;
        procedures?: string[];
        medications?: string[];
        createdAt?: number;
      }[]
    | undefined;
  const draftVisits = useQuery(
    api.visits.list,
    useMemo(
      () => ({ animalId: id, status: "draft", limit: 1, sort: "datetimeDesc" }),
      [id],
    ),
  ) as
    | {
        _id: string;
        code?: string | null;
        datetime?: number | null;
        status: string;
      }[]
    | undefined;
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    species: "",
    breed: "",
    color: "",
    microchip: "",
    neutered: false,
    sex: "unknown" as "male" | "female" | "unknown",
    ownerId: "",
    dob: "",
  });
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [ownerSheetOpen, setOwnerSheetOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // removed weight history UI
  const [showIncompleteVisits, setShowIncompleteVisits] = useState(false);

  const parsedAnimal = useMemo(
    () => AnimalDocSchema.safeParse(animalUnknown),
    [animalUnknown],
  );

  useBreadcrumbRegistration(
    [
      { label: "Начало", href: "/" } satisfies BreadcrumbItem,
      { label: "Животни", href: "/animals" } satisfies BreadcrumbItem,
      parsedAnimal.success && parsedAnimal.data.name
        ? ({
            id: String(id),
            label: parsedAnimal.data.name,
            href: `/animals/${id}`,
            current: true,
          } satisfies BreadcrumbItem)
        : ({ label: "Животно", current: true } satisfies BreadcrumbItem),
    ].filter(Boolean) as BreadcrumbItem[],
  );

  function normalizeSex(input?: string | null): "male" | "female" | "unknown" {
    const v = String(input ?? "")
      .trim()
      .toLowerCase();
    if (v === "male" || v === "m") return "male";
    if (v === "female" || v === "f") return "female";
    return "unknown";
  }

  useEffect(() => {
    if (parsedAnimal.success) {
      const base = parsedAnimal.data as {
        ownerId?: string | null;
        sex?: "male" | "female" | "unknown" | null;
      } & typeof parsedAnimal.data;
      setForm({
        name: base.name ?? "",
        species: base.species ?? "",
        breed: base.breed ?? "",
        color: base.color ?? "",
        microchip: base.microchip ?? "",
        neutered: Boolean(base.neutered),
        sex: normalizeSex(base.sex),
        ownerId: base.ownerId ?? "",
        dob: base.dob ? new Date(base.dob).toISOString().slice(0, 10) : "",
      });
    }
  }, [parsedAnimal]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate form data
    const formData = {
      name: form.name.trim(),
      species: form.species.trim(),
      breed: form.breed.trim() || "",
      color: form.color.trim() || "",
      sex: form.sex,
      neutered: form.neutered,
      microchip: form.microchip.trim() || "",
      dob: form.dob || "",
      ownerId: form.ownerId || "",
    };
    
    const validationResult = animalFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError?.message ?? "Моля, попълнете всички задължителни полета");
      return;
    }

    setIsSaving(true);

    const res = (await update({
      id,
      name: form.name,
      species: form.species,
      breed: form.breed || null,
      color: form.color || null,
      microchip: form.microchip || null,
      neutered: form.neutered,
      sex: form.sex,
      dob:
        form.dob && !Number.isNaN(Date.parse(form.dob))
          ? Date.parse(form.dob)
          : null,
      ownerId: (form.ownerId || null) as Id<"owners"> | null,
    })) as { ok: boolean };

    setIsSaving(false);

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
    const res = (await createVisit({
      ownerId: form.ownerId as Id<"owners">,
      animalId: id,
      datetime: Date.now(),
      soap: {},
      procedures: [],
      medications: [],
    })) as { ok: boolean; id?: string; reason?: string } | undefined;
    if (res?.ok && res.id) {
      toast.success("Стартирано посещение");
      router.push(`/visits/${res.id}?step=1`);
      return;
    }
    if (res && res.reason === "draft_exists" && res.id) {
      toast.info("Има незавършено посещение за това животно");
      router.push(`/visits/${res.id}`);
      return;
    }
  }

  const summaryAge = form.dob
    ? differenceInYears(new Date(), new Date(form.dob))
    : null;

  const owner = form.ownerId
    ? (owners ?? []).find((o) => o._id === form.ownerId)
    : undefined;
  const visitsLoading = visits === undefined;
  const latestWeight = useMemo(() => {
    const v = (visits ?? []).find(
      (it: {
        _id: string;
        datetime?: number | null;
        createdAt?: number;
        weight?: number | null;
      }) => typeof it.weight === "number",
    );
    if (!v || typeof v.weight !== "number") return undefined;
    const when = v.datetime ?? v.createdAt ?? Date.now();
    return {
      _id: String(v._id),
      kg: Number(v.weight),
      notedAt: when,
      createdAt: v.createdAt ?? when,
    };
  }, [visits]);
  const lastVisit = (visits ?? [])[0];
  const draftVisit = (draftVisits ?? [])[0];
  const filteredVisits = useMemo(() => {
    const allVisits = visits ?? [];
    return showIncompleteVisits
      ? allVisits.filter((visit) => visit.status === "draft")
      : allVisits;
  }, [visits, showIncompleteVisits]);

  if (!parsedAnimal.success)
    return <main className="w-full p-6">Зареждане...</main>;

  return (
    <main className="w-full space-y-8 px-4 pt-6 pb-24 sm:px-6 sm:pb-28 lg:px-8 lg:pt-8 lg:pb-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <AnimalSummaryCard
          animal={parsedAnimal.data}
          owner={owner}
          summaryAge={summaryAge}
          latestWeight={latestWeight}
          lastVisit={lastVisit}
          visits={visits ?? []}
          isLoading={visitsLoading}
        />
        <div className="space-y-6 lg:col-start-2 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
          <AnimalControlsCard
            className="self-start lg:top-4"
            hasOwner={Boolean(owner)}
            hasDraftVisit={Boolean(draftVisit)}
            draftVisitId={draftVisit?._id}
            onStartVisit={onStartVisit}
            onResumeVisit={
              draftVisit
                ? () => router.push(`/visits/${draftVisit._id}`)
                : undefined
            }
            hasIncompleteVisit={(visits ?? []).some(
              (visit) => visit.status === "draft",
            )}
            onExport={async () => {
              try {
                const parsedAnimal = AnimalDocSchema.safeParse(animalUnknown);
                if (!parsedAnimal.success)
                  throw new Error("Invalid animal data");
                const animal = parsedAnimal.data;
                const ownerRecord = (owners ?? []).find(
                  (o) => o._id === form.ownerId,
                );
                const blob = await generateVaccinationCertificatePdf(animal, {
                  name: ownerRecord?.name ?? brand.nameBg,
                  phone: ownerRecord?.phone,
                  email: undefined,
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `vaccination-${id}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
                toast.success("PDF файлът е свален успешно");
              } catch (error) {
                console.error(error);
                toast.error("Неуспешно генериране на PDF");
              }
            }}
            exportLabel="Ваксинационен сертификат"
            onPrint={() => {
              try {
                const parsed = AnimalDocSchema.safeParse(animalUnknown);
                if (!parsed.success) throw new Error("Invalid animal data");
                const animal = parsed.data;
                const sexLabel =
                  animal.sex === "male"
                    ? "Мъжки"
                    : animal.sex === "female"
                      ? "Женски"
                      : "Неизвестен";
                const neuteredLabel = animal.neutered ? "Да" : "Не";
                const ageYears = summaryAge != null ? String(summaryAge) : "—";
                const ownerName = owner?.name ?? "";
                const ownerPhone = owner?.phone ?? "";
                const v5 = (visits ?? []).slice(0, 5);
                const esc = (t: unknown) => {
                  let s = "";
                  if (t == null) s = "";
                  else if (typeof t === "string") s = t;
                  else if (typeof t === "number" || typeof t === "boolean")
                    s = String(t);
                  return s
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                };
                const row = (label: string, value?: string) =>
                  value && value.trim().length > 0
                    ? `<tr><td class=\"label\">${esc(label)}</td><td>${esc(value)}</td></tr>`
                    : "";
                const visitRows = v5
                  .map((v) => {
                    const code = v.code ?? `#${String(v._id)}`;
                    const when = v.datetime ?? v.createdAt ?? Date.now();
                    const statusLabel =
                      v.status === "draft"
                        ? "Чернова"
                        : v.status === "finalized"
                          ? "Приключено"
                          : v.status;
                    const weight =
                      typeof v.weight === "number" ? `${v.weight} кг` : "—";
                    const temp =
                      typeof v.temperature === "number"
                        ? `${v.temperature} °C`
                        : "—";
                    const pulse =
                      typeof v.pulse === "number" ? String(v.pulse) : "—";
                    const procedures = (v.procedures ?? []).join(", ");
                    const medications = (v.medications ?? []).join(", ");
                    return `
                      <tr>
                        <td>${esc(code)}</td>
                        <td>${esc(statusLabel)}</td>
                        <td>${esc(fmtDateTimeBG(when))}</td>
                        <td>${esc(weight)}</td>
                        <td>${esc(temp)}</td>
                        <td>${esc(pulse)}</td>
                        <td>${esc(procedures)}</td>
                        <td>${esc(medications)}</td>
                      </tr>
                    `;
                  })
                  .join("");
                const html = `<!doctype html><html lang=\"bg\"><head><meta charset=\"utf-8\" />
                  <title>Животно ${esc(animal.name)}</title>
                  <style>
                    body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;color:#111}
                    h1{font-size:20px;margin:0 0 12px}
                    h2{font-size:16px;margin:18px 0 8px}
                    table{border-collapse:collapse;width:100%;margin-top:8px}
                    th,td{border:1px solid #ddd;padding:8px;vertical-align:top}
                    .label{color:#374151;width:220px;font-weight:600}
                    thead th{background:#f6f6f6;text-align:left}
                    @media print{a{color:inherit;text-decoration:none}}
                  </style></head><body>
                  <h1>Животно: ${esc(animal.name)}</h1>

                  <h2>Данни за животното</h2>
                  <table><tbody>
                    ${row("Име", animal.name)}
                    ${row("Вид", animal.species)}
                    ${row("Порода", animal.breed ?? "")}
                    ${row("Микрочип", animal.microchip ?? "")}
                    ${row("Пол", sexLabel)}
                    ${row("Кастриран/а", neuteredLabel)}
                    ${row("Дата на раждане", animal.dob ? fmtDateTimeBG(animal.dob) : "")}
                    ${row("Възраст (г.)", ageYears)}
                    ${row("Създадено", fmtDateTimeBG(animal.createdAt))}
                  </tbody></table>

                  ${
                    ownerName || ownerPhone
                      ? `
                    <h2>Притежател</h2>
                    <table><tbody>
                      ${row("Име", ownerName)}
                      ${row("Телефон", ownerPhone)}
                    </tbody></table>
                  `
                      : ""
                  }

                  <h2>Последни 5 посещения</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Код</th>
                        <th>Статус</th>
                        <th>Дата/час</th>
                        <th>Тегло</th>
                        <th>Температура</th>
                        <th>Пулс</th>
                        <th>Процедури</th>
                        <th>Медикаменти</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${visitRows || `<tr><td colspan=\\"8\\" class=\\"muted\\">(няма данни)</td></tr>`}
                    </tbody>
                  </table>

                  </body></html>`;
                const blob = new Blob([html], {
                  type: "text/html;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const w = window.open(url, "_blank");
                if (!w) {
                  URL.revokeObjectURL(url);
                  return;
                }
                const handleLoad = () => {
                  try {
                    w.focus();
                  } catch {}
                  w.print();
                  w.removeEventListener("load", handleLoad);
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                };
                w.addEventListener("load", handleLoad);
              } catch (error) {
                console.error(error);
                toast.error("Неуспешно подготвяне за печат");
              }
            }}
            onConfirmDelete={() => setConfirmDeleteOpen(true)}
            onBack={() => router.push("/animals")}
            disablePrimary={!owner && !draftVisit}
            isDeleting={isDeleting}
          />
          <SectionCard
            className="min-h-0 flex-1"
            title="Последни посещения"
            description="Проследете състоянието на посещенията и преминете директно към детайли."
            headerActions={[
              {
                label: showIncompleteVisits
                  ? "Всички посещения"
                  : "Само незавършени",
                variant: "ghost",
                onClick: () => setShowIncompleteVisits((value) => !value),
              },
            ]}
            footer={
              <Link
                href="/visits"
                className="text-primary hover:text-primary/80 inline-flex items-center gap-1"
              >
                Виж всички посещения
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="size-4"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            }
            layout="list"
            responsiveCollapsible
            defaultExpanded={false}
          >
            {visitsLoading ? (
              <SkeletonList rows={3} />
            ) : filteredVisits.length === 0 ? (
              <div className="text-muted-foreground py-3 text-sm">
                {showIncompleteVisits
                  ? "Няма незавършени посещения"
                  : "Няма посещения"}
              </div>
            ) : (
              filteredVisits.slice(0, 5).map((visit) => (
                <div
                  key={visit._id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <Link
                      href={`/visits/${visit._id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {visit.code ?? `#${visit._id}`}
                    </Link>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                      <span>{fmtDateTimeBG(visit.datetime ?? Date.now())}</span>
                      <span>
                        · {visit.status === "draft" ? "Чернова" : visit.status}
                      </span>
                      {owner?.name ? <span>· {owner.name}</span> : null}
                    </div>
                  </div>
                  <Link
                    href={`/visits/${visit._id}`}
                    className="text-primary text-xs font-medium underline underline-offset-2"
                  >
                    Детайli
                  </Link>
                </div>
              ))
            )}
          </SectionCard>
        </div>
      </div>
      <div
        id="animal-summary-sentinel"
        className="hidden lg:block"
        aria-hidden="true"
      />
      <SectionCard
        title="Основни данни"
        subtitle={form.name || "Без име"}
        description="Обновете основната информация за животното."
        responsiveCollapsible
        footerActions={[
          {
            label: isSaving ? "Запазване..." : "Запази",
            icon: <Save className="size-4" aria-hidden="true" />,
            onClick: () => formRef.current?.requestSubmit(),
          },
        ]}
      >
        <form
          ref={formRef}
          onSubmit={onSave}
          className="grid gap-6 md:grid-cols-2"
        >
          <div className="space-y-2.5">
            <Label htmlFor="name">Име *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="species">Вид</Label>
            <Input
              id="species"
              value={form.species}
              onChange={(e) =>
                setForm((f) => ({ ...f, species: e.target.value }))
              }
              placeholder="напр. Куче"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="breed">Порода</Label>
            <Input
              id="breed"
              value={form.breed}
              onChange={(e) =>
                setForm((f) => ({ ...f, breed: e.target.value }))
              }
              placeholder="напр. Лабрадор"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="color">Цвят</Label>
            <Input
              id="color"
              value={form.color}
              onChange={(e) =>
                setForm((f) => ({ ...f, color: e.target.value }))
              }
              placeholder="напр. Кафяв"
            />
          </div>
          <div className="space-y-2.5">
            <Label>Собственик</Label>
            <div className="flex items-start gap-2">
              <Dialog open={ownerSheetOpen} onOpenChange={setOwnerSheetOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between md:hidden"
                  >
                    {form.ownerId
                      ? (owners ?? []).find((o) => o._id === form.ownerId)?.name
                      : "Без собственик"}
                  </Button>
                </DialogTrigger>
                <DialogContent side="bottom" className="p-0">
                  <DialogHeader className="border-b px-4 py-3">
                    <DialogTitle>Изберете собственик</DialogTitle>
                  </DialogHeader>
                  <Command className="p-0">
                    <div className="px-4 py-3">
                      <CommandInput
                        placeholder="Търси собственик..."
                        autoFocus
                      />
                    </div>
                    <CommandList className="max-h-[60vh] overflow-y-auto">
                      <CommandEmpty className="text-muted-foreground px-4 py-6 text-center text-sm">
                        Няма резултати
                      </CommandEmpty>
                      {(owners ?? []).map((o) => (
                        <CommandItem
                          key={o._id}
                          value={o._id}
                          onSelect={(v) => {
                            setForm((f) => ({ ...f, ownerId: v }));
                            setOwnerSheetOpen(false);
                          }}
                          className="flex flex-col items-start gap-0.5 px-4 py-3 text-base"
                        >
                          <span className="font-medium">{o.name}</span>
                          {o.phone ? (
                            <span className="text-muted-foreground text-sm">
                              {o.phone}
                            </span>
                          ) : null}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </DialogContent>
              </Dialog>

              <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden w-full justify-between md:flex"
                  >
                    {form.ownerId
                      ? (owners ?? []).find((o) => o._id === form.ownerId)?.name
                      : "Без собственик"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Търси собственик..." autoFocus />
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
            {!form.ownerId && (
              <p className="text-muted-foreground text-xs">
                Ако собственикът липсва, можете да оставите полето празно или да
                добавите нов запис от секция „Собственици“.
              </p>
            )}
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="dob">Дата на раждане</Label>
            <Input
              id="dob"
              type="date"
              value={form.dob}
              onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="microchip">Микрочип</Label>
            <Input
              id="microchip"
              value={form.microchip}
              onChange={(e) =>
                setForm((f) => ({ ...f, microchip: e.target.value }))
              }
              placeholder="напр. 985112003178000"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="sex">Пол</Label>
            <Select
              key={`sex-${form.sex ?? "unknown"}`}
              value={form.sex ?? "unknown"}
              onValueChange={(value: "male" | "female" | "unknown") =>
                setForm((f) => ({ ...f, sex: value }))
              }
            >
              <SelectTrigger id="sex" className="h-9 w-full">
                <SelectValue placeholder="Пол" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Мъжки</SelectItem>
                <SelectItem value="female">Женски</SelectItem>
                <SelectItem value="unknown">Неизвестен</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="neutered">Стерилизиран</Label>
            <label className="flex items-center gap-2">
              <Checkbox
                id="neutered"
                checked={form.neutered}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, neutered: Boolean(checked) }))
                }
              />
              <span className="text-sm">Кастриран/а</span>
            </label>
          </div>
          <button type="submit" className="sr-only" aria-hidden="true">
            Запази
          </button>
        </form>
      </SectionCard>

      <section className="hidden lg:block">
        {/* Допълнителни секции (напр. бележки, процедури) ще бъдат добавени тук */}
      </section>
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изтрий животното?</AlertDialogTitle>
            <AlertDialogDescription>
              Това действие ще премахне записа за &bdquo;
              {form.name || "Без име"}
              &ldquo; и свързаните посещения могат да бъдат недостъпни. Сигурни
              ли сте?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отказ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={async () => {
                try {
                  setIsDeleting(true);
                  const result = (await removeAnimal({
                    id,
                  })) as { ok: boolean; reason?: string };
                  if (!result?.ok) {
                    toast.error(
                      result?.reason === "not_found"
                        ? "Записът не беше намерен"
                        : "Неуспешно изтриване",
                    );
                    return;
                  }
                  toast.success("Животното е изтрито");
                  setConfirmDeleteOpen(false);
                  router.push("/animals");
                } catch (error) {
                  console.error(error);
                  toast.error("Неуспешно изтриване на животното");
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? "Изтриване..." : "Изтрий"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
