"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { Users, PawPrint, ClipboardList, FileText, Clock } from "lucide-react";

import { api } from "@/../convex/_generated/api";
import { brand } from "@/lib/brand";
import { fmtNumberBG, formatTimeRange } from "@/lib/format";
import { SkeletonList } from "@/components/SkeletonList";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import {
  VisitList,
  type VisitListItem,
} from "@/components/dashboard/VisitList";
import {
  InvoiceList,
  type InvoiceListItem,
} from "@/components/dashboard/InvoiceList";
import { AlertList } from "@/components/dashboard/AlertList";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";
import type { Id } from "@/../convex/_generated/dataModel";

const ICON_CLASS = "size-5 text-muted-foreground";

type DashboardCounts = {
  owners: number;
  animals: number;
  draftVisits: number;
  unpaidInvoices: number;
};

type DashboardTotals = {
  today: { paid: number; unpaid: number };
  week: { paid: number; unpaid: number };
  unpaidInvoicesTotal: number;
};

type DashboardVisit = {
  _id: string;
  code: string | null;
  datetime: number;
  status: string;
  ownerId: string | null;
  ownerName: string | null;
  animalId: string | null;
};

type DashboardInvoice = {
  _id: string;
  code: string | null;
  createdAt: number;
  total: number;
  paid: boolean;
};

type DashboardPatient = {
  _id: string;
  name: string;
  species: string | null;
  ownerId: string | null;
  ownerName: string | null;
};

type DashboardScheduleSlot = {
  _id: string;
  title: string;
  description: string | null;
  startTime: number;
  endTime: number;
  visitId: string | null;
  ownerId: string | null;
  ownerName: string | null;
  animalId: string | null;
  animalName: string | null;
};

type DashboardOverview = {
  counts: DashboardCounts;
  totals: DashboardTotals;
  recentVisits: DashboardVisit[];
  recentInvoices: DashboardInvoice[];
  todayVisits: DashboardVisit[];
  patientBook: DashboardPatient[];
  todayScheduleSlots: DashboardScheduleSlot[];
  alerts: string[];
};

