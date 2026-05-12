"use client";

import { useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { fmtDateBG, fmtDateTimeBG } from "@/lib/format";

type CustomerSummary = {
  _id: string;
  name: string;
  phone?: string;
};

type VisitSummary = {
  _id: string;
  datetime?: number | null;
  createdAt?: number;
  status: string;
  services?: string[];
  parts?: string[];
};

type VehicleSummary = {
  licensePlate?: string | null;
  make?: string | null;
  model?: string | null;
  vin?: string | null;
  year?: number | string | null;
  updatedAt?: number | null;
};

interface VehicleSummaryCardProps {
  vehicle: VehicleSummary;
  customer?: CustomerSummary;
  lastVisit?: VisitSummary;
  visits?: VisitSummary[];
  isLoading?: boolean;
}

type HistoryItem = {
  id: string;
  label: string;
  date?: number;
  type: "service" | "part";
};

export function VehicleSummaryCard({
  vehicle,
  customer,
  lastVisit: _lastVisit,
  visits,
  isLoading,
}: VehicleSummaryCardProps) {
  const historyItems = useMemo<HistoryItem[]>(() => {
    if (!visits) return [];

    const items: HistoryItem[] = [];

    for (const visit of visits) {
      const baseDate = visit.datetime ?? visit.createdAt ?? undefined;

      for (const service of visit.services ?? []) {
        items.push({
          id: `${visit._id}-service-${service}`,
          label: service,
          date: baseDate,
          type: "service",
        });
      }

      for (const part of visit.parts ?? []) {
        items.push({
          id: `${visit._id}-part-${part}`,
          label: part,
          date: baseDate,
          type: "part",
        });
      }
    }

    return items.sort((a, b) => (b.date ?? 0) - (a.date ?? 0)).slice(0, 2);
  }, [visits]);

  const visitMetrics = useMemo(() => {
    const allVisits = visits ?? [];
    return {
      total: allVisits.length,
      drafts: allVisits.filter((v) => v.status === "draft").length,
      finalized: allVisits.filter((v) => v.status === "finalized").length,
    };
  }, [visits]);

  const recentVisits = useMemo(() => {
    const allVisits = visits ?? [];
    return allVisits.slice(0, 3);
  }, [visits]);

  const handleCopyPhone = async (phone?: string) => {
    if (!phone) return;

    try {
      await navigator.clipboard.writeText(phone);
      toast.success("Телефонът е копиран");
    } catch {
      toast.error("Неуспех при копиране на телефона");
    }
  };

  if (isLoading) {
    return (
      <SectionCard className="shadow-md" title="Резюме">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="bg-muted h-3 w-20 animate-pulse rounded" />
            <div className="bg-muted h-8 w-2/3 animate-pulse rounded" />
            <div className="bg-muted h-3 w-48 animate-pulse rounded" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="space-y-2 rounded-lg border px-4 py-3"
              >
                <div className="bg-muted h-3 w-24 animate-pulse rounded" />
                <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                <div className="bg-muted h-3 w-40 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard className="shadow-md" title="Резюме">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="space-y-2">
              {vehicle.updatedAt ? (
                <p className="text-muted-foreground text-xs">
                  Обновено {fmtDateTimeBG(vehicle.updatedAt)}
                </p>
              ) : null}
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-semibold tracking-tight">
                  {vehicle.licensePlate ?? "Без рег. номер"}
                </span>
                <span className="text-muted-foreground text-sm">
                  {[vehicle.make, vehicle.model].filter(Boolean).join(" · ") ??
                    "Неуточнено"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {vehicle.year ? (
                <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                  {vehicle.year} г.
                </span>
              ) : null}
              {vehicle.vin ? (
                <span className="bg-muted inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                  VIN {vehicle.vin}
                </span>
              ) : null}
            </div>
          </div>
          <div className="border-border/60 bg-card/80 w-full max-w-sm rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                Клиент
              </p>
              {customer ? (
                <Link
                  href={`/customers/${customer._id}`}
                  className="text-primary hover:text-primary/80 text-xs font-medium underline underline-offset-4 transition-colors"
                >
                  Преглед
                </Link>
              ) : null}
            </div>
            {customer ? (
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{customer.name}</p>
                  {customer.phone ? (
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <span>{customer.phone}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-primary hover:text-primary/80 size-7"
                        onClick={() => handleCopyPhone(customer.phone)}
                        aria-label="Копирай телефон"
                      >
                        <Copy className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4">
          <SectionCard title="История">
            <div className="space-y-3">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-muted-foreground text-xs">
                    {item.label}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {item.date ? fmtDateTimeBG(item.date) : "Не е отбелязана"}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Последни посещения">
            <div className="space-y-3">
              {recentVisits.map((visit) => (
                <div key={visit._id} className="flex flex-col gap-1">
                  <p className="text-sm font-medium">
                    {fmtDateTimeBG(
                      visit.datetime ?? visit.createdAt ?? Date.now(),
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {visit.status}
                  </p>
                  {visit.services && visit.services.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      Услуги: {visit.services.join(", ")}
                    </p>
                  )}
                  {visit.parts && visit.parts.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      Части: {visit.parts.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Метрики">
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Общо посещения:</span>
                <span>{visitMetrics.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Чернови:</span>
                <span>{visitMetrics.drafts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Финализирани:</span>
                <span>{visitMetrics.finalized}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </SectionCard>
  );
}
