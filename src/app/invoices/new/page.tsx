"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { useRouter, useSearchParams } from "next/navigation";
import { fmtNumberBG, fmtDateTimeBG } from "@/lib/format";
import type { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import { CalendarCheck } from "lucide-react";
import { invoiceFormSchema } from "@/lib/validation/invoice";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";

function NewInvoicePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [ownerSearch, setOwnerSearch] = useState("");
  const [animalSearch, setAnimalSearch] = useState("");
  const [visitSearch, setVisitSearch] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const ownersQuery = useQuery(
    api.owners.list,
    useMemo(() => ({ search: ownerSearch }), [ownerSearch]),
  );
  const ownersResult = ownersQuery as
    | { items: { _id: string; name: string; phone: string }[]; total: number; hasMore: boolean }
    | undefined;
  const owners = ownersResult?.items;
  const animalsQuery = useQuery(
    api.animals.list,
    useMemo(() => ({ search: animalSearch }), [animalSearch]),
  );
  const animalsResult = animalsQuery as
    | {
        items: { _id: string; name: string; species: string; ownerId?: string | null }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const animals = animalsResult?.items;
  const visitsQuery = useQuery(
    api.visits.list,
    useMemo(
      () => ({
        search: visitSearch,
        limit: 50,
        sort: "datetimeDesc",
        ownerId: ownerId ? (ownerId as Id<"owners">) : undefined,
        animalId: animalId ? (animalId as Id<"animals">) : undefined,
      }),
      [visitSearch, ownerId, animalId],
    ),
  );
  const visitsResult = visitsQuery as
    | {
        items: {
          _id: string;
          code?: string | null;
          datetime?: number | null;
          createdAt: number;
        }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const visits = visitsResult?.items;
  const create = useMutation(api.invoices.create) as unknown as (args: {
    ownerId: string;
    animalId?: string;
    visitId?: string;
    items: {
      description: string;
      quantity: number;
      price: number;
      total: number;
    }[];
  }) => Promise<{ ok: boolean; id: string }>;
  const markPaid = useMutation(api.invoices.markPaid) as unknown as (args: {
    id: string;
  }) => Promise<{ ok: boolean }>;

  const [items, setItems] = useState<
    { description: string; quantity: string; price: string; total: number }[]
  >([{ description: "", quantity: "1", price: "0", total: 0 }]);
  const [visitId, setVisitId] = useState("");
  const visit = useQuery(
    api.visits.getById,
    visitId ? { id: visitId as Id<"visits"> } : "skip",
  ) as { procedures?: string[]; medications?: string[] } | undefined;
  const procSuggestions = useQuery(
    api.visits.suggestProcedures,
    useMemo(() => ({ limit: 8 }), []),
  ) as string[] | undefined;
  const medSuggestions = useQuery(
    api.visits.suggestMedications,
    useMemo(() => ({ limit: 8 }), []),
  ) as string[] | undefined;
  const [markPaidNow, setMarkPaidNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prefilledFromVisit, setPrefilledFromVisit] = useState(false);
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [animalPopoverOpen, setAnimalPopoverOpen] = useState(false);
  const [visitPopoverOpen, setVisitPopoverOpen] = useState(false);

  useBreadcrumbRegistration([
    { label: "Начало", href: "/" } satisfies BreadcrumbItem,
    { label: "Фактури", href: "/invoices" } satisfies BreadcrumbItem,
    {
      label: "Нова фактура",
      href: "/invoices/new",
      current: true,
    } satisfies BreadcrumbItem,
  ]);

  // Prefill from query params
  useEffect(() => {
    const qpOwner = params.get("ownerId") ?? "";
    const qpAnimal = params.get("animalId") ?? "";
    const qpVisit = params.get("visitId") ?? "";
    if (qpOwner) setOwnerId(qpOwner);
    if (qpAnimal) setAnimalId(qpAnimal);
    if (qpVisit) setVisitId(qpVisit);
  }, [params]);

  function recalcTotal(
    idx: number,
    next?: Partial<{ description: string; quantity: string; price: string }>,
  ) {
    setItems((arr) => {
      const copy = arr.map((it) => ({ ...it }));
      const target = copy[idx];
      if (!target) return arr;
      if (next?.description !== undefined)
        target.description = next.description;
      if (next?.quantity !== undefined) target.quantity = next.quantity;
      if (next?.price !== undefined) target.price = next.price;
      const q = parseFloat(target.quantity || "0");
      const p = parseFloat(target.price || "0");
      target.total = Number.isFinite(q * p) ? q * p : 0;
      return copy;
    });
  }

  // Auto-prefill items from visit once when visitId is provided and visit data loads
  useEffect(() => {
    if (!visitId || !visit || prefilledFromVisit) return;
    const baseItems = [
      ...(visit.procedures ?? []).map((name) => ({
        description: name,
        quantity: "1",
        price: "0",
        total: 0,
      })),
      ...(visit.medications ?? []).map((name) => ({
        description: name,
        quantity: "1",
        price: "0",
        total: 0,
      })),
    ];
    // Only override initial blank row to avoid clobbering user edits
    const first = items[0];
    const isPristine =
      items.length === 1 &&
      first &&
      !first.description.trim() &&
      parseFloat(first.price || "0") === 0 &&
      parseFloat(first.quantity || "1") === 1 &&
      first.total === 0;
    if (baseItems.length > 0 && isPristine) {
      setItems(baseItems);
      setPrefilledFromVisit(true);
      toast.success("Добавени редове от посещението");
    }
  }, [visitId, visit, prefilledFromVisit, items]);

  // Prefill from query params (single-run during first render)
  if (!ownerId) {
    const qpOwner = params.get("ownerId") ?? "";
    if (qpOwner) setOwnerId(qpOwner);
  }
  if (!animalId) {
    const qpAnimal = params.get("animalId") ?? "";
    if (qpAnimal) setAnimalId(qpAnimal);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate invoice data
    const payloadItems = items
      .filter((it) => it.description.trim())
      .map((it) => ({
        description: it.description.trim(),
        quantity: parseFloat(it.quantity || "0"),
        price: parseFloat(it.price || "0"),
        total: it.total,
      }));
    
    const invoiceData = {
      ownerId: ownerId || "",
      animalId: animalId || "",
      visitId: visitId || "",
      items: payloadItems,
    };
    
    // Validate using schema
    const validationResult = invoiceFormSchema.safeParse(invoiceData);
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError?.message ?? "Моля, попълнете всички задължителни полета");
      return;
    }
    
    try {
      setSubmitting(true);
      const res = (await create({
        ownerId: validationResult.data.ownerId,
        animalId: validationResult.data.animalId?.trim() ? validationResult.data.animalId : undefined,
        visitId: validationResult.data.visitId?.trim() ? validationResult.data.visitId : undefined,
        items: validationResult.data.items,
      })) as { ok: boolean; id: string; code?: string };
      if (res?.ok && res.id) {
        if (markPaidNow) {
          await markPaid({ id: res.id });
        }
        toast.success(`Създадена фактура ${res.code ?? res.id}`);
        router.push(`/invoices/${res.id}`);
      } else {
        toast.error("Неуспешно създаване на фактура");
      }
    } catch (err) {
      console.error(err);
      toast.error("Възникна грешка при създаването");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Нова фактура</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div>
            <Label>Собственик</Label>
            <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {ownerId
                    ? (owners ?? []).find((o) => o._id === ownerId)?.name
                    : "Изберете собственик"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Търси собственик..."
                    value={ownerSearch}
                    onValueChange={setOwnerSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Няма резултати</CommandEmpty>
                    {(owners ?? []).map((o) => (
                      <CommandItem
                        key={o._id}
                        value={o._id}
                        onSelect={(v) => {
                          setOwnerId(v);
                          setOwnerPopoverOpen(false);
                        }}
                      >
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
            <Popover open={animalPopoverOpen} onOpenChange={setAnimalPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {animalId
                    ? (animals ?? []).find((a) => a._id === animalId)?.name
                    : "Без животно"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Търси животно..."
                    value={animalSearch}
                    onValueChange={setAnimalSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Няма резултати</CommandEmpty>
                    {(animals ?? [])
                      .filter(
                        (an) =>
                          !ownerId || String(an.ownerId) === String(ownerId),
                      )
                      .map((an) => (
                        <CommandItem
                          key={an._id}
                          value={an._id}
                          onSelect={(v) => {
                            setAnimalId(v);
                            setAnimalPopoverOpen(false);
                          }}
                        >
                          {an.name} ({an.species})
                        </CommandItem>
                      ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Посещение</Label>
            <Popover open={visitPopoverOpen} onOpenChange={setVisitPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {visitId
                    ? (() => {
                        const selectedVisit = (visits ?? []).find((v) => v._id === visitId);
                        return selectedVisit
                          ? `${selectedVisit.code ?? `#${selectedVisit._id}`} - ${fmtDateTimeBG(selectedVisit.datetime ?? selectedVisit.createdAt)}`
                          : "Без посещение";
                      })()
                    : "Без посещение"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Търси посещение..."
                    value={visitSearch}
                    onValueChange={setVisitSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Няма резултати</CommandEmpty>
                    {visitId && (
                      <CommandItem
                        value="__clear__"
                        onSelect={() => {
                          setVisitId("");
                          setVisitPopoverOpen(false);
                        }}
                      >
                        <span className="text-muted-foreground">Без посещение</span>
                      </CommandItem>
                    )}
                    {(visits ?? []).map((v) => (
                      <CommandItem
                        key={v._id}
                        value={v._id}
                        onSelect={(val) => {
                          setVisitId(val);
                          setVisitPopoverOpen(false);
                        }}
                      >
                        <CalendarCheck className="mr-2 size-4 flex-shrink-0" aria-hidden />
                        <span className="truncate">
                          {v.code ?? `#${v._id}`} - {fmtDateTimeBG(v.datetime ?? v.createdAt)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="divide-y rounded-md border">
          {items.map((it, idx) => {
            const qtyNum = parseFloat(it.quantity || "0");
            const priceNum = parseFloat(it.price || "0");
            const hasQtyError = it.quantity && (isNaN(qtyNum) || qtyNum <= 0 || !Number.isInteger(qtyNum) || qtyNum > 9999);
            const hasPriceError = it.price && (isNaN(priceNum) || priceNum < 0 || priceNum > 999999.99);
            
            return (
              <div key={idx} className="grid items-end gap-2 p-3 md:grid-cols-5">
                <div className="md:col-span-2">
                  <FormField
                    label="Описание"
                    htmlFor={`desc-${idx}`}
                    error={it.description.trim() && it.description.length > 200 ? "Описанието не може да надвишава 200 символа" : undefined}
                    hint={idx === 0 ? "Въведете описание на услугата или продукта" : undefined}
                  >
                    <Input
                      id={`desc-${idx}`}
                      value={it.description}
                      onChange={(e) =>
                        recalcTotal(idx, { description: e.target.value })
                      }
                      aria-invalid={it.description.trim() && it.description.length > 200 ? true : undefined}
                    />
                  </FormField>
                </div>
                <div>
                  <FormField
                    label="Кол-во"
                    htmlFor={`qty-${idx}`}
                    error={hasQtyError ? "Количеството трябва да е положително цяло число (макс. 9999)" : undefined}
                    hint="Въведете количество"
                  >
                    <Input
                      id={`qty-${idx}`}
                      inputMode="decimal"
                      value={it.quantity}
                      onChange={(e) =>
                        recalcTotal(idx, { quantity: e.target.value })
                      }
                      aria-invalid={!!hasQtyError}
                    />
                  </FormField>
                </div>
                <div>
                  <FormField
                    label="Цена"
                    htmlFor={`price-${idx}`}
                    error={hasPriceError ? "Цената трябва да е неотрицателно число (макс. 999999.99)" : undefined}
                    hint="Въведете цена в BGN"
                  >
                    <Input
                      id={`price-${idx}`}
                      inputMode="decimal"
                      value={it.price}
                      onChange={(e) => recalcTotal(idx, { price: e.target.value })}
                      aria-invalid={!!hasPriceError}
                    />
                  </FormField>
                </div>
                <div className="text-right">
                  {Number.isFinite(it.total) ? it.total.toFixed(2) : "0.00"} BGN
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2 p-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setItems((arr) => [
                  ...arr,
                  { description: "", quantity: "1", price: "0", total: 0 },
                ])
              }
            >
              Добави ред
            </Button>
            {visit &&
            (visit.procedures?.length || visit.medications?.length) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setItems((arr) => {
                    const next = [...arr];
                    const add = (name: string) => {
                      next.push({
                        description: name,
                        quantity: "1",
                        price: "0",
                        total: 0,
                      });
                    };
                    (visit.procedures ?? []).forEach(add);
                    (visit.medications ?? []).forEach(add);
                    return next;
                  });
                }}
              >
                Добави от посещение
              </Button>
            ) : null}
          </div>
          {(procSuggestions ?? []).length > 0 ||
          (medSuggestions ?? []).length > 0 ? (
            <div className="space-y-2 p-3">
              {(procSuggestions ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2 text-xs">
                  {(procSuggestions ?? []).map((name, i) => (
                    <button
                      key={`proc-${i}`}
                      type="button"
                      className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
                      onClick={() =>
                        setItems((arr) => [
                          ...arr,
                          {
                            description: name,
                            quantity: "1",
                            price: "0",
                            total: 0,
                          },
                        ])
                      }
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : null}
              {(medSuggestions ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2 text-xs">
                  {(medSuggestions ?? []).map((name, i) => (
                    <button
                      key={`med-${i}`}
                      type="button"
                      className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
                      onClick={() =>
                        setItems((arr) => [
                          ...arr,
                          {
                            description: name,
                            quantity: "1",
                            price: "0",
                            total: 0,
                          },
                        ])
                      }
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Общо:{" "}
            {fmtNumberBG(
              items.reduce(
                (s, it) => s + (Number.isFinite(it.total) ? it.total : 0),
                0,
              ),
              { style: "currency", currency: "BGN" },
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={markPaidNow}
                onChange={(e) => setMarkPaidNow(e.target.checked)}
              />{" "}
              Маркирай платена
            </label>
            <Button
              type="submit"
              disabled={!ownerId || submitting}
              aria-disabled={!ownerId || submitting}
            >
              {submitting ? "Създаване..." : "Създай"}
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Назад
          </Button>
        </div>
      </form>
    </main>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={<main className="mx-auto max-w-3xl p-6">Зареждане...</main>}
    >
      <NewInvoicePageInner />
    </Suspense>
  );
}
