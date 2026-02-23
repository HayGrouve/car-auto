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
import {
  User as UserIcon,
  ShieldCheck,
  Phone as PhoneIcon,
  Mail as MailIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { OwnerDoc } from "@/types/owner";
import { toast } from "sonner";
import { fmtDateTimeBG } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";
import { SkeletonList } from "@/components/SkeletonList";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";
import { Form, getFormFieldProps } from "@/components/ui/form";
import { FormField } from "@/components/ui/form-field";
import { ownerFormSchema, type OwnerFormData } from "@/lib/validation/owner";
import type { UseFormReturn } from "react-hook-form";
export default function OwnersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [sort, setSort] = useState<"createdAtDesc" | "createdAtAsc">(
    "createdAtDesc",
  );
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const ownersQuery = useQuery(
    api.owners.list,
    useMemo(
      () => ({ search, limit: pageSize, offset: page * pageSize, sort }),
      [search, page, sort],
    ),
  );
  const owners = ownersQuery as
    | { items: OwnerDoc[]; total: number; hasMore: boolean }
    | undefined;
  const ownersList = owners?.items ?? undefined;
  const createOwner = useMutation(api.owners.create);

  const totalPages = useMemo(() => {
    const total = owners?.total ?? 0;
    return total > 0 ? Math.ceil(total / pageSize) : 1;
  }, [owners?.total, pageSize]);

  async function handleCreate(data: OwnerFormData, reset?: () => void) {
    const phoneCleaned = data.phone.replace(/\s+/g, "");
    const emailCleaned = data.email?.trim() ?? undefined;
    const addressCleaned = data.address?.trim() ?? undefined;

    const res = (await createOwner({
      name: data.name.trim(),
      phone: phoneCleaned,
      email: emailCleaned,
      address: addressCleaned,
      gdprConsent: data.gdprConsent,
    })) as { ok: true; id: string } | { ok: false; reason: "phone" | "email" };
    if (!res?.ok) {
      toast.error(
        res?.reason === "phone"
          ? "Има собственик с този телефон"
          : "Има собственик с този имейл",
      );
      return;
    }
    reset?.();
    toast.success("Собственикът е добавен успешно");
  }

  useBreadcrumbRegistration([
    { label: "Начало", href: "/" } satisfies BreadcrumbItem,
    {
      label: "Собственици",
      href: "/owners",
      current: true,
    } satisfies BreadcrumbItem,
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold sm:text-2xl md:text-3xl">
          Собственици: {owners?.total ?? 0}
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
          aria-label="Нов собственик"
        >
          Нов собственик
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left: Search/List */}
        <section id="search" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Търсене по име, телефон, имейл"
              className="h-10 w-full"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              aria-label="Търсене на собственици"
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
            {owners === undefined ? (
              <SkeletonList rows={6} />
            ) : (ownersList ?? []).length === 0 ? (
              <EmptyState
                icon={UserIcon}
                title="Няма собственици"
                description="Добавете първия собственик за да започнете."
                action={
                  <Link
                    href="/owners"
                    className="hover:bg-accent inline-flex items-center rounded-md border px-3 py-2 text-sm"
                  >
                    Обнови
                  </Link>
                }
              />
            ) : (
              (ownersList ?? []).map((o) => (
                <div
                  key={o._id}
                  className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <UserIcon
                      className="text-primary size-5 flex-shrink-0"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/owners/${o._id}`}
                        className="inline-flex min-h-[44px] items-center gap-1 font-medium underline-offset-2 hover:underline"
                        aria-label={`Преглед на ${o.name}`}
                      >
                        <span className="truncate">{o.name}</span>
                      </Link>
                      <div className="text-muted-foreground flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-3 sm:gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <PhoneIcon className="size-4 flex-shrink-0" />
                          <span className="truncate">{o.phone}</span>
                        </span>
                        {o.email ? (
                          <span className="inline-flex items-center gap-1">
                            <MailIcon className="size-4 flex-shrink-0" />
                            <span className="truncate">{o.email}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    {o.gdprConsent ? (
                      <ShieldCheck
                        className="text-secondary size-4 flex-shrink-0"
                        aria-label="GDPR"
                      />
                    ) : null}
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      {fmtDateTimeBG(o.createdAt)}
                    </span>
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
                setPage((p) => (owners?.hasMore ? p + 1 : p))
              }
              disabled={!owners?.hasMore}
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
              <h2 className="font-medium">Нов собственик</h2>
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
              schema={ownerFormSchema}
              defaultValues={{
                name: "",
                phone: "",
                email: "",
                address: "",
                gdprConsent: true,
              }}
              onSubmit={async (data, methods) => {
                await handleCreate(data, () => {
                  methods.reset({
                    name: "",
                    phone: "",
                    email: "",
                    address: "",
                    gdprConsent: true,
                  });
                });
              }}
              className="grid grid-cols-1 gap-4 md:gap-3"
            >
              {(methods: UseFormReturn<OwnerFormData>) => (
                <>
                  <FormField
                    label="Име"
                    htmlFor="name"
                    required
                    error={methods.formState.errors.name?.message}
                    hint="Въведете пълното име на собственика"
                  >
                    <Input
                      id="name"
                      type="text"
                      autoCapitalize="words"
                      autoComplete="name"
                      placeholder="Иван Иванов"
                      {...getFormFieldProps(methods, "name")}
                    />
                  </FormField>

                  <FormField
                    label="Телефон"
                    htmlFor="phone"
                    required
                    error={methods.formState.errors.phone?.message}
                    hint="Въведете телефон (напр. 08xxxxxxxx или +359...)"
                  >
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="08xxxxxxxx"
                      {...getFormFieldProps(methods, "phone")}
                    />
                  </FormField>

                  <FormField
                    label="Имейл"
                    htmlFor="email"
                    error={methods.formState.errors.email?.message}
                  >
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="ivan@example.com"
                      {...getFormFieldProps(methods, "email")}
                    />
                  </FormField>

                  <FormField
                    label="Адрес"
                    htmlFor="address"
                    error={methods.formState.errors.address?.message}
                  >
                    <Input
                      id="address"
                      placeholder="ул. Иван Иванов 123"
                      {...getFormFieldProps(methods, "address")}
                    />
                  </FormField>

                  <FormField
                    error={methods.formState.errors.gdprConsent?.message}
                  >
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={methods.watch("gdprConsent")}
                        onCheckedChange={(checked) =>
                          methods.setValue("gdprConsent", checked === true)
                        }
                        aria-invalid={!!methods.formState.errors.gdprConsent}
                      />
                      <span className="inline-flex items-center gap-1 text-sm">
                        Съгласие (GDPR) *
                      </span>
                      <Link
                        href="/privacy"
                        className="text-muted-foreground text-xs underline underline-offset-2"
                      >
                        Политика
                      </Link>
                    </label>
                  </FormField>

                  <div>
                    <Button
                      type="submit"
                      disabled={methods.formState.isSubmitting}
                      className="min-h-[44px] w-full md:min-h-0 md:w-auto"
                    >
                      {methods.formState.isSubmitting
                        ? "Добавяне..."
                        : "Добави собственик"}
                    </Button>
                  </div>
                </>
              )}
            </Form>
          </div>
        </aside>
      </div>
    </main>
  );
}
