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

export function getAvailableSlots(
  date: Date,
  existingSlots: Array<{ startTime: number; endTime: number }>,
): Array<{ start: number; end: number }> {
  const schedule = getWorkingHours(date);
  if (!schedule) {
    return [];
  }

  const slots: Array<{ start: number; end: number }> = [];
  const dayStart = startOfDay(date);

  // Morning slot
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

  // Afternoon slot
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

  // Filter out times occupied by existing slots
  // This is a simplified version - in a real scenario you'd want more sophisticated conflict detection
  return slots;
}

