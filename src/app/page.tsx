"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Users, PawPrint, ClipboardList, FileText } from "lucide-react";

import { api } from "@/../convex/_generated/api";
import { brand } from "@/lib/brand";
import { fmtNumberBG } from "@/lib/format";
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
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";

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

type DashboardOverview = {
  counts: DashboardCounts;
  totals: DashboardTotals;
  recentVisits: DashboardVisit[];
  recentInvoices: DashboardInvoice[];
  todayVisits: DashboardVisit[];
  patientBook: DashboardPatient[];
  alerts: string[];
};

export default function HomePage() {
  const overview = useQuery(api.dashboard.overview, {}) as
    | DashboardOverview
    | undefined;
  useBreadcrumbRegistration([
    { label: "Начало", href: "/" } satisfies BreadcrumbItem,
  ]);

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

      <section className="grid gap-4 md:grid-cols-2">
        <VisitList
          title="Посещения днес"
          visits={todayVisits}
          emptyLabel="Няма планирани посещения"
          footer={`Планирани днес: ${overview.todayVisits.length}`}
        />

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Пациентски дневник</h2>
            <Link
              href="/animals"
              className="text-muted-foreground text-xs underline underline-offset-2"
            >
              Към животни
            </Link>
          </div>
          <div className="divide-y rounded-md border">
            {overview.patientBook.length === 0 ? (
              <div className="text-muted-foreground p-3 text-sm">
                Няма пациенти
              </div>
            ) : (
              overview.patientBook.map((animal) => (
                <div
                  key={animal._id}
                  className="flex min-h-[72px] items-center justify-between gap-3 p-3 text-sm"
                >
                  <div>
                    <Link
                      href={`/animals/${animal._id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {animal.name}
                    </Link>
                    <div className="text-muted-foreground flex gap-2">
                      <span>{animal.species}</span>
                      {animal.ownerName ? (
                        <span>· {animal.ownerName}</span>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href={`/visits?animalId=${encodeURIComponent(animal._id)}`}
                  >
                    <Button size="sm" variant="outline">
                      Ново посещение
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
