export function fmtDateTimeBG(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function fmtDateBG(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium" }).format(date);
}

export function fmtNumberBG(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat("bg-BG", options).format(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "BGN",
  }).format(value);
}

export function formatDate(value: number | string | Date): string {
  const date =
    typeof value === "string" || typeof value === "number"
      ? new Date(value)
      : value;
  return new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium" }).format(date);
}

export function formatTimeRange(start: number, end: number): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startTime = new Intl.DateTimeFormat("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(startDate);
  const endTime = new Intl.DateTimeFormat("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(endDate);
  return `${startTime} - ${endTime}`;
}

export function formatScheduleDate(date: Date): string {
  return new Intl.DateTimeFormat("bg-BG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}