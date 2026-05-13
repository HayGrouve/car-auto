"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { VehicleDocSchema } from "@/types/vehicle";
import { vehicleFormSchema } from "@/lib/validation/vehicle";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
import { SkeletonList } from "@/components/SkeletonList";
import { VehicleSummaryCard } from "./components/VehicleSummaryCard";
import { VehicleControlsCard } from "./components/VehicleControlsCard";
import { VisitStatusBadge } from "@/components/StatusBadge";
import { Save } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import Link from "next/link";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"vehicles">;
  const vehicleUnknown = useQuery(
    api.vehicles.getById,
    useMemo(() => ({ id }), [id]),
  ) as unknown;
  const update = useMutation(api.vehicles.update);
  const createVisit = useMutation(api.visits.create);
  const removeVehicle = useMutation(api.vehicles.remove);
  const customersQuery = useQuery(
    api.customers.list,
    useMemo(() => ({ search: "" }), []),
  );
  const customersResult = customersQuery as
    | {
        items: { _id: string; name: string; phone?: string }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const customers = customersResult?.items;
  const visitsQuery = useQuery(
    api.visits.list,
    useMemo(() => ({ vehicleId: id, limit: 5, sort: "datetimeDesc" }), [id]),
  );
  const visitsResult = visitsQuery as
    | {
        items: {
          _id: string;
          code?: string | null;
          datetime?: number | null;
          status: string;
          customerId?: string | null;
          mileage?: number | null;
          services?: string[];
          parts?: string[];
          createdAt?: number;
        }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const visits = visitsResult?.items;
  const draftVisitsQuery = useQuery(
    api.visits.list,
    useMemo(
      () => ({
        vehicleId: id,
        statuses: ["draft", "in_progress", "ready"],
        limit: 1,
        sort: "datetimeDesc",
      }),
      [id],
    ),
  );
  const draftVisitsResult = draftVisitsQuery as
    | {
        items: {
          _id: string;
          code?: string | null;
          datetime?: number | null;
          status: string;
        }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const draftVisits = draftVisitsResult?.items;
  const router = useRouter();

  const [form, setForm] = useState({
    licensePlate: "",
    make: "",
    model: "",
    color: "",
    vin: "",
    year: "",
    customerId: "",
  });
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showIncompleteVisits, setShowIncompleteVisits] = useState(false);

  const parsedVehicle = useMemo(
    () => VehicleDocSchema.safeParse(vehicleUnknown),
    [vehicleUnknown],
  );

  useBreadcrumbRegistration(
    [
      { label: "Начало", href: "/" } satisfies BreadcrumbItem,
      { label: "Автомобили", href: "/vehicles" } satisfies BreadcrumbItem,
      parsedVehicle.success && parsedVehicle.data.licensePlate
        ? ({
            id: String(id),
            label: parsedVehicle.data.licensePlate,
            href: `/vehicles/${id}`,
            current: true,
          } satisfies BreadcrumbItem)
        : ({ label: "Автомобил", current: true } satisfies BreadcrumbItem),
    ].filter(Boolean) as BreadcrumbItem[],
  );

  useEffect(() => {
    if (parsedVehicle.success) {
      const base = parsedVehicle.data as {
        customerId?: string | null;
      } & typeof parsedVehicle.data;
      setForm({
        licensePlate: base.licensePlate ?? "",
        make: base.make ?? "",
        model: base.model ?? "",
        color: base.color ?? "",
        vin: base.vin ?? "",
        year: base.year ? String(base.year) : "",
        customerId: base.customerId ?? "",
      });
    }
  }, [parsedVehicle]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();

    // Validate form data
    const formData = {
      licensePlate: form.licensePlate.trim(),
      make: form.make.trim(),
      model: form.model.trim() || "",
      color: form.color.trim() || "",
      vin: form.vin.trim() || "",
      year: form.year || "",
      customerId: form.customerId || "",
    };

    const validationResult = vehicleFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(
        firstError?.message ?? "Моля, попълнете всички задължителни полета",
      );
      return;
    }

    setIsSaving(true);

    const res = (await update({
      id,
      licensePlate: form.licensePlate,
      make: form.make,
      model: form.model || null,
      color: form.color || null,
      vin: form.vin || null,
      year: form.year ? parseInt(form.year, 10) : null,
      customerId: (form.customerId || null) as Id<"customers"> | null,
    })) as { ok: boolean };

    setIsSaving(false);

    if (res?.ok) {
      toast.success("Записът е обновен");
      router.push("/vehicles");
    }
  }

  async function onStartVisit() {
    if (!form.customerId) {
      toast.error("Изберете клиент преди да започнете посещение");
      return;
    }
    const res = (await createVisit({
      customerId: form.customerId as Id<"customers">,
      vehicleId: id,
      datetime: Date.now(),
      notes: {},
      services: [],
      parts: [],
    })) as { ok: boolean; id?: string; reason?: string } | undefined;
    if (res?.ok && res.id) {
      toast.success("Стартирано посещение");
      router.push(`/visits/${res.id}?step=1`);
      return;
    }
    if (res && res.reason === "draft_exists" && res.id) {
      toast.info("Има незавършено посещение за този автомобил");
      router.push(`/visits/${res.id}`);
      return;
    }
  }

  const customer = form.customerId
    ? (customers ?? []).find((o) => o._id === form.customerId)
    : undefined;
  const visitsLoading = visits === undefined;
  const lastVisit = (visits ?? [])[0];
  const draftVisit = (draftVisits ?? [])[0];
  const filteredVisits = useMemo(() => {
    const allVisits = visits ?? [];
    return showIncompleteVisits
      ? allVisits.filter((visit) => visit.status !== "finalized")
      : allVisits;
  }, [visits, showIncompleteVisits]);

  if (!parsedVehicle.success)
    return <main className="w-full p-6">Зареждане...</main>;

  return (
    <main className="w-full space-y-8 px-4 pt-6 pb-24 sm:px-6 sm:pb-28 lg:px-8 lg:pt-8 lg:pb-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <VehicleSummaryCard
          vehicle={parsedVehicle.data}
          customer={customer}
          lastVisit={lastVisit}
          visits={visits ?? []}
          isLoading={visitsLoading}
        />
        <div className="space-y-6 lg:col-start-2 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
          <VehicleControlsCard
            className="self-start lg:top-4"
            hasCustomer={Boolean(customer)}
            hasDraftVisit={Boolean(draftVisit)}
            draftVisitId={draftVisit?._id}
            onStartVisit={onStartVisit}
            onResumeVisit={
              draftVisit
                ? () => router.push(`/visits/${draftVisit._id}`)
                : undefined
            }
            hasIncompleteVisit={(visits ?? []).some(
              (visit) => visit.status !== "finalized",
            )}
            onConfirmDelete={() => setConfirmDeleteOpen(true)}
            onBack={() => router.push("/vehicles")}
            disablePrimary={!customer && !draftVisit}
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
                      <VisitStatusBadge status={visit.status} />
                      {customer?.name ? <span>· {customer.name}</span> : null}
                    </div>
                  </div>
                  <Link
                    href={`/visits/${visit._id}`}
                    className="text-primary text-xs font-medium underline underline-offset-2"
                  >
                    Детайли
                  </Link>
                </div>
              ))
            )}
          </SectionCard>
        </div>
      </div>
      <div
        id="vehicle-summary-sentinel"
        className="hidden lg:block"
        aria-hidden="true"
      />
      <SectionCard
        title="Основни данни"
        subtitle={form.licensePlate || "Без рег. номер"}
        description="Обновете основната информация за автомобила."
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
            <Label htmlFor="licensePlate">Рег. номер *</Label>
            <Input
              id="licensePlate"
              value={form.licensePlate}
              onChange={(e) => setForm((f) => ({ ...f, licensePlate: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="make">Марка *</Label>
            <Input
              id="make"
              value={form.make}
              onChange={(e) =>
                setForm((f) => ({ ...f, make: e.target.value }))
              }
              placeholder="напр. Toyota"
              required
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="model">Модел</Label>
            <Input
              id="model"
              value={form.model}
              onChange={(e) =>
                setForm((f) => ({ ...f, model: e.target.value }))
              }
              placeholder="напр. Corolla"
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
              placeholder="напр. Черен"
            />
          </div>
          <div className="space-y-2.5">
            <Label>Клиент</Label>
            <div className="flex items-start gap-2">
              <Dialog open={customerSheetOpen} onOpenChange={setCustomerSheetOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between md:hidden"
                  >
                    {form.customerId
                      ? (customers ?? []).find((o) => o._id === form.customerId)?.name
                      : "Без клиент"}
                  </Button>
                </DialogTrigger>
                <DialogContent side="bottom" className="p-0">
                  <DialogHeader className="border-b px-4 py-3">
                    <DialogTitle>Изберете клиент</DialogTitle>
                  </DialogHeader>
                  <Command className="p-0">
                    <div className="px-4 py-3">
                      <CommandInput
                        placeholder="Търси клиент..."
                        autoFocus
                      />
                    </div>
                    <CommandList className="max-h-[60vh] overflow-y-auto">
                      <CommandEmpty className="text-muted-foreground px-4 py-6 text-center text-sm">
                        Няма резултати
                      </CommandEmpty>
                      {(customers ?? []).map((o) => (
                        <CommandItem
                          key={o._id}
                          value={o.name}
                          onSelect={() => {
                            setForm((f) => ({ ...f, customerId: o._id }));
                            setCustomerSheetOpen(false);
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

              <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden w-full justify-between md:flex"
                  >
                    {form.customerId
                      ? (customers ?? []).find((o) => o._id === form.customerId)?.name
                      : "Без клиент"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Търси клиент..." autoFocus />
                    <CommandList>
                      <CommandEmpty>Няма резултати</CommandEmpty>
                      {(customers ?? []).map((o) => (
                        <CommandItem
                          key={o._id}
                          value={o.name}
                          onSelect={() => {
                            setForm((f) => ({ ...f, customerId: o._id }));
                            setCustomerPopoverOpen(false);
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
            {!form.customerId && (
              <p className="text-muted-foreground text-xs">
                Ако клиентът липсва, можете да оставите полето празно или да
                добавите нов запис от секция „Клиенти“.
              </p>
            )}
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="year">Година на производство</Label>
            <Input
              id="year"
              type="number"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="vin">VIN номер</Label>
            <Input
              id="vin"
              value={form.vin}
              onChange={(e) =>
                setForm((f) => ({ ...f, vin: e.target.value }))
              }
              placeholder="напр. WBA..."
            />
          </div>
          <button type="submit" className="sr-only" aria-hidden="true">
            Запази
          </button>
        </form>
      </SectionCard>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изтрий автомобила?</AlertDialogTitle>
            <AlertDialogDescription>
              Това действие ще премахне записа за &bdquo;
              {form.licensePlate || "Без рег. номер"}
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
                  const result = (await removeVehicle({
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
                  toast.success("Автомобилът е изтрит");
                  setConfirmDeleteOpen(false);
                  router.push("/vehicles");
                } catch (error) {
                  console.error(error);
                  toast.error("Неуспешно изтриване на автомобила");
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
