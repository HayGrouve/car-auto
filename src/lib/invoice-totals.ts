import type { InvoiceDoc } from "@/types/visit";

/** Sum of part and labor lines (price × quantity), same rule as `convex/invoices.create`. */
export function sumInvoiceLineItems(
  inv: Pick<InvoiceDoc, "parts" | "labor">,
): number {
  const partsSum = (inv.parts ?? []).reduce(
    (s, it) => s + Number(it.price) * Number(it.quantity),
    0,
  );
  const laborSum = (inv.labor ?? []).reduce(
    (s, it) => s + Number(it.price) * Number(it.quantity),
    0,
  );
  return partsSum + laborSum;
}

type InvoiceTotalInput = Pick<InvoiceDoc, "parts" | "labor" | "totalAmount"> & {
  /** Legacy Convex field; see `dashboard.ts` */
  total?: number | null;
};

/**
 * Amount to show as invoice total: prefer sum of printed lines so PDF/print stay
 * consistent when `totalAmount` is missing, zero, or stale.
 */
export function invoiceGrandTotal(inv: InvoiceTotalInput): number {
  const fromLines = sumInvoiceLineItems(inv);
  if (fromLines > 0) return fromLines;
  const stored = Number(inv.totalAmount);
  if (Number.isFinite(stored) && stored !== 0) return stored;
  const legacy = Number(inv.total);
  if (Number.isFinite(legacy)) return legacy;
  return Number.isFinite(stored) ? stored : 0;
}
