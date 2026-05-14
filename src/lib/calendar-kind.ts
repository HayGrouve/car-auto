/** Mirrors `calendarKindValidator` in convex/schedule.ts — keep literals in sync. */
export const CALENDAR_KINDS = ["workshop", "inspection"] as const;

export type CalendarKind = (typeof CALENDAR_KINDS)[number];

export function calendarKindLabelBg(kind: CalendarKind): string {
  return kind === "inspection" ? "ГТП" : "Автосервиз";
}

export function parseCalendarKindParam(
  raw: string | null,
): CalendarKind | undefined {
  if (raw === "workshop" || raw === "inspection") return raw;
  return undefined;
}
