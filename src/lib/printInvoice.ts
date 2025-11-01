import type { InvoiceDoc } from "@/types/visit";
import { fmtNumberBG } from "@/lib/format";

export function printInvoice(inv: InvoiceDoc): void {
  if (!inv) return;

  const rows = (inv.items ?? [])
    .map(
      (it) => `
        <tr>
          <td>${it.description}</td>
          <td style="text-align:right;">${it.quantity}</td>
          <td style="text-align:right;">${fmtNumberBG(it.price, { style: "currency", currency: "BGN" })}</td>
          <td style="text-align:right;">${fmtNumberBG(it.total, { style: "currency", currency: "BGN" })}</td>
        </tr>
      `,
    )
    .join("");

  const html = `<!doctype html><html lang="bg"><head><meta charset="utf-8" /><title>Фактура ${
    inv.code ?? `#${String(inv._id)}`
  }</title>
      <style>body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;color:#111} h1{font-size:20px;margin:0 0 12px} table{border-collapse:collapse;width:100%;margin-top:12px} th,td{border:1px solid #ddd;padding:8px;vertical-align:top} tfoot td{font-weight:600} .muted{color:#666}</style></head><body>
      <h1>Фактура ${inv.code ?? `#${String(inv._id)}`}</h1>
      <div class="muted">Дата: ${new Date(inv.createdAt).toLocaleString("bg-BG")}</div>
      <div class="muted">Статус: ${inv.paid ? "Платена" : "Неплатена"}${
        inv.paid && inv.paidAt
          ? " · " + new Date(inv.paidAt).toLocaleString("bg-BG")
          : ""
      }</div>
      <table><thead><tr><th>Описание</th><th style="text-align:right;">Кол-во</th><th style="text-align:right;">Цена</th><th style="text-align:right;">Сума</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3" style="text-align:right;">Общо</td><td style="text-align:right;">${fmtNumberBG(
        inv.total,
        { style: "currency", currency: "BGN" },
      )}</td></tr></tfoot>
      </table>
    </body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    URL.revokeObjectURL(url);
    return;
  }
  const handleLoad = () => {
    try {
      w.focus();
    } catch {}
    w.print();
    w.removeEventListener("load", handleLoad);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  w.addEventListener("load", handleLoad);
}
