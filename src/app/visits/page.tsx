"use client";
import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle, FilePlus, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import type { VisitDoc } from "@/types/visit";
import { fmtDateTimeBG } from "@/lib/format";
import type { Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { VisitStatusBadge } from "@/components/StatusBadge";
import { SkeletonList } from "../../components/SkeletonList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";

function VisitsPageInner() {
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<"datetimeDesc" | "datetimeAsc">(
    "datetimeDesc",
  );
  const pageSize = 10;

  useBreadcrumbRegistration([
    { label: "Начало", href: "/" } satisfies BreadcrumbItem,
    {
      label: "Посещения",
      href: "/visits",
      current: true,
    } satisfies BreadcrumbItem,
  ]);

  const visitsQuery = useQuery(
    api.visits.list,
    useMemo(
      () => ({
        limit: pageSize,
        offset: page * pageSize,
        sort,
        status: status || undefined,
        customerId: customerId ? (customerId as Id<"customers">) : undefined,
        vehicleId: vehicleId ? (vehicleId as Id<"vehicles">) : undefined,
        from: from ? Date.parse(from) : undefined,
        to: to ? Date.parse(to) : undefined,
      }),
      [status, customerId, vehicleId, from, to, page, sort],
    ),
  );
  const visits = visitsQuery as
    | { items: VisitDoc[]; total: number; hasMore: boolean }
    | undefined;
  const visitsList = visits?.items ?? undefined;
  const createVisit = useMutation(api.visits.create) as unknown as (args: {
    customerId: string;
    vehicleId?: string;
    notes: { issue?: string; inspection?: string; diagnosis?: string; plan?: string };
  }) => Promise<{ ok: boolean; id?: string; reason?: string }>;
  const finalizeVisit = useMutation(api.visits.finalize) as unknown as (args: {
    id: string;
  }) => Promise<{ ok: boolean }>;

  const totalPages = useMemo(() => {
    const total = visits?.total ?? 0;
    return total > 0 ? Math.ceil(total / pageSize) : 1;
  }, [visits?.total, pageSize]);

  const params = useSearchParams();
  useEffect(() => {
    const c = params.get("customerId") ?? "";
    const v = params.get("vehicleId") ?? "";
    const s = params.get("status") ?? ""; // "draft" | "finalized"
    if (c) setCustomerId(c);
    if (v) setVehicleId(v);
    if (s === "draft" || s === "finalized") setStatus(s);
  }, [params]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");

  const customersQuery = useQuery(
    api.customers.list,
    useMemo(() => ({ search: customerSearch }), [customerSearch]),
  );
  const customersResult = customersQuery as
    | { items: { _id: string; name: string; phone: string }[]; total: number; hasMore: boolean }
    | undefined;
  const customers = customersResult?.items;
  const vehiclesQuery = useQuery(
    api.vehicles.list,
    useMemo(() => ({ search: vehicleSearch }), [vehicleSearch]),
  );
  const vehiclesResult = vehiclesQuery as
    | {
        items: { _id: string; licensePlate: string; make: string; customerId?: string | null }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const vehicles = vehiclesResult?.items;

  async function onCreateNewVisit() {
    if (!customerId) {
      toast.error("Изберете клиент (customerId)");
      return;
    }
    if (!vehicleId) {
      toast.error("Изберете автомобил (vehicleId)");
      return;
    }
    const res = await createVisit({
      customerId,
      vehicleId: vehicleId || undefined,
      notes: {},
    });
    if (res?.ok && res.id) {
      toast.success("Посещението е създадено");
      window.location.href = `/visits/${res.id}?step=1`;
      return;
    }
    if (res && res.reason === "draft_exists" && res.id) {
      toast.info("Има незавършено посещение за този автомобил, пренасочване...");
      setTimeout(() => {
        window.location.href = `/visits/${res.id}`;
      }, 4000);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
        <div className="flex w-full items-center gap-2 md:w-auto">
          <CalendarCheck className="text-primary size-5" />
          <h1 className="text-xl font-semibold sm:text-2xl md:text-3xl">
            Посещения: {visits?.total ?? 0}
          </h1>
        </div>
        <Button
          type="button"
          onClick={() => void onCreateNewVisit()}
          className="w-full md:w-auto"
        >
          Ново посещение
        </Button>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="grid grid-cols-1 gap-3 sm:col-span-2 md:grid-cols-2">
          <div>
            <Label>Клиент</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 min-h-[44px] w-full justify-between"
                >
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
                    onValueChange={(v) => {
                      setCustomerSearch(v);
                      setPage(0);
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>Няма резултати</CommandEmpty>
                    {(customers ?? []).map((o) => (
                      <CommandItem
                        key={o._id}
                        value={o._id}
                        onSelect={(v) => {
                          setCustomerId(v);
                          setVehicleId("");
                          setPage(0);
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 min-h-[44px] w-full justify-between"
                >
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
                    onValueChange={(v) => {
                      setVehicleSearch(v);
                      setPage(0);
                    }}
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
                            const chosen = (vehicles ?? []).find(
                              (x) => x._id === v,
                            );
                            if (chosen?.customerId)
                              setCustomerId(String(chosen.customerId));
                            setPage(0);
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
        </div>
        <div className="grid grid-cols-1 gap-3 sm:col-span-2 md:grid-cols-4">
          <div>
            <Label>Статус</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 min-h-[44px] w-full justify-between"
                >
                  {status || "Всички"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandList>
                    <CommandItem
                      onSelect={() => {
                        setStatus("");
                        setPage(0);
                      }}
                    >
                      Всички
                    </CommandItem>
                    <CommandItem
                      onSelect={() => {
                        setStatus("draft");
                        setPage(0);
                      }}
                    >
                      Чернова
                    </CommandItem>
                    <CommandItem
                      onSelect={() => {
                        setStatus("finalized");
                        setPage(0);
                      }}
                    >
                      Приключени
                    </CommandItem>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="from">От дата</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
              className="h-10 min-h-[44px]"
            />
          </div>
          <div>
            <Label htmlFor="to">До дата</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
              className="h-10 min-h-[44px]"
            />
          </div>
          <div>
            <Label>Подредба</Label>
            <Select
              value={sort}
              onValueChange={(value: "datetimeDesc" | "datetimeAsc") => {
                setSort(value);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-10 min-h-[44px] w-full">
                <SelectValue placeholder="Подредба" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="datetimeDesc">Най-нови първо</SelectItem>
                <SelectItem value="datetimeAsc">Най-стари първо</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 md:col-span-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {customerId && (
              <button
                type="button"
                onClick={() => setCustomerId("")}
                className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
              >
                <span>
                  Клиент:{" "}
                  {(customers ?? []).find((o) => o._id === customerId)?.name ??
                    customerId}
                </span>
                <span aria-hidden>✕</span>
              </button>
            )}
            {vehicleId && (
              <button
                type="button"
                onClick={() => setVehicleId("")}
                className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
              >
                <span>
                  Автомобил:{" "}
                  {(vehicles ?? []).find((an) => an._id === vehicleId)?.licensePlate ??
                    vehicleId}
                </span>
                <span aria-hidden>✕</span>
              </button>
            )}
            {status && (
              <button
                type="button"
                onClick={() => setStatus("")}
                className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
              >
                <span>
                  Статус: {status === "draft" ? "Чернова" : "Приключени"}
                </span>
                <span aria-hidden>✕</span>
              </button>
            )}
            {(from || to) && (
              <button
                type="button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setPage(0);
                }}
                className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
              >
                <span>
                  Период: {from || "—"} – {to || "—"}
                </span>
                <span aria-hidden>✕</span>
              </button>
            )}
            {(customerId || vehicleId || status || from || to) && (
              <button
                type="button"
                onClick={() => {
                  setCustomerId("");
                  setVehicleId("");
                  setStatus("");
                  setFrom("");
                  setTo("");
                  setPage(0);
                }}
                className="bg-muted hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
              >
                Изчисти всички
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="divide-y rounded-md border">
        {visits === undefined ? (
          <SkeletonList rows={5} />
        ) : (visitsList ?? []).length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="Няма посещения"
            description="Създайте ново посещение от тази страница."
          />
        ) : (
          (visitsList ?? []).map((v) => (
            <div
              key={v._id}
              className="flex flex-col gap-3 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <a
                  href={`/visits/${v._id}`}
                  className="mr-2 inline-flex min-h-[44px] items-center gap-1 font-medium underline-offset-2 hover:underline"
                  aria-label={`Преглед на посещение ${(v as VisitDoc & { code?: string }).code ?? String(v._id)}`}
                >
                  <CalendarCheck className="size-4 flex-shrink-0" aria-hidden />
                  <span className="truncate">
                    {(v as VisitDoc & { code?: string }).code ??
                      `#${String(v._id)}`}{" "}
                    -{" "}
                    {fmtDateTimeBG(
                      (v as VisitDoc & { datetime?: number }).datetime ??
                        v.createdAt,
                    )}
                  </span>
                </a>
                <VisitStatusBadge status={v.status} />
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-shrink-0 sm:flex-nowrap">
                {v.status === "draft" ? (
                  <Button
                    variant="outline"
                    className="min-h-[44px] flex-1 sm:flex-none"
                    aria-label={`Приключи посещение ${(v as VisitDoc & { code?: string }).code ?? String(v._id)}`}
                    onClick={async () => {
                      const r = await finalizeVisit({ id: v._id });
                      if (r?.ok) toast.success("Приключено");
                    }}
                  >
                    <CheckCircle
                      className="mr-1 size-4 flex-shrink-0"
                      aria-hidden
                    />{" "}
                    Приключи
                  </Button>
                ) : null}
                {v.invoiceCode ? (
                  <a
                    className="hover:bg-accent inline-flex min-h-[44px] min-w-[140px] flex-1 items-center justify-center rounded-md border px-3 py-2 text-sm sm:flex-none"
                    href={`/invoices/${encodeURIComponent(v.invoiceCode)}`}
                    aria-label={`Отвори фактура ${v.invoiceCode} за посещение ${(v as VisitDoc & { code?: string }).code ?? String(v._id)}`}
                  >
                    <Eye
                      className="mr-1 size-4 flex-shrink-0"
                      aria-hidden
                    />{" "}
                    <span className="truncate">Виж фактура</span>
                  </a>
                ) : (
                  <a
                    className="hover:bg-accent inline-flex min-h-[44px] min-w-[140px] flex-1 items-center justify-center rounded-md border px-3 py-2 text-sm sm:flex-none"
                    href={`/invoices/new?customerId=${encodeURIComponent(String(v.customerId))}${v.vehicleId ? `&vehicleId=${encodeURIComponent(String(v.vehicleId))}` : ""}&visitId=${encodeURIComponent(String(v._id))}`}
                    aria-label={`Нова фактура за посещение ${(v as VisitDoc & { code?: string }).code ?? String(v._id)}`}
                  >
                    <FilePlus
                      className="mr-1 size-4 flex-shrink-0"
                      aria-hidden
                    />{" "}
                    <span className="truncate">Нова фактура</span>
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          <ChevronLeft className="mr-1 size-4" aria-hidden />
          Назад
        </Button>
        <div className="text-muted-foreground text-sm">
          <span className="sm:hidden">{page + 1}/{totalPages}</span>
          <span className="hidden sm:inline">Страница {page + 1} от {totalPages}</span>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            setPage((p) => (visits?.hasMore ? p + 1 : p))
          }
          disabled={!visits?.hasMore}
        >
          Напред
          <ChevronRight className="ml-1 size-4" aria-hidden />
        </Button>
      </div>
    </main>
  );
}

export default function VisitsPage() {
  return (
    <Suspense
      fallback={<main className="mx-auto max-w-5xl p-6">Зареждане...</main>}
    >
      <VisitsPageInner />
    </Suspense>
  );
}
