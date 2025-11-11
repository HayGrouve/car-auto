"use client";

import { formatTimeRange } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/SkeletonList";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import type { ScheduleSlot } from "@/types/schedule";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { isPastDate } from "@/lib/schedule";

type ScheduleListProps = {
  slots: ScheduleSlot[] | undefined;
  selectedDate: Date | undefined;
  onEdit?: (slot: ScheduleSlot) => void;
  onDelete?: (slotId: string) => void;
  visitMap?: Map<string, string>;
  animalMap?: Map<string, string>;
};

function ScheduleStatusBadge({ status }: { status: string }) {
  const label =
    status === "scheduled"
      ? "Планирано"
      : status === "completed"
        ? "Завършено"
        : status === "cancelled"
          ? "Отменено"
          : status;
  const cls =
    status === "scheduled"
      ? "bg-primary/10 text-primary border-primary/20"
      : status === "completed"
        ? "bg-secondary/30 text-foreground border"
        : status === "cancelled"
          ? "bg-muted text-muted-foreground border"
          : "bg-muted text-foreground border";
  return (
    <Badge variant="outline" className={cls}>
      {label}
    </Badge>
  );
}

export function ScheduleList({
  slots,
  selectedDate,
  onEdit,
  onDelete,
  visitMap,
  animalMap,
}: ScheduleListProps) {
  if (slots === undefined) {
    return <SkeletonList rows={6} />;
  }

  if (!selectedDate) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title="Изберете дата"
        description="Изберете дата от календара, за да видите графика за този ден."
      />
    );
  }

  if (slots.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Няма записани часове"
        description="Няма записани часове за избрания ден."
      />
    );
  }

  return (
    <div className="divide-y rounded-md border">
      {slots.map((slot) => {
        const slotDate = new Date(slot.date);
        const isSlotPast = isPastDate(slotDate);
        
        return (
          <div
            key={slot._id}
            className="flex flex-col gap-3 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="text-primary size-4 flex-shrink-0" />
                <div className="font-medium truncate">{slot.title}</div>
              </div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex-shrink-0">{formatTimeRange(slot.startTime, slot.endTime)}</span>
                {slot.description && (
                  <span className="truncate">{slot.description}</span>
                )}
                {slot.visitId && (
                  <Link
                    href={`/visits/${slot.visitId}`}
                    className="underline-offset-2 hover:underline cursor-pointer min-h-[44px] flex items-center"
                  >
                    {visitMap?.get(slot.visitId) ?? "Посещение"}
                  </Link>
                )}
                {slot.animalId && (
                  <Link
                    href={`/animals/${slot.animalId}`}
                    className="underline-offset-2 hover:underline cursor-pointer min-h-[44px] flex items-center"
                  >
                    {animalMap?.get(slot.animalId) ?? "Животно"}
                  </Link>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
              <ScheduleStatusBadge status={slot.status} />
              {!isSlotPast && onEdit && (
                <button
                  onClick={() => onEdit(slot)}
                  className="text-primary hover:underline text-xs cursor-pointer min-h-[44px] px-2 flex items-center"
                >
                  Редактирай
                </button>
              )}
              {!isSlotPast && onDelete && (
                <button
                  onClick={() => onDelete(slot._id)}
                  className="text-destructive hover:underline text-xs cursor-pointer min-h-[44px] px-2 flex items-center"
                >
                  Изтрий
                </button>
              )}
              {isSlotPast && (
                <span className="text-muted-foreground text-xs min-h-[44px] flex items-center">
                  Само за преглед
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

