"use client";

import Link from "next/link";
import { useMemo, Suspense, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { Clock, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import dynamic from "next/dynamic";

import { api } from "@/../convex/_generated/api";
import { brand } from "@/lib/brand";
import { formatTimeRange } from "@/lib/format";
import { SkeletonList } from "@/components/SkeletonList";
import {
  VisitList,
  type VisitListItem,
} from "@/components/dashboard/VisitList";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";
import type { Id } from "@/../convex/_generated/dataModel";

// Lazy load heavy chart components
const TodayInvoicesChart = dynamic(
  () =>
    import("@/components/dashboard/TodayInvoicesChart").then((m) => ({
      default: m.TodayInvoicesChart,
    })),
  { ssr: false },
);

const StatusBarChart = dynamic(
  () =>
    import("@/components/dashboard/StatusBarChart").then((m) => ({
      default: m.StatusBarChart,
    })),
  { ssr: false },
);

const MonthlyRevenueChart = dynamic(
  () =>
    import("@/components/dashboard/MonthlyRevenueChart").then((m) => ({
      default: m.MonthlyRevenueChart,
    })),
  { ssr: false },
);

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
  todayVisits: DashboardVisit[];
  todayScheduleSlots: DashboardScheduleSlot[];
  visitInvoiceMap: Record<string, string>; // visitId -> invoiceId
};

export default function HomePage() {
  const router = useRouter();
  const [chartView, setChartView] = useState<"today" | "monthly">("today");
  const overview = useQuery(api.dashboard.overview, {}) as
    | DashboardOverview
    | undefined;
  const monthlyRevenue = useQuery(api.dashboard.monthlyRevenue, {});

  const monthlyRevenueData = useMemo(() => {
    return (monthlyRevenue as any[])?.map((m) => ({
      name: m.name as string,
      paid: m.paid as number,
      unpaid: m.unpaid as number,
    })) ?? [];
  }, [monthlyRevenue]);
  const createVisit = useMutation(api.visits.create) as unknown as (args: {
    ownerId: string;
    animalId?: string;
    datetime?: number;
    soap: { s?: string; o?: string; a?: string; p?: string };
  }) => Promise<{ ok: boolean; id?: string; reason?: string }>;
  const updateScheduleSlot = useMutation(api.schedule.update);

  // Query for draft visits to check if animals have existing visits
  const allDraftVisitsQuery = useQuery(
    api.visits.list,
    useMemo(() => ({ status: "draft", limit: 1000 }), []),
  );
  const allDraftVisitsResult = allDraftVisitsQuery as
    | {
        items: {
          _id: string;
          animalId?: string | null;
        }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const allDraftVisits = allDraftVisitsResult?.items;

  // Create a map of animalId -> draft visit ID
  const animalDraftVisitMap = useMemo(() => {
    const map = new Map<string, string>();
    if (allDraftVisits) {
      allDraftVisits.forEach((visit) => {
        if (visit.animalId) {
          map.set(String(visit.animalId), visit._id);
        }
      });
    }
    return map;
  }, [allDraftVisits]);

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
          <h1 className="text-xl font-semibold sm:text-2xl md:text-3xl">
            Табло на {brand.nameBg}
          </h1>
          <div className="w-72">
            <SkeletonList rows={1} />
          </div>
        </div>
        <SkeletonList rows={4} />
        <SkeletonList rows={6} />
      </main>
    );
  }

  const todayVisits: VisitListItem[] = overview.todayVisits.map((visit) => ({
    _id: visit._id,
    code: visit.code ?? null,
    datetime: visit.datetime,
    status: visit.status,
    ownerName: visit.ownerName,
    ownerId: visit.ownerId,
    animalId: visit.animalId,
    invoiceId: overview.visitInvoiceMap[visit._id] ?? null,
  }));

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold sm:text-2xl md:text-3xl">
            Основно табло
          </h1>
          <p className="text-muted-foreground text-sm">
            Дневен преглед на пациенти, посещения, фактури и важни събития за
            клиниката.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="relative flex flex-col rounded-lg border p-4">
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() =>
                setChartView(chartView === "today" ? "monthly" : "today")
              }
              title={
                chartView === "today"
                  ? "Виж месечни приходи"
                  : "Виж днешни фактури"
              }
            >
              {chartView === "today" ? (
                <BarChart3 className="size-4" />
              ) : (
                <PieChartIcon className="size-4" />
              )}
            </Button>
          </div>
          <Suspense
            fallback={
              <div className="flex h-[300px] items-center justify-center sm:h-[400px]">
                <SkeletonList rows={1} />
              </div>
            }
          >
            {chartView === "today" ? (
              <TodayInvoicesChart
                paid={overview.totals.today.paid ?? 0}
                unpaid={overview.totals.today.unpaid ?? 0}
              />
            ) : (
              <MonthlyRevenueChart data={monthlyRevenueData} />
            )}
          </Suspense>
        </div>
        <div className="flex flex-col rounded-lg border p-4">
          <Suspense
            fallback={
              <div className="flex h-[300px] items-center justify-center">
                <SkeletonList rows={1} />
              </div>
            }
          >
            <StatusBarChart
              unpaidInvoices={overview.counts.unpaidInvoices ?? 0}
              draftVisits={overview.counts.draftVisits ?? 0}
            />
          </Suspense>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">График днес</h2>
          </div>
          <div className="divide-y rounded-md border">
            {overview.todayScheduleSlots.length === 0 ? (
              <div className="text-muted-foreground flex min-h-[72px] items-center p-3 text-sm">
                Няма планирани посещения за днес
              </div>
            ) : (
              overview.todayScheduleSlots.map((slot) => (
                <div
                  key={slot._id}
                  className="flex min-h-[72px] flex-col gap-3 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Clock className="text-primary size-4 flex-shrink-0" />
                      <Link
                        href={`/schedule?date=${new Date(slot.startTime).toISOString().split("T")[0]}`}
                        className="flex min-h-[44px] cursor-pointer items-center font-medium hover:underline"
                      >
                        <span className="truncate">{slot.title}</span>
                      </Link>
                      <span className="text-muted-foreground flex-shrink-0 text-xs">
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
                      {slot.ownerName && (
                        <span className="truncate">· {slot.ownerName}</span>
                      )}
                      {slot.animalName && (
                        <span className="truncate">· {slot.animalName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {slot.visitId ? (
                      <Link href={`/visits/${slot.visitId}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-[44px] w-full sm:min-h-0 sm:w-auto"
                        >
                          Отвори посещение
                        </Button>
                      </Link>
                    ) : slot.animalId &&
                      animalDraftVisitMap.has(slot.animalId) ? (
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          className="min-h-[44px] w-full sm:min-h-0 sm:w-auto"
                          onClick={() => {
                            const draftVisitId = animalDraftVisitMap.get(
                              slot.animalId!,
                            );
                            if (draftVisitId) {
                              router.push(`/visits/${draftVisitId}`);
                            }
                          }}
                          disabled={!slot.ownerId || !slot.animalId}
                        >
                          Продължи посещение
                        </Button>
                        {(!slot.ownerId || !slot.animalId) && (
                          <p className="text-muted-foreground text-center text-xs sm:text-left">
                            {!slot.ownerId && !slot.animalId
                              ? "Добавете собственик и животно в графика"
                              : !slot.ownerId
                                ? "Добавете собственик в графика"
                                : "Добавете животно в графика"}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          className="min-h-[44px] w-full sm:min-h-0 sm:w-auto"
                          onClick={() => handleStartVisit(slot)}
                          disabled={!slot.ownerId || !slot.animalId}
                        >
                          Започни посещение
                        </Button>
                        {(!slot.ownerId || !slot.animalId) && (
                          <p className="text-muted-foreground text-center text-xs sm:text-left">
                            {!slot.ownerId && !slot.animalId
                              ? "Добавете собственик и животно в графика"
                              : !slot.ownerId
                                ? "Добавете собственик в графика"
                                : "Добавете животно в графика"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <VisitList
          title={`Посещения днес: ${overview.todayVisits.length}`}
          visits={todayVisits}
          emptyLabel="Няма планирани посещения"
        />
      </section>
    </main>
  );
}
