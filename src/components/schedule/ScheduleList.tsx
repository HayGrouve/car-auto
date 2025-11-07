"use client";

import { formatTimeRange } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/SkeletonList";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import type { ScheduleSlot } from "@/types/schedule";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type ScheduleListProps = {
  slots: ScheduleSlot[] | undefined;
  selectedDate: Date | undefined;
  onEdit?: (slot: ScheduleSlot) => void;
  onDelete?: (slotId: string) => void;
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
      {slots.map((slot) => (
        <div
          key={slot._id}
          className="hover:bg-accent flex items-center justify-between p-3 text-sm"
        >
          <div className="flex items-center gap-3 flex-1">
            <Clock className="text-primary size-5" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">{slot.title}</div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span>{formatTimeRange(slot.startTime, slot.endTime)}</span>
                {slot.description && (
                  <span className="truncate">{slot.description}</span>
                )}
                {slot.visitId && (
                  <Link
                    href={`/visits/${slot.visitId}`}
                    className="underline-offset-2 hover:underline"
                  >
                    Посещение
                  </Link>
                )}
                {slot.animalId && (
                  <Link
                    href={`/animals/${slot.animalId}`}
                    className="underline-offset-2 hover:underline"
                  >
                    Животно
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ScheduleStatusBadge status={slot.status} />
              {onEdit && (
                <button
                  onClick={() => onEdit(slot)}
                  className="text-primary hover:underline text-xs"
                >
                  Редактирай
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(slot._id)}
                  className="text-destructive hover:underline text-xs"
                >
                  Изтрий
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

