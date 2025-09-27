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

export function fmtNumberBG(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("bg-BG", options).format(value);
}


