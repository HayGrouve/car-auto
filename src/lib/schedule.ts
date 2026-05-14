import {
  startOfDay,
  getDay,
  setHours,
  setMinutes,
  isBefore,
  isToday,
} from "date-fns";

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

export function isPastDate(date: Date): boolean {
  const today = startOfDay(new Date());
  const checkDate = startOfDay(date);
  return isBefore(checkDate, today);
}

export function getWorkingHours(date: Date): DaySchedule | null {
  const dayOfWeek = getDay(date);
  return WORKING_HOURS[dayOfWeek] ?? null;
}

export function validateSlotTime(
  date: Date,
  startTime: number,
  endTime: number,
): { valid: boolean; error?: string } {
  if (isPastDate(date)) {
    return { valid: false, error: "Не можете да планирате слотове за минали дни" };
  }

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

export type TimeRangeMs = { startTime: number; endTime: number };

/** One grid cell (fixed duration, step-aligned) inside working hours. */
export type ScheduleSlotCandidate = TimeRangeMs & {
  /** False when overlapping merged busy intervals (or outside working hours — not emitted). */
  available: boolean;
};

export type ListFreeSlotRangesOptions = {
  slotDurationMinutes?: number;
  stepMinutes?: number;
  /** When editing, treat this interval as free (not busy). */
  excludeBusyRange?: TimeRangeMs;
  /** For tests; defaults to `Date.now()`. */
  now?: number;
};

export function getWorkingPeriodsMs(date: Date): Array<{ start: number; end: number }> {
  const schedule = getWorkingHours(date);
  if (!schedule) {
    return [];
  }

  const dayStart = startOfDay(date);
  const periods: Array<{ start: number; end: number }> = [];

  if (schedule.morning) {
    const morningStart = setMinutes(
      setHours(dayStart, schedule.morning.start),
      0,
    );
    const morningEnd = setMinutes(
      setHours(dayStart, Math.floor(schedule.morning.end)),
      (schedule.morning.end % 1) * 60,
    );
    periods.push({
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
    periods.push({
      start: afternoonStart.getTime(),
      end: afternoonEnd.getTime(),
    });
  }

  return periods;
}

function mergeBusyIntervals(
  intervals: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  if (intervals.length === 0) {
    return [];
  }
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  let cur = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (n.start <= cur.end) {
      cur = { start: cur.start, end: Math.max(cur.end, n.end) };
    } else {
      merged.push(cur);
      cur = n;
    }
  }
  merged.push(cur);
  return merged;
}

/** Cut `ex` out of merged busy segments so that interval shows as free (edit flow). */
function subtractIntervalFromMergedBusy(
  merged: Array<{ start: number; end: number }>,
  ex: TimeRangeMs,
): Array<{ start: number; end: number }> {
  const exS = ex.startTime;
  const exE = ex.endTime;
  const out: Array<{ start: number; end: number }> = [];
  for (const seg of merged) {
    if (exE <= seg.start || exS >= seg.end) {
      out.push(seg);
      continue;
    }
    if (exS > seg.start) {
      out.push({ start: seg.start, end: Math.min(exS, seg.end) });
    }
    if (exE < seg.end) {
      out.push({ start: Math.max(exE, seg.start), end: seg.end });
    }
  }
  return out.filter((s) => s.end > s.start);
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Every step-aligned slot window inside working hours (busy = `available: false`).
 * Past starts on “today” are omitted (same as free-slot listing).
 */
export function enumerateScheduleSlotGrid(
  date: Date,
  busySlots: Array<{ startTime: number; endTime: number }>,
  options: ListFreeSlotRangesOptions = {},
): ScheduleSlotCandidate[] {
  const slotDurationMinutes = options.slotDurationMinutes ?? 30;
  const stepMinutes = options.stepMinutes ?? 15;
  const nowTs = options.now ?? Date.now();

  const workingPeriods = getWorkingPeriodsMs(date);
  if (workingPeriods.length === 0) {
    return [];
  }

  let mergedBusy = mergeBusyIntervals(
    busySlots.map((s) => ({ start: s.startTime, end: s.endTime })),
  );
  if (options.excludeBusyRange) {
    mergedBusy = subtractIntervalFromMergedBusy(
      mergedBusy,
      options.excludeBusyRange,
    );
  }

  const slotMs = slotDurationMinutes * 60 * 1000;
  const stepMs = stepMinutes * 60 * 1000;
  const todayCutoff = isToday(date);

  const out: ScheduleSlotCandidate[] = [];

  for (const period of workingPeriods) {
    for (let t = period.start; t + slotMs <= period.end; t += stepMs) {
      const tEnd = t + slotMs;
      if (todayCutoff && t < nowTs) {
        continue;
      }
      const overlapsBusy = mergedBusy.some((b) =>
        rangesOverlap(t, tEnd, b.start, b.end),
      );
      out.push({
        startTime: t,
        endTime: tEnd,
        available: !overlapsBusy,
      });
    }
  }

  return out;
}

const SNAP_MS = 15 * 60 * 1000;

/** Snap instant to nearest 15-minute boundary (local time). */
export function snapMsTo15Min(ms: number): number {
  const d = new Date(ms);
  const totalMins = d.getHours() * 60 + d.getMinutes();
  const snapped = Math.round(totalMins / 15) * 15;
  const h = Math.floor(snapped / 60);
  const m = snapped % 60;
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    h,
    m,
    0,
    0,
  ).getTime();
}

export type DayTimelineModel = {
  timelineStartMs: number;
  timelineEndMs: number;
  workingSegments: Array<{ startMs: number; endMs: number }>;
  /** Lunch / gaps between morning and afternoon — not bookable. */
  lunchBlocks: Array<{ startMs: number; endMs: number }>;
};

/** Continuous day strip from first working segment start to last segment end. */
export function getDayTimelineModel(date: Date): DayTimelineModel | null {
  const segments = getWorkingPeriodsMs(date);
  if (segments.length === 0) {
    return null;
  }
  const first = segments[0]!;
  const last = segments[segments.length - 1]!;
  const lunchBlocks: Array<{ startMs: number; endMs: number }> = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const a = segments[i]!;
    const b = segments[i + 1]!;
    if (b.start > a.end) {
      lunchBlocks.push({ startMs: a.end, endMs: b.start });
    }
  }
  return {
    timelineStartMs: first.start,
    timelineEndMs: last.end,
    workingSegments: segments.map((s) => ({
      startMs: s.start,
      endMs: s.end,
    })),
    lunchBlocks,
  };
}

function slotOverlapsOccupied(
  startMs: number,
  endMs: number,
  peers: ReadonlyArray<{ _id: string; startTime: number; endTime: number }>,
  excludeId: string | undefined,
): boolean {
  return peers.some(
    (p) =>
      p._id !== excludeId &&
      rangesOverlap(startMs, endMs, p.startTime, p.endTime),
  );
}

/**
 * Nearest valid [start,end] to desiredStart with fixed duration, 15-min aligned, no overlap.
 */
export function constrainSlotMove(
  date: Date,
  desiredStartMs: number,
  durationMs: number,
  peers: ReadonlyArray<{ _id: string; startTime: number; endTime: number }>,
  excludeId: string | undefined,
): { startTime: number; endTime: number } | null {
  const anchor = snapMsTo15Min(desiredStartMs);
  const maxSteps = 96;
  const offsets: number[] = [0];
  for (let k = 1; k <= maxSteps; k++) {
    offsets.push(k * SNAP_MS, -k * SNAP_MS);
  }
  for (const off of offsets) {
    const start = anchor + off;
    const end = start + durationMs;
    if (!validateSlotTime(date, start, end).valid) continue;
    if (slotOverlapsOccupied(start, end, peers, excludeId)) continue;
    return { startTime: start, endTime: end };
  }
  return null;
}

const MIN_DURATION_MS = 15 * 60 * 1000;

/**
 * Nearest valid end >= start + minDuration, aligned to 15 min, fitting working hours and peers.
 */
export function constrainSlotResizeEnd(
  date: Date,
  startMs: number,
  desiredEndMs: number,
  peers: ReadonlyArray<{ _id: string; startTime: number; endTime: number }>,
  excludeId: string | undefined,
): { startTime: number; endTime: number } | null {
  const start = snapMsTo15Min(startMs);
  let end = snapMsTo15Min(desiredEndMs);
  if (end - start < MIN_DURATION_MS) {
    end = start + MIN_DURATION_MS;
  }
  const model = getDayTimelineModel(date);
  if (!model) {
    return null;
  }
  end = Math.min(end, model.timelineEndMs);
  for (let e = end; e >= start + MIN_DURATION_MS; e -= SNAP_MS) {
    if (!validateSlotTime(date, start, e).valid) continue;
    if (slotOverlapsOccupied(start, e, peers, excludeId)) continue;
    return { startTime: start, endTime: e };
  }
  return null;
}

/**
 * Bookable windows only; same grid as {@link enumerateScheduleSlotGrid}, filtered to `available`.
 */
export function listFreeSlotRanges(
  date: Date,
  busySlots: Array<{ startTime: number; endTime: number }>,
  options: ListFreeSlotRangesOptions = {},
): TimeRangeMs[] {
  return enumerateScheduleSlotGrid(date, busySlots, options)
    .filter((c) => c.available)
    .map(({ startTime, endTime }) => ({ startTime, endTime }));
}

export function getNextAvailableSlot(
  date: Date,
  existingSlots: Array<{ startTime: number; endTime: number }>,
  slotDurationMinutes = 30,
): { startHour: number; startMinute: number; endHour: number; endMinute: number } | null {
  const first = listFreeSlotRanges(date, existingSlots, {
    slotDurationMinutes,
    stepMinutes: 15,
  })[0];
  if (!first) {
    return null;
  }
  const startD = new Date(first.startTime);
  const endD = new Date(first.endTime);
  return {
    startHour: startD.getHours(),
    startMinute: startD.getMinutes(),
    endHour: endD.getHours(),
    endMinute: endD.getMinutes(),
  };
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

