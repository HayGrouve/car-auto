"use client";

import { Calendar } from "@/components/ui/calendar";
import { bg } from "date-fns/locale";
import { isWorkingDay, isPastDate } from "@/lib/schedule";

type ScheduleCalendarProps = {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  slotsByDate?: Record<string, number>; // date string -> count of slots
};

export function ScheduleCalendar({
  selected,
  onSelect,
  slotsByDate = {},
}: ScheduleCalendarProps) {
  const handleSelect = (date: Date | undefined) => {
    // Allow selecting past dates for viewing, but only if it's a working day
    if (date && !isWorkingDay(date)) {
      return;
    }
    onSelect?.(date);
  };

  const modifiers = {
    hasSlots: (date: Date) => {
      const dateStr = date.toISOString().split("T")[0];
      if (!dateStr) return false;
      return (slotsByDate?.[dateStr] ?? 0) > 0;
    },
    past: (date: Date) => isPastDate(date),
    disabled: (date: Date) => !isWorkingDay(date), // Only disable non-working days
  };

  const modifiersClassNames = {
    hasSlots: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary",
    past: "opacity-50 cursor-pointer", // Keep past days visually disabled but clickable
  };

  return (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={handleSelect}
      locale={bg}
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      disabled={(date) => !isWorkingDay(date)} // Only disable non-working days
      className="rounded-md border"
    />
  );
}

