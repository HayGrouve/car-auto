"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { formatTimeRange } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { CalendarKind } from "@/lib/calendar-kind";

export type TodayScheduleSlotItem = {
  _id: string;
  title: string;
  description: string | null;
  startTime: number;
  endTime: number;
  visitId: string | null;
  customerId: string | null;
  customerName: string | null;
  vehicleId: string | null;
  vehicleName: string | null;
  calendarKind: CalendarKind;
};

type TodayScheduleColumnProps = {
  title: string;
  slots: TodayScheduleSlotItem[];
  emptyLabel: string;
  vehicleDraftVisitMap: Map<string, string>;
  onStartVisit: (slot: TodayScheduleSlotItem) => void;
};

export function TodayScheduleColumn({
  title,
  slots,
  emptyLabel,
  vehicleDraftVisitMap,
  onStartVisit,
}: TodayScheduleColumnProps) {
  const router = useRouter();

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="divide-y rounded-md border">
        {slots.length === 0 ? (
          <div className="text-muted-foreground flex min-h-[72px] items-center p-3 text-sm">
            {emptyLabel}
          </div>
        ) : (
          slots.map((slot) => {
            const dateStr = new Date(slot.startTime).toISOString().split("T")[0];
            return (
              <div
                key={slot._id}
                className="flex min-h-[72px] flex-col gap-3 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Clock className="text-primary size-4 shrink-0" />
                    <Link
                      href={`/schedule?date=${dateStr}&calendar=${slot.calendarKind}`}
                      className="flex min-h-[44px] cursor-pointer items-center font-medium hover:underline"
                    >
                      <span className="truncate">{slot.title}</span>
                    </Link>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatTimeRange(slot.startTime, slot.endTime)}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {slot.description ? (
                      <span className="truncate">
                        {slot.description.length > 20
                          ? `${slot.description.slice(0, 20)}...`
                          : slot.description}
                      </span>
                    ) : null}
                    {slot.customerName ? (
                      <span className="truncate">· {slot.customerName}</span>
                    ) : null}
                    {slot.vehicleName ? (
                      <span className="truncate">· {slot.vehicleName}</span>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0">
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
                  ) : slot.vehicleId &&
                    vehicleDraftVisitMap.has(slot.vehicleId) ? (
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        className="min-h-[44px] w-full sm:min-h-0 sm:w-auto"
                        onClick={() => {
                          const draftVisitId = vehicleDraftVisitMap.get(
                            slot.vehicleId!,
                          );
                          if (draftVisitId) {
                            router.push(`/visits/${draftVisitId}`);
                          }
                        }}
                        disabled={!slot.customerId || !slot.vehicleId}
                      >
                        Продължи посещение
                      </Button>
                      {(!slot.customerId || !slot.vehicleId) && (
                        <p className="text-muted-foreground text-center text-xs sm:text-left">
                          {!slot.customerId && !slot.vehicleId
                            ? "Добавете клиент и автомобил в графика"
                            : !slot.customerId
                              ? "Добавете клиент в графика"
                              : "Добавете автомобил в графика"}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        className="min-h-[44px] w-full sm:min-h-0 sm:w-auto"
                        onClick={() => onStartVisit(slot)}
                        disabled={!slot.customerId || !slot.vehicleId}
                      >
                        Започни посещение
                      </Button>
                      {(!slot.customerId || !slot.vehicleId) && (
                        <p className="text-muted-foreground text-center text-xs sm:text-left">
                          {!slot.customerId && !slot.vehicleId
                            ? "Добавете клиент и автомобил в графика"
                            : !slot.customerId
                              ? "Добавете клиент в графика"
                              : "Добавете автомобил в графика"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
