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
  const [customerSearch, setCustomerSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [visitSearch, setVisitSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const customersQuery = useQuery(
    api.customers.list,
    useMemo(() => ({ search: customerSearch }), [customerSearch]),
  );
  const customersResult = customersQuery as
    | {
        items: { _id: string; name: string; phone: string }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const customers = customersResult?.items;
  const vehiclesQuery = useQuery(
    api.vehicles.list,
    useMemo(() => ({ search: vehicleSearch }), [vehicleSearch]),
  );
  const vehiclesResult = vehiclesQuery as
    | {
        items: {
          _id: string;
          licensePlate: string;
          make: string;
          customerId?: string | null;
        }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const vehicles = vehiclesResult?.items;
  const visitsQuery = useQuery(
    api.visits.list,
    useMemo(
      () => ({
        search: visitSearch,
        limit: 50,
        sort: "datetimeDesc",
        customerId: customerId ? (customerId as Id<"customers">) : undefined,
        vehicleId: vehicleId ? (vehicleId as Id<"vehicles">) : undefined,
      }),
      [visitSearch, customerId, vehicleId],
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
    customerId: string;
    vehicleId?: string;
    visitId?: string;
    parts: {
      name: string;
      quantity: number;
      price: number;
    }[];
    labor: {
      name: string;
      quantity: number;
      price: number;
    }[];
  }) => Promise<{ ok: boolean; id: string; code?: string }>;
  const markPaid = useMutation(api.invoices.markPaid) as unknown as (args: {
    id: string;
  }) => Promise<{ ok: boolean }>;

  const [parts, setParts] = useState<
    { name: string; quantity: string; price: string; total: number }[]
  >([{ name: "", quantity: "1", price: "0", total: 0 }]);
  const [labor, setLabor] = useState<
    { name: string; quantity: string; price: string; total: number }[]
  >([{ name: "", quantity: "1", price: "0", total: 0 }]);
  
  const [visitId, setVisitId] = useState("");
  const visit = useQuery(
    api.visits.getById,
    visitId ? { id: visitId as Id<"visits"> } : "skip",
  ) as { services?: string[]; parts?: string[] } | undefined;
  const [markPaidNow, setMarkPaidNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prefilledFromVisit, setPrefilledFromVisit] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [vehiclePopoverOpen, setVehiclePopoverOpen] = useState(false);
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
    const qpCustomer = params.get("customerId") ?? "";
    const qpVehicle = params.get("vehicleId") ?? "";
    const qpVisit = params.get("visitId") ?? "";
    if (qpCustomer) setCustomerId(qpCustomer);
    if (qpVehicle) setVehicleId(qpVehicle);
    if (qpVisit) setVisitId(qpVisit);
  }, [params]);

  function recalcTotal(
    idx: number,
    type: "parts" | "labor",
    next?: Partial<{ name: string; quantity: string; price: string }>,
  ) {
    const setter = type === "parts" ? setParts : setLabor;
    setter((arr) => {
      const copy = arr.map((it) => ({ ...it }));
      const target = copy[idx];
      if (!target) return arr;
      if (next?.name !== undefined)
        target.name = next.name;
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
    const baseParts = (visit.parts ?? []).map((name) => ({
      name,
      quantity: "1",
      price: "0",
      total: 0,
    }));
    const baseLabor = (visit.services ?? []).map((name) => ({
      name,
      quantity: "1",
      price: "0",
      total: 0,
    }));

    const firstPart = parts[0];
    const isPartsPristine =
      parts.length === 1 &&
      firstPart &&
      !firstPart.name.trim() &&
      parseFloat(firstPart.price || "0") === 0 &&
      parseFloat(firstPart.quantity || "1") === 1 &&
      firstPart.total === 0;

    const firstLabor = labor[0];
    const isLaborPristine =
      labor.length === 1 &&
      firstLabor &&
      !firstLabor.name.trim() &&
      parseFloat(firstLabor.price || "0") === 0 &&
      parseFloat(firstLabor.quantity || "1") === 1 &&
      firstLabor.total === 0;

    if (baseParts.length > 0 && isPartsPristine) {
      setParts(baseParts);
    }
    if (baseLabor.length > 0 && isLaborPristine) {
      setLabor(baseLabor);
    }

    if ((baseParts.length > 0 && isPartsPristine) || (baseLabor.length > 0 && isLaborPristine)) {
      setPrefilledFromVisit(true);
      toast.success("Добавени редове от посещението");
    }
  }, [visitId, visit, prefilledFromVisit, parts, labor]);

  // Prefill from query params (single-run during first render)
  if (!customerId) {
    const qpCustomer = params.get("customerId") ?? "";
    if (qpCustomer) setCustomerId(qpCustomer);
  }
  if (!vehicleId) {
    const qpVehicle = params.get("vehicleId") ?? "";
    if (qpVehicle) setVehicleId(qpVehicle);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate invoice data
    const payloadParts = parts
      .filter((it) => it.name.trim())
      .map((it) => ({
        name: it.name.trim(),
        quantity: parseFloat(it.quantity || "0"),
        price: parseFloat(it.price || "0"),
      }));

    const payloadLabor = labor
      .filter((it) => it.name.trim())
      .map((it) => ({
        name: it.name.trim(),
        quantity: parseFloat(it.quantity || "0"),
        price: parseFloat(it.price || "0"),
      }));

    const invoiceData = {
      customerId: customerId || "",
      vehicleId: vehicleId || "",
      visitId: visitId || "",
      parts: payloadParts,
      labor: payloadLabor,
    };

    // Validate using schema
    const validationResult = invoiceFormSchema.safeParse(invoiceData);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(
        firstError?.message ?? "Моля, попълнете всички задължителни полета",
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await create({
        customerId: validationResult.data.customerId,
        vehicleId: validationResult.data.vehicleId?.trim()
          ? validationResult.data.vehicleId
          : undefined,
        visitId: validationResult.data.visitId?.trim()
          ? validationResult.data.visitId
          : undefined,
        parts: validationResult.data.parts ?? [],
        labor: validationResult.data.labor ?? [],
      });
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
      <h1 className="text-xl font-semibold sm:text-2xl md:text-3xl">
        Нова фактура
      </h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div>
            <Label>Клиент</Label>
            <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {customerId
                    ? (customers ?? []).find((o) => o._id === customerId)?.name
                    : "Изберете клиент"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Търси клиент..."
                    value={customerSearch}
                    onValueChange={setCustomerSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Няма резултати</CommandEmpty>
                    {(customers ?? []).map((o) => (
                      <CommandItem
                        key={o._id}
                        value={o._id}
                        onSelect={(v) => {
                          setCustomerId(v);
                          setCustomerPopoverOpen(false);
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
            <Label>Автомобил</Label>
            <Popover
              open={vehiclePopoverOpen}
              onOpenChange={setVehiclePopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {vehicleId
                    ? (vehicles ?? []).find((a) => a._id === vehicleId)?.licensePlate
                    : "Без автомобил"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput
                    placeholder="Търси автомобил..."
                    value={vehicleSearch}
                    onValueChange={setVehicleSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Няма резултати</CommandEmpty>
                    {(vehicles ?? [])
                      .filter(
                        (an) =>
                          !customerId || String(an.customerId) === String(customerId),
                      )
                      .map((an) => (
                        <CommandItem
                          key={an._id}
                          value={an._id}
                          onSelect={(v) => {
                            setVehicleId(v);
                            setVehiclePopoverOpen(false);
                          }}
                        >
                          {an.licensePlate} ({an.make})
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
                        const selectedVisit = (visits ?? []).find(
                          (v) => v._id === visitId,
                        );
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
                        <span className="text-muted-foreground">
                          Без посещение
                        </span>
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
                        <CalendarCheck
                          className="mr-2 size-4 flex-shrink-0"
                          aria-hidden
                        />
                        <span className="truncate">
                          {v.code ?? `#${v._id}`} -{" "}
                          {fmtDateTimeBG(v.datetime ?? v.createdAt)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="divide-y rounded-md border mt-4">
          <div className="bg-muted/50 p-2 font-semibold">Части</div>
          {parts.map((it, idx) => {
            const qtyNum = parseFloat(it.quantity || "0");
            const priceNum = parseFloat(it.price || "0");
            const hasQtyError =
              it.quantity &&
              (isNaN(qtyNum) ||
                qtyNum <= 0 ||
                !Number.isInteger(qtyNum) ||
                qtyNum > 9999);
            const hasPriceError =
              it.price &&
              (isNaN(priceNum) || priceNum < 0 || priceNum > 999999.99);

            return (
              <div
                key={`part-${idx}`}
                className="grid items-end gap-2 p-3 md:grid-cols-5"
              >
                <div className="md:col-span-2">
                  <FormField
                    label="Описание"
                    htmlFor={`part-desc-${idx}`}
                    error={
                      it.name.trim() && it.name.length > 200
                        ? "Описанието не може да надвишава 200 символа"
                        : undefined
                    }
                    hint={
                      idx === 0
                        ? "Въведете описание на частта"
                        : undefined
                    }
                  >
                    <Input
                      id={`part-desc-${idx}`}
                      value={it.name}
                      onChange={(e) =>
                        recalcTotal(idx, "parts", { name: e.target.value })
                      }
                      aria-invalid={
                        it.name.trim() && it.name.length > 200
                          ? true
                          : undefined
                      }
                    />
                  </FormField>
                </div>
                <div>
                  <FormField
                    label="Кол-во"
                    htmlFor={`part-qty-${idx}`}
                    error={
                      hasQtyError
                        ? "Количеството трябва да е положително цяло число (макс. 9999)"
                        : undefined
                    }
                    hint="Въведете количество"
                  >
                    <Input
                      id={`part-qty-${idx}`}
                      inputMode="decimal"
                      value={it.quantity}
                      onChange={(e) =>
                        recalcTotal(idx, "parts", { quantity: e.target.value })
                      }
                      aria-invalid={!!hasQtyError}
                    />
                  </FormField>
                </div>
                <div>
                  <FormField
                    label="Цена"
                    htmlFor={`part-price-${idx}`}
                    error={
                      hasPriceError
                        ? "Цената трябва да е неотрицателно число (макс. 999999.99)"
                        : undefined
                    }
                    hint="Въведете цена в BGN"
                  >
                    <Input
                      id={`part-price-${idx}`}
                      inputMode="decimal"
                      value={it.price}
                      onChange={(e) =>
                        recalcTotal(idx, "parts", { price: e.target.value })
                      }
                      aria-invalid={!!hasPriceError}
                    />
                  </FormField>
                </div>
                <div className="text-right">
                  {fmtNumberBG(it.total, {
                    style: "currency",
                    currency: "BGN",
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2 p-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setParts((arr) => [
                  ...arr,
                  { name: "", quantity: "1", price: "0", total: 0 },
                ])
              }
            >
              Добави ред за част
            </Button>
            {visit &&
            (visit.parts?.length) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setParts((arr) => {
                    const next = [...arr];
                    const add = (name: string) => {
                      next.push({
                        name: name,
                        quantity: "1",
                        price: "0",
                        total: 0,
                      });
                    };
                    (visit.parts ?? []).forEach(add);
                    return next;
                  });
                }}
              >
                Добави от посещение
              </Button>
            ) : null}
          </div>
        </div>

        <div className="divide-y rounded-md border mt-2">
          <div className="bg-muted/50 p-2 font-semibold">Труд/Услуги</div>
          {labor.map((it, idx) => {
            const qtyNum = parseFloat(it.quantity || "0");
            const priceNum = parseFloat(it.price || "0");
            const hasQtyError =
              it.quantity &&
              (isNaN(qtyNum) ||
                qtyNum <= 0 ||
                !Number.isInteger(qtyNum) ||
                qtyNum > 9999);
            const hasPriceError =
              it.price &&
              (isNaN(priceNum) || priceNum < 0 || priceNum > 999999.99);

            return (
              <div
                key={`labor-${idx}`}
                className="grid items-end gap-2 p-3 md:grid-cols-5"
              >
                <div className="md:col-span-2">
                  <FormField
                    label="Описание"
                    htmlFor={`labor-desc-${idx}`}
                    error={
                      it.name.trim() && it.name.length > 200
                        ? "Описанието не може да надвишава 200 символа"
                        : undefined
                    }
                    hint={
                      idx === 0
                        ? "Въведете описание на услугата"
                        : undefined
                    }
                  >
                    <Input
                      id={`labor-desc-${idx}`}
                      value={it.name}
                      onChange={(e) =>
                        recalcTotal(idx, "labor", { name: e.target.value })
                      }
                      aria-invalid={
                        it.name.trim() && it.name.length > 200
                          ? true
                          : undefined
                      }
                    />
                  </FormField>
                </div>
                <div>
                  <FormField
                    label="Кол-во"
                    htmlFor={`labor-qty-${idx}`}
                    error={
                      hasQtyError
                        ? "Количеството трябва да е положително цяло число (макс. 9999)"
                        : undefined
                    }
                    hint="Въведете количество"
                  >
                    <Input
                      id={`labor-qty-${idx}`}
                      inputMode="decimal"
                      value={it.quantity}
                      onChange={(e) =>
                        recalcTotal(idx, "labor", { quantity: e.target.value })
                      }
                      aria-invalid={!!hasQtyError}
                    />
                  </FormField>
                </div>
                <div>
                  <FormField
                    label="Цена"
                    htmlFor={`labor-price-${idx}`}
                    error={
                      hasPriceError
                        ? "Цената трябва да е неотрицателно число (макс. 999999.99)"
                        : undefined
                    }
                    hint="Въведете цена в BGN"
                  >
                    <Input
                      id={`labor-price-${idx}`}
                      inputMode="decimal"
                      value={it.price}
                      onChange={(e) =>
                        recalcTotal(idx, "labor", { price: e.target.value })
                      }
                      aria-invalid={!!hasPriceError}
                    />
                  </FormField>
                </div>
                <div className="text-right">
                  {fmtNumberBG(it.total, {
                    style: "currency",
                    currency: "BGN",
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2 p-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setLabor((arr) => [
                  ...arr,
                  { name: "", quantity: "1", price: "0", total: 0 },
                ])
              }
            >
              Добави ред за труд
            </Button>
            {visit &&
            (visit.services?.length) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLabor((arr) => {
                    const next = [...arr];
                    const add = (name: string) => {
                      next.push({
                        name: name,
                        quantity: "1",
                        price: "0",
                        total: 0,
                      });
                    };
                    (visit.services ?? []).forEach(add);
                    return next;
                  });
                }}
              >
                Добави от посещение
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-muted-foreground text-sm">
            Общо:{" "}
            {fmtNumberBG(
              [...parts, ...labor].reduce(
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
              disabled={!customerId || submitting}
              aria-disabled={!customerId || submitting}
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