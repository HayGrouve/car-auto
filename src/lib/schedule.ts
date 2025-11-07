import { startOfDay, getDay, setHours, setMinutes, isWithinInterval } from "date-fns";

export type WorkingHours = {
  start: number; // hour (0-23)
  end: number; // hour (0-23)
};

export type DaySchedule = {
  morning?: WorkingHours;
  afternoon?: WorkingHours;
};

const WORKING_HOURS: Record<number, DaySchedule> = {
  // Monday - Friday: 09:00-12:00, 13:30-18:30
  1: { morning: { start: 9, end: 12 }, afternoon: { start: 13.5, end: 18.5 } },
  2: { morning: { start: 9, end: 12 }, afternoon: { start: 13.5, end: 18.5 } },
  3: { morning: { start: 9, end: 12 }, afternoon: { start: 13.5, end: 18.5 } },
  4: { morning: { start: 9, end: 12 }, afternoon: { start: 13.5, end: 18.5 } },
  5: { morning: { start: 9, end: 12 }, afternoon: { start: 13.5, end: 18.5 } },
  // Saturday: 09:00-13:30
  6: { morning: { start: 9, end: 13.5 } },
  // Sunday: day off (no entry)
};

export function isWorkingDay(date: Date): boolean {
  const dayOfWeek = getDay(date);
  return dayOfWeek !== 0 && WORKING_HOURS[dayOfWeek] !== undefined;
}

export function getWorkingHours(date: Date): DaySchedule | null {
  const dayOfWeek = getDay(date);
  return WORKING_HOURS[dayOfWeek] || null;
}

export function validateSlotTime(
  date: Date,
  startTime: number,
  endTime: number,
): { valid: boolean; error?: string } {
  if (!isWorkingDay(date)) {
    return { valid: false, error: "Неделята е почивен ден" };
  }

  const schedule = getWorkingHours(date);
  if (!schedule) {
    return { valid: false, error: "Няма работни часове за този ден" };
  }

  const dayStart = startOfDay(date);
  const slotStart = new Date(startTime);
  const slotEnd = new Date(endTime);

  if (slotStart >= slotEnd) {
    return { valid: false, error: "Крайният час трябва да е след началния" };
  }

  // Check if slot fits within working hours
  let fitsInSchedule = false;

  if (schedule.morning) {
    const morningStart = setMinutes(
      setHours(dayStart, schedule.morning.start),
      0,
    );
    const morningEnd = setMinutes(
      setHours(dayStart, Math.floor(schedule.morning.end)),
      (schedule.morning.end % 1) * 60,
    );
    if (
      slotStart >= morningStart &&
      slotStart < morningEnd &&
      slotEnd <= morningEnd
    ) {
      fitsInSchedule = true;
    }
  }

  if (schedule.afternoon && !fitsInSchedule) {
    const afternoonStart = setMinutes(
      setHours(dayStart, Math.floor(schedule.afternoon.start)),
      (schedule.afternoon.start % 1) * 60,
    );
    const afternoonEnd = setMinutes(
      setHours(dayStart, Math.floor(schedule.afternoon.end)),
      (schedule.afternoon.end % 1) * 60,
    );
    if (
      slotStart >= afternoonStart &&
      slotStart < afternoonEnd &&
      slotEnd <= afternoonEnd
    ) {
      fitsInSchedule = true;
    }
  }

  if (!fitsInSchedule) {
    return {
      valid: false,
      error: "Слотът трябва да е в рамките на работните часове",
    };
  }

  return { valid: true };
}