export default function HomePage() {
  const router = useRouter();
  const overview = useQuery(api.dashboard.overview, {}) as
    | DashboardOverview
    | undefined;
  const createVisit = useMutation(api.visits.create) as unknown as (args: {
    ownerId: string;
    animalId?: string;
    datetime?: number;
    soap: { s?: string; o?: string; a?: string; p?: string };
  }) => Promise<{ ok: boolean; id?: string; reason?: string }>;
  const updateScheduleSlot = useMutation(api.schedule.update);

  useBreadcrumbRegistration([
    { label: "Начало", href: "/" } satisfies BreadcrumbItem,
  ]);

  const handleStartVisit = async (slot: DashboardScheduleSlot) => {
    if (slot.visitId) {
      // If slot already has a visit, navigate to it
      router.push(`/visits/${slot.visitId}`);
      return;
    }

    if (!slot.ownerId) {
      toast.error("Слотът няма свързан собственик");
      return;
    }

    if (!slot.animalId) {
      toast.error("Слотът няма свързано животно");
      return;
    }

    try {
      const res = await createVisit({
        ownerId: slot.ownerId,
        animalId: slot.animalId,
        datetime: slot.startTime,
        soap: {},
      });

      if (res?.ok && res.id) {
        toast.success("Посещението е създадено");
        // Link the schedule slot to the created visit
        if (res.id) {
          try {
            await updateScheduleSlot({
              id: slot._id as Id<"schedule">,
              visitId: res.id as Id<"visits">,
            });
          } catch (error) {
            // Non-critical error, just log it
            console.error("Failed to link schedule slot to visit:", error);
          }
        }
        router.push(`/visits/${res.id}?step=measurements`);
      } else if (res && res.reason === "draft_exists" && res.id) {
        toast.info("Има незавършено посещение за това животно");
        router.push(`/visits/${res.id}`);
      } else {
        toast.error("Грешка при създаване на посещение");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Грешка при създаване на посещение",
      );
    }
  };

  if (!overview) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Табло на {brand.nameBg}</h1>
          <div className="w-72">
            <SkeletonList rows={1} />
          </div>
        </div>
        <SkeletonList rows={4} />
        <SkeletonList rows={6} />
      </main>
    );
  }

  const metrics: Array<{
    label: string;
    value: number;
    href: string;
    icon: React.ReactNode;
    description?: string;
  }> = [
    {
      label: "Собственици",
      value: overview.counts.owners,
      href: "/owners",
      icon: <Users className={ICON_CLASS} aria-hidden />,
    },
    {
      label: "Животни",
      value: overview.counts.animals,
      href: "/animals",
      icon: <PawPrint className={ICON_CLASS} aria-hidden />,
    },
    {
      label: "Чернови посещения",
      value: overview.counts.draftVisits,
      href: "/visits?status=draft",
      icon: <ClipboardList className={ICON_CLASS} aria-hidden />,
      description:
        overview.todayVisits.length === 0
          ? undefined
          : `Планирани днес: ${overview.todayVisits.length}`,
    },
    {
      label: "Неплатени фактури",
      value: overview.counts.unpaidInvoices,
      href: "/invoices?unpaid=true",
      icon: <FileText className={ICON_CLASS} aria-hidden />,
      description:
        overview.totals.unpaidInvoicesTotal === 0
          ? undefined
          : `Общо: ${fmtNumberBG(overview.totals.unpaidInvoicesTotal, { style: "currency", currency: "BGN" })}`,
    },
  ];

  const recentVisits: VisitListItem[] = overview.recentVisits.map((visit) => ({
    _id: visit._id,
    code: visit.code ?? null,
    datetime: visit.datetime,
    status: visit.status,
    ownerName: visit.ownerName,
    ownerId: visit.ownerId,
    animalId: visit.animalId,
  }));

  const todayVisits: VisitListItem[] = overview.todayVisits.map((visit) => ({
    _id: visit._id,
    code: visit.code ?? null,
    datetime: visit.datetime,
    status: visit.status,
    ownerName: visit.ownerName,
    ownerId: visit.ownerId,
    animalId: visit.animalId,
  }));

  const recentInvoices: InvoiceListItem[] = overview.recentInvoices.map(
    (invoice) => ({
      _id: invoice._id,
      code: invoice.code ?? null,
      createdAt: invoice.createdAt,
      total: invoice.total,
      paid: invoice.paid,
    }),
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {brand.nameBg}
          </span>
          <h1 className="text-2xl font-semibold">Основно табло</h1>
          <p className="text-muted-foreground text-sm">
            Дневен преглед на пациенти, посещения, фактури и важни събития за
            клиниката.
          </p>
        </div>
        <AlertList alerts={overview.alerts} title="Статус" />
      </div>

      <QuickActionsCard className="lg:grid-cols-4" />

      <section className="grid gap-3 md:grid-cols-4">
        {metrics.map(({ label, value, href, icon, description }) => (
          <MetricCard
            key={label}
            label={label}
            value={value}
            href={href}
            icon={icon}
            description={description}
          />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <VisitList
          title="Посещения днес"
          visits={todayVisits}
          emptyLabel="Няма планирани посещения"
          footer={`Планирани днес: ${overview.todayVisits.length}`}
        />

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Запланирани посещения днес</h2>
            <Link
              href="/schedule"
              className="text-muted-foreground text-xs underline underline-offset-2"
            >
              Към график
            </Link>
          </div>
          <div className="divide-y rounded-md border">
            {overview.todayScheduleSlots.length === 0 ? (
              <div className="text-muted-foreground p-3 text-sm">
                Няма запланирани посещения за днес
              </div>
            ) : (
              overview.todayScheduleSlots.map((slot) => (
                <div
                  key={slot._id}
                  className="flex min-h-[72px] items-center justify-between gap-3 p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="text-primary size-4 flex-shrink-0" />
                      <Link
                        href={`/schedule?date=${new Date(slot.startTime).toISOString().split("T")[0]}`}
                        className="font-medium hover:underline"
                      >
                        {slot.title}
                      </Link>
                      <span className="text-muted-foreground text-xs">
                        {formatTimeRange(slot.startTime, slot.endTime)}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      {slot.description && (
                        <span className="truncate">
                          {slot.description.length > 20
                            ? `${slot.description.slice(0, 20)}...`
                            : slot.description}
                        </span>
                      )}
                      {slot.ownerName && <span>· {slot.ownerName}</span>}
                      {slot.animalName && <span>· {slot.animalName}</span>}
                    </div>
                  </div>
                  {slot.visitId ? (
                    <Link href={`/visits/${slot.visitId}`}>
                      <Button size="sm" variant="outline">
                        Отвори посещение
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleStartVisit(slot)}
                      disabled={!slot.ownerId || !slot.animalId}
                    >
                      Започни посещение
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <VisitList
          title="Последни посещения"
          visits={recentVisits}
          emptyLabel="Няма посещения"
          actionLabel="Всички посещения"
          footer={`Общо посещения: ${overview.recentVisits.length}`}
        />

        <InvoiceList
          title="Последни фактури"
          invoices={recentInvoices}
          emptyLabel="Няма фактури"
          summary={
            <span>
              Последни 7 дни — Платено:{" "}
              {fmtNumberBG(overview.totals.week.paid, {
                style: "currency",
                currency: "BGN",
              })}{" "}
              · Неплатено:{" "}
              {fmtNumberBG(overview.totals.week.unpaid, {
                style: "currency",
                currency: "BGN",
              })}
            </span>
          }
        />
      </section>
    </main>
  );
}
