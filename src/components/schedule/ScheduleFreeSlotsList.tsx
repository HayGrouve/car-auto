"use client";

import { useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatTimeRange } from "@/lib/format";
import {
  enumerateScheduleSlotGrid,
  isWorkingDay,
  isPastDate,
  type TimeRangeMs,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";

type ScheduleFreeSlotsListProps = {
  date: Date;
  busySlots: Array<{ startTime: number; endTime: number }>;
  selected: TimeRangeMs | null;
  onSelect: (range: TimeRangeMs) => void;
  slotDurationMinutes?: number;
  stepMinutes?: number;
  excludeBusyRange?: TimeRangeMs;
  isLoading?: boolean;
  className?: string;
  listClassName?: string;
};

export function ScheduleFreeSlotsList({
  date,
  busySlots,
  selected,
  onSelect,
  slotDurationMinutes = 30,
  stepMinutes = 15,
  excludeBusyRange,
  isLoading = false,
  className,
  listClassName,
}: ScheduleFreeSlotsListProps) {
  const slotCandidates = useMemo(
    () =>
      enumerateScheduleSlotGrid(date, busySlots, {
        slotDurationMinutes,
        stepMinutes,
        excludeBusyRange,
      }),
    [date, busySlots, slotDurationMinutes, stepMinutes, excludeBusyRange],
  );

  const isPast = isPastDate(date);
  const isWorking = isWorkingDay(date);

  let body: ReactNode;
  if (isLoading) {
    body = (
      <p className="text-muted-foreground px-1 py-2 text-sm">Зареждане...</p>
    );
  } else if (isPast) {
    body = null;
  } else if (!isWorking) {
    body = (
      <p className="text-muted-foreground px-1 py-2 text-sm">
        Не е работен ден
      </p>
    );
  } else if (slotCandidates.length === 0) {
    body = (
      <p className="text-muted-foreground px-1 py-2 text-sm">
        Няма слотове за показване
      </p>
    );
  } else {
    body = (
      <div
        role="listbox"
        aria-label="Свободни и заети часове"
        className={cn(
          "max-h-[280px] overflow-y-auto overflow-x-hidden pr-1",
          listClassName,
        )}
      >
        <ul className="flex flex-col gap-1.5">
          {slotCandidates.map((candidate) => {
            const isSel =
              candidate.available &&
              selected !== null &&
              selected.startTime === candidate.startTime &&
              selected.endTime === candidate.endTime;
            const label = formatTimeRange(
              candidate.startTime,
              candidate.endTime,
            );
            return (
              <li
                key={`${candidate.startTime}-${candidate.endTime}`}
                role="none"
              >
                <Button
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={!candidate.available}
                  disabled={!candidate.available}
                  variant={isSel ? "default" : "outline"}
                  className={cn(
                    "h-auto w-full justify-start py-2 font-normal",
                    !candidate.available &&
                      "cursor-not-allowed border-transparent bg-muted/45 text-muted-foreground opacity-80",
                  )}
                  onClick={() => {
                    if (candidate.available) {
                      onSelect({
                        startTime: candidate.startTime,
                        endTime: candidate.endTime,
                      });
                    }
                  }}
                >
                  {label}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (isPast && !isLoading) {
    return null;
  }

  return <div className={cn(className)}>{body}</div>;
}
