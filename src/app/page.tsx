"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

import { api } from "@/../convex/_generated/api";
import { brand } from "@/lib/brand";
import { formatTimeRange } from "@/lib/format";
import { SkeletonList } from "@/components/SkeletonList";
import { TodayInvoicesChart } from "@/components/dashboard/TodayInvoicesChart";
import { StatusBarChart } from "@/components/dashboard/StatusBarChart";
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

  // Query for draft visits to check if animals have existing visits
  const allDraftVisits = useQuery(
    api.visits.list,
    useMemo(() => ({ status: "draft", limit: 1000 }), []),
  ) as
    | {
        _id: string;
        animalId?: string | null;
      }[]
    | undefined;

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
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {brand.nameBg}
          </span>
          <h1 className="text-2xl font-semibold">Основно табло</h1>
          <p className="text-muted-foreground text-sm">
            Дневен преглед на пациенти, посещения, фактури и важни събития за
            клиниката.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">График днес</h2>
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
                Няма планирани посещения за днес
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
                        className="cursor-pointer font-medium hover:underline"
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
                  ) : slot.animalId &&
                    animalDraftVisitMap.has(slot.animalId) ? (
                    <Button
                      size="sm"
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

        <VisitList
          title="Посещения днес"
          visits={todayVisits}
          emptyLabel="Няма планирани посещения"
          footer={`Планирани днес: ${overview.todayVisits.length}`}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-lg border p-4">
          <TodayInvoicesChart
            paid={overview.totals.today.paid ?? 0}
            unpaid={overview.totals.today.unpaid ?? 0}
          />
        </div>
        <div className="flex flex-col rounded-lg border p-4">
          <StatusBarChart
            unpaidInvoices={overview.counts.unpaidInvoices ?? 0}
            draftVisits={overview.counts.draftVisits ?? 0}
          />
        </div>
      </section>
    </main>
  );
}
