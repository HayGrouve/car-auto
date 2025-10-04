"use client";

export function VisitStatusBadge({ status }: { status?: string }) {
  const label =
    status === "draft"
      ? "Чернова"
      : status === "finalized"
        ? "Приключено"
        : (status ?? "");
  const cls =
    status === "draft"
      ? "bg-accent/40 text-foreground border"
      : status === "finalized"
        ? "bg-secondary/30 text-foreground border"
        : "bg-muted text-foreground border";
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
