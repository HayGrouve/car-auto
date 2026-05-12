"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { VehicleDoc } from "@/types/vehicle";
import {
  Car,
  Hash,
  Users as UserIcon,
  Phone as PhoneIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { fmtDateTimeBG } from "@/lib/format";
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
import type { Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/SkeletonList";
import Link from "next/link";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";
import { Form, getFormFieldProps } from "@/components/ui/form";
import { FormField } from "@/components/ui/form-field";
import { vehicleFormSchema, type VehicleFormData } from "@/lib/validation/vehicle";
import type { UseFormReturn } from "react-hook-form";

export default function VehiclesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [sort, setSort] = useState<"createdAtDesc" | "createdAtAsc">(
    "createdAtDesc",
  );
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const vehiclesQuery = useQuery(
    api.vehicles.list,
    useMemo(
      () => ({ search, limit: pageSize, offset: page * pageSize, sort }),
      [search, page, sort],
    ),
  );
  const vehicles = vehiclesQuery as
    | { items: VehicleDoc[]; total: number; hasMore: boolean }
    | undefined;
  const vehiclesList = vehicles?.items ?? undefined;
  const createVehicle = useMutation(api.vehicles.create);
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  const totalPages = useMemo(() => {
    const total = vehicles?.total ?? 0;
    return total > 0 ? Math.ceil(total / pageSize) : 1;
  }, [vehicles?.total, pageSize]);
  const customersQuery = useQuery(
    api.customers.list,
    useMemo(() => ({ search: customerSearch }), [customerSearch]),
  );
  const customersResult = customersQuery as
    | { items: { _id: string; name: string; phone?: string }[]; total: number; hasMore: boolean }
    | undefined;
  const customers = customersResult?.items;

  const customersById = useMemo(() => {
    const map: Record<string, { _id: string; name: string; phone?: string }> =
      {};
    (customers ?? []).forEach((o) => {
      map[o._id] = o;
    });
    return map;
  }, [customers]);

  async function handleCreate(
    data: VehicleFormData,
    methods: UseFormReturn<VehicleFormData>,
  ) {
    const vinCleaned = data.vin?.replace(/\s+/g, "") ?? undefined;
    const yearParsed = data.year ? parseInt(data.year, 10) : undefined;
    const year = yearParsed && !Number.isNaN(yearParsed) ? yearParsed : undefined;

    const res = (await createVehicle({
      licensePlate: data.licensePlate.trim(),
      make: data.make.trim(),
      model: data.model?.trim() ?? undefined,
      color: data.color?.trim() ?? undefined,
      vin: vinCleaned,
      year,
      customerId: customerId ? (customerId as Id<"customers">) : undefined,
    })) as { ok: true; id: string } | { ok: false; reason: "vin" };
    if (!res?.ok) {
      toast.error("Съществува автомобил с този VIN номер");
      return;
    }
    methods.reset({
      licensePlate: "",
      make: "",
      model: "",
      color: "",
      vin: "",
      year: "",
      customerId: "",
    });
    setCustomerId("");
    setCustomerSearch("");
    toast.success("Автомобилът е добавен успешно");
  }

  useBreadcrumbRegistration([
    { label: "Начало", href: "/" } satisfies BreadcrumbItem,
    {
      label: "Автомобили",
      href: "/vehicles",
      current: true,
    } satisfies BreadcrumbItem,
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold sm:text-2xl md:text-3xl">
          Автомобили: {vehicles?.total ?? 0}
        </h1>
        <Button
          className="md:hidden"
          variant="outline"
          onClick={() => {
            setShowCreatePanel(true);
            setTimeout(() => {
              const createSection = document.getElementById("create");
              if (createSection) {
                createSection.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }, 100);
          }}
          aria-label="Нов автомобил"
        >
          Нов автомобил
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left: Search/List */}
        <section id="search" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Търсене по рег. номер, марка, модел, VIN"
              className="h-10 w-full"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              aria-label="Търсене на автомобили"
            />
            <Select
              value={sort}
              onValueChange={(value: "createdAtDesc" | "createdAtAsc") => {
                setSort(value);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-10 w-full sm:min-w-[160px]">
                <SelectValue placeholder="Подреждане" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAtDesc">Най-нови</SelectItem>
                <SelectItem value="createdAtAsc">Най-стари</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="divide-y rounded-md border">
            {vehicles === undefined ? (
              <SkeletonList rows={6} />
            ) : (vehiclesList ?? []).length === 0 ? (
              <EmptyState
                icon={Car}
                title="Няма автомобили"
                description="Добавете автомобил към клиент."
              />
            ) : (
              (vehiclesList ?? []).map((vDoc) => {
                const customer = vDoc.customerId
                  ? customersById[String(vDoc.customerId)]
                  : undefined;
                return (
                  <div
                    key={vDoc._id}
                    className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Car
                        className="text-primary size-5 flex-shrink-0"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/vehicles/${vDoc._id}`}
                          className="inline-flex min-h-[44px] items-center gap-1 font-medium underline-offset-2 hover:underline"
                          aria-label={`Преглед на ${vDoc.licensePlate}`}
                        >
                          <span className="truncate">
                            {vDoc.licensePlate} ({vDoc.make})
                          </span>
                        </Link>
                        <div className="text-muted-foreground flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                          {vDoc.model && (
                            <span className="truncate">{vDoc.model}</span>
                          )}
                          {vDoc.vin ? (
                            <span className="inline-flex items-center gap-1">
                              <Hash className="size-4 flex-shrink-0" />
                              <span className="truncate">{vDoc.vin}</span>
                            </span>
                          ) : null}
                          {customer ? (
                            <span className="inline-flex flex-wrap items-center gap-2">
                              <Link
                                href={`/customers/${customer._id}`}
                                className="inline-flex min-h-[44px] items-center gap-1 underline-offset-2 hover:underline"
                                aria-label={`Клиент ${customer.name}`}
                              >
                                <UserIcon
                                  className="size-4 flex-shrink-0"
                                  aria-hidden
                                />
                                <span className="truncate">{customer.name}</span>
                              </Link>
                              {customer.phone ? (
                                <span className="text-muted-foreground inline-flex items-center gap-1">
                                  <PhoneIcon className="size-4 flex-shrink-0" />
                                  <span className="truncate">
                                    {customer.phone}
                                  </span>
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs sm:flex-shrink-0 sm:text-sm">
                      {fmtDateTimeBG(vDoc.createdAt)}
                    </div>
                  </div>
                );
              })
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
                setPage((p) => (vehicles?.hasMore ? p + 1 : p))
              }
              disabled={!vehicles?.hasMore}
            >
              Напред
              <ChevronRight className="ml-1 size-4" aria-hidden />
            </Button>
          </div>
        </section>

        {/* Right: Create Panel */}
        <aside
          id="create"
          className={`${showCreatePanel ? "block" : "hidden"} md:block`}
        >
          <div className="space-y-4 rounded-md border p-4 md:space-y-3 md:p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Нов автомобил</h2>
              <Button
                className="min-h-[44px] min-w-[44px] md:hidden"
                variant="outline"
                size="sm"
                onClick={() => setShowCreatePanel(false)}
                aria-label="Затвори панела"
              >
                Затвори
              </Button>
            </div>
            <Form
              schema={vehicleFormSchema}
              defaultValues={{
                licensePlate: "",
                make: "",
                model: "",
                color: "",
                vin: "",
                year: "",
                customerId: "",
              }}
              onSubmit={handleCreate}
              className="grid grid-cols-1 gap-4 md:gap-3"
            >
              {(methods: UseFormReturn<VehicleFormData>) => {
                const licensePlateField = getFormFieldProps(methods, "licensePlate");
                const makeField = getFormFieldProps(methods, "make");
                const modelField = getFormFieldProps(methods, "model");
                const colorField = getFormFieldProps(methods, "color");
                const vinField = getFormFieldProps(methods, "vin");
                const yearField = getFormFieldProps(methods, "year");
                return (
                  <>
                    <FormField
                      label="Рег. номер"
                      htmlFor="licensePlate"
                      required
                      error={methods.formState.errors.licensePlate?.message}
                      hint="Въведете регистрационен номер"
                    >
                      <Input
                        id="licensePlate"
                        type="text"
                        autoCapitalize="characters"
                        placeholder="СВ1234АВ"
                        aria-label="Рег. номер"
                        {...licensePlateField}
                      />
                    </FormField>

                    <FormField
                      label="Марка"
                      htmlFor="make"
                      required
                      error={methods.formState.errors.make?.message}
                      hint="Въведете марка на автомобила"
                    >
                      <Input
                        id="make"
                        type="text"
                        autoCapitalize="words"
                        placeholder="Toyota"
                        aria-label="Марка на автомобил"
                        {...makeField}
                      />
                    </FormField>

                    <FormField
                      label="Модел"
                      htmlFor="model"
                      error={methods.formState.errors.model?.message}
                    >
                      <Input
                        id="model"
                        type="text"
                        autoCapitalize="words"
                        placeholder="Corolla"
                        aria-label="Модел на автомобил"
                        {...modelField}
                      />
                    </FormField>

                    <FormField
                      label="Цвят"
                      htmlFor="color"
                      error={methods.formState.errors.color?.message}
                    >
                      <Input
                        id="color"
                        type="text"
                        autoCapitalize="words"
                        placeholder="напр. Черен"
                        aria-label="Цвят на автомобил"
                        {...colorField}
                      />
                    </FormField>

                    <FormField
                      label="VIN номер"
                      htmlFor="vin"
                      error={methods.formState.errors.vin?.message}
                      hint="17 символа (опционално)"
                    >
                      <Input
                        id="vin"
                        type="text"
                        autoCapitalize="characters"
                        placeholder="напр. WBA..."
                        aria-label="VIN номер на автомобил"
                        {...vinField}
                      />
                    </FormField>

                    <FormField
                      label="Година на производство"
                      htmlFor="year"
                      error={methods.formState.errors.year?.message}
                    >
                      <Input
                        id="year"
                        type="number"
                        placeholder="2020"
                        {...yearField}
                      />
                    </FormField>

                    <FormField label="Клиент">
                      <Popover
                        open={customerPopoverOpen}
                        onOpenChange={setCustomerPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                          >
                            {customerId
                              ? (customers ?? []).find((o) => o._id === customerId)
                                  ?.name
                              : "Без клиент"}
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
                                  value={o.name}
                                  onSelect={() => {
                                    setCustomerId(o._id);
                                    methods.setValue("customerId", o._id);
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
                    </FormField>

                    <div>
                      <Button
                        type="submit"
                        disabled={methods.formState.isSubmitting}
                        className="min-h-[44px] w-full md:min-h-0 md:w-auto"
                      >
                        {methods.formState.isSubmitting
                          ? "Добавяне..."
                          : "Добави автомобил"}
                      </Button>
                    </div>
                  </>
                );
              }}
            </Form>
          </div>
        </aside>
      </div>
    </main>
  );
}
