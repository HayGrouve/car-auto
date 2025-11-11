"use client";

import { useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { fmtDateBG, fmtDateTimeBG } from "@/lib/format";

type OwnerSummary = {
  _id: string;
  name: string;
  phone?: string;
};

type WeightSummary = {
  kg: number;
  notedAt?: number;
  createdAt: number;
};

type VisitSummary = {
  _id: string;
  datetime?: number | null;
  createdAt?: number;
  status: string;
  procedures?: string[];
  medications?: string[];
};

type AnimalSummary = {
  name?: string | null;
  species?: string | null;
  breed?: string | null;
  neutered?: boolean | null;
  microchip?: string | null;
  dob?: number | string | null;
  updatedAt?: number | null;
  sex?: string | null;
};

interface AnimalSummaryCardProps {
  animal: AnimalSummary;
  owner?: OwnerSummary;
  summaryAge: number | null;
  latestWeight?: WeightSummary;
  lastVisit?: VisitSummary;
  visits?: VisitSummary[];
  isLoading?: boolean;
}

type HistoryItem = {
  id: string;
  label: string;
  date?: number;
  type: "procedure" | "medication";
};

export function AnimalSummaryCard({
  animal,
  owner,
  summaryAge,
  latestWeight: _latestWeight,
  lastVisit: _lastVisit,
  visits,
  isLoading,
}: AnimalSummaryCardProps) {
  const historyItems = useMemo<HistoryItem[]>(() => {
    if (!visits) return [];

    const items: HistoryItem[] = [];

    for (const visit of visits) {
      const baseDate = visit.datetime ?? visit.createdAt ?? undefined;

      for (const procedure of visit.procedures ?? []) {
        items.push({
          id: `${visit._id}-procedure-${procedure}`,
          label: procedure,
          date: baseDate,
          type: "procedure",
        });
      }

      for (const medication of visit.medications ?? []) {
        items.push({
          id: `${visit._id}-medication-${medication}`,
          label: medication,
          date: baseDate,
          type: "medication",
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

  const latestWeightDisplay = useMemo(() => {
    if (!_latestWeight) return "Не е записвано тегло";
    return `${_latestWeight.kg.toFixed(2)} кг (
      ${fmtDateTimeBG(_latestWeight.notedAt ?? _latestWeight.createdAt)}
    )`;
  }, [_latestWeight]);

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
              {animal.updatedAt ? (
                <p className="text-muted-foreground text-xs">
                  Обновено {fmtDateTimeBG(animal.updatedAt)}
                </p>
              ) : null}
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-semibold tracking-tight">
                  {animal.name ?? "Без име"}
                </span>
                <span className="text-muted-foreground text-sm">
                  {[animal.species, animal.breed].filter(Boolean).join(" · ") ??
                    "Неуточнено"}
                </span>
                <span className="bg-muted inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                  {animal.sex === "male"
                    ? "Мъжки"
                    : animal.sex === "female"
                      ? "Женски"
                      : "Неизвестен"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="size-3.5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {summaryAge !== null
                  ? `${summaryAge} г.`
                  : animal.dob
                    ? fmtDateBG(new Date(animal.dob))
                    : "Дата на раждане неизвестна"}
              </span>
              <span className="bg-muted inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="size-3.5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.098 19.902A11.953 11.953 0 0112 17.25c2.818 0 5.414.978 7.402 2.652M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {animal.neutered
                  ? animal.sex === "male"
                    ? "Кастриран"
                    : animal.sex === "female"
                      ? "Кастрирана"
                      : "Кастриран/а"
                  : animal.sex === "male"
                    ? "Некастриран"
                    : animal.sex === "female"
                      ? "Некастрирана"
                      : "Некатстриран/а"}
              </span>
              {animal.microchip ? (
                <span className="bg-muted inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="size-3.5"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 7.5l-7.5 9M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Микрочип {animal.microchip}
                </span>
              ) : null}
              <span className="bg-muted inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="size-3.5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m6-6H6"
                  />
                </svg>
                {latestWeightDisplay}
              </span>
            </div>
          </div>
          <div className="border-border/60 bg-card/80 w-full max-w-sm rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                Собственик
              </p>
              {owner ? (
                <Link
                  href={`/owners/${owner._id}`}
                  className="text-primary hover:text-primary/80 text-xs font-medium underline underline-offset-4 transition-colors"
                >
                  Преглед
                </Link>
              ) : null}
            </div>
            {owner ? (
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{owner.name}</p>
                  {owner.phone ? (
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <span>{owner.phone}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-primary hover:text-primary/80 size-7"
                        onClick={() => handleCopyPhone(owner.phone)}
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
                  {visit.procedures && visit.procedures.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      Процедури: {visit.procedures.join(", ")}
                    </p>
                  )}
                  {visit.medications && visit.medications.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      Медикаменти: {visit.medications.join(", ")}
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