export function getNextAvailableSlot(
  date: Date,
  existingSlots: Array<{ startTime: number; endTime: number }>,
  slotDurationMinutes: number = 30,
): { startHour: number; startMinute: number; endHour: number; endMinute: number } | null {
  const schedule = getWorkingHours(date);
  if (!schedule) {
    return null;
  }

  const dayStart = startOfDay(date);
  const slots: Array<{ start: number; end: number }> = [];

  // Build working time periods
  if (schedule.morning) {
    const morningStart = setMinutes(
      setHours(dayStart, schedule.morning.start),
      0,
    );
    const morningEnd = setMinutes(
      setHours(dayStart, Math.floor(schedule.morning.end)),
      (schedule.morning.end % 1) * 60,
    );
    slots.push({
      start: morningStart.getTime(),
      end: morningEnd.getTime(),
    });
  }

  if (schedule.afternoon) {
    const afternoonStart = setMinutes(
      setHours(dayStart, Math.floor(schedule.afternoon.start)),
      (schedule.afternoon.start % 1) * 60,
    );
    const afternoonEnd = setMinutes(
      setHours(dayStart, Math.floor(schedule.afternoon.end)),
      (schedule.afternoon.end % 1) * 60,
    );
    slots.push({
      start: afternoonStart.getTime(),
      end: afternoonEnd.getTime(),
    });
  }

  // Sort existing slots by start time
  const sortedExisting = [...existingSlots]
    .map((s) => ({ start: s.startTime, end: s.endTime }))
    .sort((a, b) => a.start - b.start);

  // Find the first available gap
  for (const period of slots) {
    let currentTime = period.start;
    const periodEnd = period.end;

    // Check if we can fit a slot at the start of the period
    if (sortedExisting.length === 0 || sortedExisting[0].start > currentTime + slotDurationMinutes * 60 * 1000) {
      const endTime = currentTime + slotDurationMinutes * 60 * 1000;
      if (endTime <= periodEnd) {
        return {
          startHour: new Date(currentTime).getHours(),
          startMinute: new Date(currentTime).getMinutes(),
          endHour: new Date(endTime).getHours(),
          endMinute: new Date(endTime).getMinutes(),
        };
      }
    }

    // Check gaps between existing slots
    for (const existing of sortedExisting) {
      // If there's a gap before this slot
      if (currentTime < existing.start) {
        const gapDuration = existing.start - currentTime;
        if (gapDuration >= slotDurationMinutes * 60 * 1000) {
          const endTime = currentTime + slotDurationMinutes * 60 * 1000;
          if (endTime <= periodEnd) {
            return {
              startHour: new Date(currentTime).getHours(),
              startMinute: new Date(currentTime).getMinutes(),
              endHour: new Date(endTime).getHours(),
              endMinute: new Date(endTime).getMinutes(),
            };
          }
        }
      }
      // Move current time to after this slot
      currentTime = Math.max(currentTime, existing.end);
    }

    // Check if there's space after the last slot
    if (currentTime < periodEnd) {
      const endTime = currentTime + slotDurationMinutes * 60 * 1000;
      if (endTime <= periodEnd) {
        return {
          startHour: new Date(currentTime).getHours(),
          startMinute: new Date(currentTime).getMinutes(),
          endHour: new Date(endTime).getHours(),
          endMinute: new Date(endTime).getMinutes(),
        };
      }
    }
  }

  // If no gap found, return the first available time in working hours
  if (slots.length > 0) {
    const firstPeriod = slots[0];
    const firstStart = new Date(firstPeriod.start);
    const firstEnd = firstStart.getTime() + slotDurationMinutes * 60 * 1000;
    if (firstEnd <= firstPeriod.end) {
      return {
        startHour: firstStart.getHours(),
        startMinute: firstStart.getMinutes(),
        endHour: new Date(firstEnd).getHours(),
        endMinute: new Date(firstEnd).getMinutes(),
      };
    }
  }

  return null;
}

export function getAvailableHours(date: Date): number[] {
  const schedule = getWorkingHours(date);
  if (!schedule) {
    return [];
  }

  const hours = new Set<number>();

  if (schedule.morning) {
    const start = Math.floor(schedule.morning.start);
    const end = Math.ceil(schedule.morning.end);
    for (let h = start; h < end; h++) {
      hours.add(h);
    }
  }

  if (schedule.afternoon) {
    const start = Math.floor(schedule.afternoon.start);
    const end = Math.ceil(schedule.afternoon.end);
    for (let h = start; h < end; h++) {
      hours.add(h);
    }
  }

  return Array.from(hours).sort((a, b) => a - b);
}

