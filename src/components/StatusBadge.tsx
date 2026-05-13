"use client";

const VISIT_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: "Ново",
    className: "bg-sky-500/15 text-sky-900 dark:text-sky-100 border border-sky-500/30",
  },
  in_progress: {
    label: "В работа",
    className:
      "bg-amber-500/15 text-amber-950 dark:text-amber-100 border border-amber-500/30",
  },
  ready: {
    label: "Готов",
    className:
      "bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 border border-emerald-500/30",
  },
  finalized: {
    label: "Приключено",
    className: "bg-secondary/30 text-foreground border",
  },
};

export function VisitStatusBadge({ status }: { status?: string }) {
  const key = status ?? "";
  const meta = VISIT_STATUS_META[key];
  const label = meta?.label ?? status ?? "—";
  const cls =
    meta?.className ?? "bg-muted text-foreground border";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
      aria-label={`Статус: ${label}`}
    >
      {label}
    </span>
  );
}

export function InvoiceStatusBadge({
  paid,
  paidAt,
}: {
  paid?: boolean;
  paidAt?: number | null;
}) {
  const label = paid
    ? paidAt
      ? "Платена • " + new Date(paidAt).toLocaleString("bg-BG")
      : "Платена"
    : "Неплатена";
  const cls = paid
    ? "bg-secondary/30 text-foreground border"
    : "bg-destructive/10 text-destructive border border-destructive/30";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
      aria-label={`Статус: ${label}`}
    >
      {label}
    </span>
  );
}
