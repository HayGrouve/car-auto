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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { AnimalDoc } from "@/types/animal";
import {
  PawPrint,
  Hash,
  User as UserIcon,
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
import { animalFormSchema, type AnimalFormData } from "@/lib/validation/animal";
import type { UseFormReturn } from "react-hook-form";
export default function AnimalsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [sort, setSort] = useState<"createdAtDesc" | "createdAtAsc">(
    "createdAtDesc",
  );
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const animalsQuery = useQuery(
    api.animals.list,
    useMemo(
      () => ({ search, limit: pageSize, offset: page * pageSize, sort }),
      [search, page, sort],
    ),
  );
  const animals = animalsQuery as
    | { items: AnimalDoc[]; total: number; hasMore: boolean }
    | undefined;
  const animalsList = animals?.items ?? undefined;
  const createAnimal = useMutation(api.animals.create);
  const [ownerId, setOwnerId] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");

  const totalPages = useMemo(() => {
    const total = animals?.total ?? 0;
    return total > 0 ? Math.ceil(total / pageSize) : 1;
  }, [animals?.total, pageSize]);
  const ownersQuery = useQuery(
    api.owners.list,
    useMemo(() => ({ search: ownerSearch }), [ownerSearch]),
  );
  const ownersResult = ownersQuery as
    | { items: { _id: string; name: string; phone?: string }[]; total: number; hasMore: boolean }
    | undefined;
  const owners = ownersResult?.items;

  const ownersById = useMemo(() => {
    const map: Record<string, { _id: string; name: string; phone?: string }> =
      {};
    (owners ?? []).forEach((o) => {
      map[o._id] = o;
    });
    return map;
  }, [owners]);

  async function handleCreate(
    data: AnimalFormData,
    methods: UseFormReturn<AnimalFormData>,
  ) {
    const microchipCleaned = data.microchip?.replace(/\s+/g, "") ?? undefined;
    const dobParsed = data.dob ? Date.parse(data.dob) : undefined;
    const dob = dobParsed && !Number.isNaN(dobParsed) ? dobParsed : undefined;

    const res = (await createAnimal({
      name: data.name.trim(),
      species: data.species.trim(),
      breed: data.breed?.trim() ?? undefined,
      color: data.color?.trim() ?? undefined,
      microchip: microchipCleaned,
      dob,
      sex: data.sex,
      neutered: data.neutered,
      ownerId: ownerId ? (ownerId as Id<"owners">) : undefined,
    })) as { ok: true; id: string } | { ok: false; reason: "microchip" };
    if (!res?.ok) {
      toast.error("Съществува животно с този микрочип");
      return;
    }
    methods.reset({
      name: "",
      species: "",
      breed: "",
      color: "",
      sex: "unknown",
      neutered: false,
      microchip: "",
      dob: "",
      ownerId: "",
    });
    setOwnerId("");
    setOwnerSearch("");
    toast.success("Животното е добавено успешно");
  }

  useBreadcrumbRegistration([
    { label: "Начало", href: "/" } satisfies BreadcrumbItem,
    {
      label: "Животни",
      href: "/animals",
      current: true,
    } satisfies BreadcrumbItem,
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold sm:text-xl md:text-2xl">
          Животни: {animals?.total ?? 0}
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
          aria-label="Ново животно"
        >
          Ново животно
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left: Search/List */}
        <section id="search" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Търсене по име, вид, порода, микрочип"
              className="h-10 w-full"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              aria-label="Търсене на животни"
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
            {animals === undefined ? (
              <SkeletonList rows={6} />
            ) : (animalsList ?? []).length === 0 ? (
              <EmptyState
                icon={PawPrint}
                title="Няма животни"
                description="Добавете животно към собственик."
              />
            ) : (
              (animalsList ?? []).map((a) => {
                const owner = a.ownerId
                  ? ownersById[String(a.ownerId)]
                  : undefined;
                return (
                  <div
                    key={a._id}
                    className="hover:bg-accent flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <PawPrint
                        className="text-primary size-5 flex-shrink-0"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/animals/${a._id}`}
                          className="inline-flex min-h-[44px] items-center gap-1 font-medium underline-offset-2 hover:underline"
                          aria-label={`Преглед на ${a.name}`}
                        >
                          <span className="truncate">
                            {a.name} ({a.species})
                          </span>
                        </Link>
                        <div className="text-muted-foreground flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                          {a.breed && (
                            <span className="truncate">{a.breed}</span>
                          )}
                          {a.microchip ? (
                            <span className="inline-flex items-center gap-1">
                              <Hash className="size-4 flex-shrink-0" />
                              <span className="truncate">{a.microchip}</span>
                            </span>
                          ) : null}
                          {a.neutered ? (
                            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                              {a.sex === "male"
                                ? "Кастриран"
                                : a.sex === "female"
                                  ? "Кастрирана"
                                  : "Кастриран/а"}
                            </span>
                          ) : null}
                          {owner ? (
                            <span className="inline-flex flex-wrap items-center gap-2">
                              <Link
                                href={`/owners/${owner._id}`}
                                className="inline-flex min-h-[44px] items-center gap-1 underline-offset-2 hover:underline"
                                aria-label={`Собственик ${owner.name}`}
                              >
                                <UserIcon
                                  className="size-4 flex-shrink-0"
                                  aria-hidden
                                />
                                <span className="truncate">{owner.name}</span>
                              </Link>
                              {owner.phone ? (
                                <span className="text-muted-foreground inline-flex items-center gap-1">
                                  <PhoneIcon className="size-4 flex-shrink-0" />
                                  <span className="truncate">
                                    {owner.phone}
                                  </span>
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs sm:flex-shrink-0 sm:text-sm">
                      {fmtDateTimeBG(a.createdAt)}
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
              Страница {page + 1} от {totalPages}
            </div>
            <Button
              variant="outline"
              onClick={() =>
                setPage((p) => (animals?.hasMore ? p + 1 : p))
              }
              disabled={!animals?.hasMore}
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
              <h2 className="font-medium">Ново животно</h2>
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
              schema={animalFormSchema}
              defaultValues={{
                name: "",
                species: "",
                breed: "",
                color: "",
                sex: "unknown",
                neutered: false,
                microchip: "",
                dob: "",
                ownerId: "",
              }}
              onSubmit={handleCreate}
              className="grid grid-cols-1 gap-4 md:gap-3"
            >
              {(methods: UseFormReturn<AnimalFormData>) => {
                const nameField = getFormFieldProps(methods, "name");
                const speciesField = getFormFieldProps(methods, "species");
                const breedField = getFormFieldProps(methods, "breed");
                const colorField = getFormFieldProps(methods, "color");
                const microchipField = getFormFieldProps(methods, "microchip");
                const dobField = getFormFieldProps(methods, "dob");
                return (
                  <>
                    <FormField
                      label="Име"
                      htmlFor="aname"
                      required
                      error={methods.formState.errors.name?.message}
                      hint="Въведете име на животното"
                    >
                      <Input
                        id="aname"
                        type="text"
                        autoCapitalize="words"
                        placeholder="Шаро"
                        aria-label="Име на животно"
                        {...nameField}
                      />
                    </FormField>

                    <FormField
                      label="Вид"
                      htmlFor="species"
                      required
                      error={methods.formState.errors.species?.message}
                      hint="Въведете вида на животното"
                    >
                      <Input
                        id="species"
                        type="text"
                        autoCapitalize="words"
                        placeholder="Куче"
                        aria-label="Вид на животно"
                        {...speciesField}
                      />
                    </FormField>

                    <FormField
                      label="Порода"
                      htmlFor="breed"
                      error={methods.formState.errors.breed?.message}
                    >
                      <Input
                        id="breed"
                        type="text"
                        autoCapitalize="words"
                        placeholder="Лабрадор"
                        aria-label="Порода на животно"
                        {...breedField}
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
                        placeholder="напр. Кафяв"
                        aria-label="Цвят на животно"
                        {...colorField}
                      />
                    </FormField>

                    <FormField
                      label="Пол"
                      htmlFor="sex"
                      error={methods.formState.errors.sex?.message}
                    >
                      <Select
                        value={methods.watch("sex") ?? "unknown"}
                        onValueChange={(value: "male" | "female" | "unknown") =>
                          methods.setValue("sex", value)
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
                    </FormField>

                    <FormField
                      label="Стерилизиран"
                      htmlFor="neutered"
                      error={methods.formState.errors.neutered?.message}
                    >
                      <label className="flex items-center gap-2">
                        <Checkbox
                          id="neutered"
                          checked={methods.watch("neutered") ?? false}
                          onCheckedChange={(checked) =>
                            methods.setValue("neutered", checked === true)
                          }
                          aria-invalid={!!methods.formState.errors.neutered}
                        />
                        <span className="text-sm">
                          {(() => {
                            const sex = methods.watch("sex");
                            if (sex === "male") return "Кастриран";
                            if (sex === "female") return "Кастрирана";
                            return "Кастриран/а";
                          })()}
                        </span>
                      </label>
                    </FormField>

                    <FormField
                      label="Микрочип"
                      htmlFor="microchip"
                      error={methods.formState.errors.microchip?.message}
                      hint="ISO формат: 15 цифри (опционално)"
                    >
                      <Input
                        id="microchip"
                        type="text"
                        placeholder="напр. 985112003178000"
                        aria-label="Микрочип на животно"
                        {...microchipField}
                      />
                    </FormField>

                    <FormField
                      label="Дата на раждане"
                      htmlFor="birthdate"
                      error={methods.formState.errors.dob?.message}
                      hint="Датата на раждане не може да бъде в бъдещето"
                    >
                      <Input
                        id="birthdate"
                        type="date"
                        max={new Date().toISOString().split("T")[0]}
                        {...dobField}
                      />
                    </FormField>

                    <FormField label="Собственик">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                          >
                            {ownerId
                              ? (owners ?? []).find((o) => o._id === ownerId)
                                  ?.name
                              : "Без собственик"}
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
                                    methods.setValue("ownerId", v);
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
                          : "Добави животно"}
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
