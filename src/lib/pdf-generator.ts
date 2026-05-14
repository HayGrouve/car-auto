"use client";

import { jsPDF } from "jspdf";
import imageCompression from "browser-image-compression";
import type { InvoiceDoc } from "@/types/visit";
import { brand } from "@/lib/brand";
import { formatCurrency, formatDate } from "@/lib/format";
import { invoiceGrandTotal } from "@/lib/invoice-totals";

const FONT_REGULAR_PATH = "/fonts/NotoSans-Regular.ttf";
const FONT_BOLD_PATH = "/fonts/NotoSans-Bold.ttf";

let cachedFonts: { regular: string; bold: string } | null = null;
let fontsPromise: Promise<{ regular: string; bold: string }> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function fetchFont(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load font at ${path}`);
  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

async function loadFonts(): Promise<{ regular: string; bold: string }> {
  const [regular, bold] = await Promise.all([
    fetchFont(FONT_REGULAR_PATH),
    fetchFont(FONT_BOLD_PATH),
  ]);
  return { regular, bold };
}

async function ensureFonts(doc: jsPDF): Promise<void> {
  if (!cachedFonts) {
    fontsPromise = fontsPromise ?? loadFonts();
    cachedFonts = await fontsPromise;
  }
  doc.addFileToVFS("NotoSans-Regular.ttf", cachedFonts.regular);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", cachedFonts.bold);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
}

type InvoicePdfMeta = {
  customerName?: string;
  issuedAt?: Date | number | string;
  /** Fine-grained non-payment state; unpaid default is «Неплатена». */
  status?: "pending" | "cancelled";
};

type VisitSummaryData = {
  // Header
  code?: string;
  status?: string;
  date: Date | number | string;
  // Parties
  vehicleName?: string;
  vehicleMake?: string;
  alerts?: string[];
  customerName?: string;
  customerPhone?: string;
  // Measurements
  mileage?: string | number | null;
  // Notes
  issue?: string;
  plan?: string;
  // Lists
  services?: string[];
  parts?: string[];
  // Billing
  invoiceCode?: string | null;
  outstandingAmount?: string | null;
  /** Image URLs (e.g. Convex storage); fetched and compressed in the browser. */
  imageAttachments?: Array<{ url: string; name: string }>;
};

async function fetchCompressedImageDataUrl(
  url: string,
): Promise<{ dataUrl: string; format: "JPEG" | "PNG" } | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) return null;
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const file = new File([blob], `attach.${ext}`, { type: blob.type });
  try {
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: 1200,
      maxSizeMB: 0.35,
      useWebWorker: true,
      initialQuality: 0.82,
      fileType: blob.type.includes("png") ? "image/png" : "image/jpeg",
    });
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.readAsDataURL(compressed);
    });
    if (!dataUrl) return null;
    const format: "JPEG" | "PNG" = dataUrl.includes("image/png")
      ? "PNG"
      : "JPEG";
    return { dataUrl, format };
  } catch {
    return null;
  }
}

export async function generateInvoicePdf(
  invoice: InvoiceDoc,
  meta: InvoicePdfMeta = {},
): Promise<Blob> {
  const doc = new jsPDF();
  await ensureFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(20);
  doc.text(brand.nameBg, centerX, 20, { align: "center" });

  doc.setFontSize(16);
  doc.text("Фактура", centerX, 30, { align: "center" });

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(12);

  let yPos = 50;
  const invoiceNumber = meta.customerName
    ? `${meta.customerName}`
    : `${invoice.code ?? `#${invoice._id}`}`;
  doc.text(`Номер: ${invoiceNumber}`, 20, yPos);
  yPos += 10;
  const issuedAt = meta.issuedAt ?? invoice.createdAt;
  doc.text(`Дата: ${formatDate(issuedAt)}`, 20, yPos);
  yPos += 10;

  /** Payment status for the customer — avoids «чернова», which implied an unfinished document. */
  let paymentStatusLabel: string;
  if (invoice.paid) {
    paymentStatusLabel = "Платена";
  } else if (meta.status === "cancelled") {
    paymentStatusLabel = "Отменена";
  } else if (meta.status === "pending") {
    paymentStatusLabel = "Чакаща плащане";
  } else {
    paymentStatusLabel = "Неплатена";
  }
  doc.text(`Статус на плащане: ${paymentStatusLabel}`, 20, yPos);

  yPos += 20;
  doc.setFont("NotoSans", "bold");
  doc.text("Клиент:", 20, yPos);
  doc.setFont("NotoSans", "normal");
  yPos += 10;
  if (meta.customerName) {
    doc.text(meta.customerName, 20, yPos);
    yPos += 10;
  }

  yPos += 10;
  doc.setFont("NotoSans", "bold");
  const descriptionX = 20;
  const quantityX = 120;
  const priceX = 150;
  const amountX = pageWidth - 20;

  doc.text("Описание", descriptionX, yPos);
  doc.text("Количество", quantityX, yPos, { align: "center" });
  doc.text("Цена", priceX, yPos, { align: "right" });
  doc.text("Сума", amountX, yPos, { align: "right" });

  doc.setFont("NotoSans", "normal");
  yPos += 10;
  
  if (invoice.parts && invoice.parts.length > 0) {
    doc.setFont("NotoSans", "bold");
    doc.text("Части", descriptionX, yPos);
    doc.setFont("NotoSans", "normal");
    yPos += 10;
    invoice.parts.forEach((item) => {
      const unitPrice = item.price;
      const total = item.price * item.quantity;
      doc.text(item.name, descriptionX, yPos);
      doc.text(String(item.quantity), quantityX, yPos, { align: "center" });
      doc.text(formatCurrency(unitPrice), priceX, yPos, { align: "right" });
      doc.text(formatCurrency(total), amountX, yPos, { align: "right" });
      yPos += 10;
    });
  }
  
  if (invoice.labor && invoice.labor.length > 0) {
    doc.setFont("NotoSans", "bold");
    doc.text("Труд/Услуги", descriptionX, yPos);
    doc.setFont("NotoSans", "normal");
    yPos += 10;
    invoice.labor.forEach((item) => {
      const unitPrice = item.price;
      const total = item.price * item.quantity;
      doc.text(item.name, descriptionX, yPos);
      doc.text(String(item.quantity), quantityX, yPos, { align: "center" });
      doc.text(formatCurrency(unitPrice), priceX, yPos, { align: "right" });
      doc.text(formatCurrency(total), amountX, yPos, { align: "right" });
      yPos += 10;
    });
  }

  yPos += 10;
  doc.setFont("NotoSans", "bold");
  doc.text("Общо:", priceX, yPos, { align: "right" });
  doc.text(
    formatCurrency(invoiceGrandTotal(invoice)),
    amountX,
    yPos,
    { align: "right" },
  );

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(10);
  doc.text(`Издадено от ${brand.nameBg}`, centerX, pageHeight - 15, {
    align: "center",
  });

  return doc.output("blob");
}

export async function generateVisitSummaryPdf(
  data: VisitSummaryData,
): Promise<Blob> {
  const doc = new jsPDF();
  await ensureFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(20);
  doc.text(brand.nameBg, centerX, 20, { align: "center" });

  doc.setFontSize(16);
  doc.text("Резюме на посещение", centerX, 30, { align: "center" });

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(12);

  let yPos = 50;

  const ensureSpace = (needed: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (yPos + needed > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
  };

  const addRow = (label: string, value?: string) => {
    if (!value) return;
    ensureSpace(8);
    doc.setFont("NotoSans", "bold");
    const labelText = `${label}:`;
    doc.text(labelText, 20, yPos);
    // Compute dynamic start position for value to avoid overlapping long labels
    const valueX = Math.max(60, 20 + doc.getTextWidth(labelText) + 4);
    doc.setFont("NotoSans", "normal");
    const maxWidth = Math.max(40, pageWidth - valueX - 20);
    const lines = doc.splitTextToSize(value, maxWidth) as string[];
    doc.text(lines, valueX, yPos);
    yPos += Math.max(8, lines.length * 6 + 2);
  };

  const addHeading = (text: string) => {
    ensureSpace(12);
    doc.setFont("NotoSans", "bold");
    doc.text(text, 20, yPos);
    yPos += 8;
    doc.setDrawColor(200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 6;
  };

  // Header
  addHeading("Данни за посещение");
  addRow("Код", data.code);
  addRow("Статус", data.status);
  addRow("Дата/час", formatDate(data.date));

  // Parties
  addHeading("Автомобил и клиент");
  addRow(
    "Автомобил",
    [data.vehicleName, data.vehicleMake].filter(Boolean).join(" · "),
  );
  if (data.alerts?.length) addRow("Предупреждения", data.alerts.join(", "));
  addRow("Клиент", data.customerName);
  addRow("Телефон", data.customerPhone);

  // Measurements
  addHeading("Пробег");
  const w =
    data.mileage != null && data.mileage !== "" ? String(data.mileage) : "—";
  addRow("Пробег", w ? `${w} км` : undefined);

  // SOAP
  addHeading("Бележки");
  const addSection = (title: string, value?: string) => {
    if (!value) return;
    ensureSpace(14);
    doc.setFont("NotoSans", "bold");
    doc.text(title, 20, yPos);
    yPos += 7;
    doc.setFont("NotoSans", "normal");
    const lines: string[] = doc.splitTextToSize(
      value,
      pageWidth - 40,
    ) as string[];
    doc.text(lines, 25, yPos);
    yPos += lines.length * 7 + 4;
  };
  addSection("Оплакване", data.issue);
  addSection("План за ремонт", data.plan);

  // Lists
  const addList = (title: string, items?: string[]) => {
    if (!items || items.length === 0) return;
    addHeading(title);
    items.forEach((txt) => {
      ensureSpace(8);
      doc.setFont("NotoSans", "normal");
      const lines = doc.splitTextToSize(txt, pageWidth - 40) as string[];
      doc.text(`• ${lines[0]}`, 25, yPos);
      for (let i = 1; i < lines.length; i++) {
        yPos += 6;
        doc.text(`  ${lines[i]}`, 25, yPos);
      }
      yPos += 6;
    });
  };
  addList("Услуги", data.services);
  addList("Части", data.parts);

  // Billing
  addHeading("Фактуриране");
  addRow("Номер на фактура", data.invoiceCode ?? undefined);
  addRow("Дължима сума", data.outstandingAmount ?? undefined);

  if (data.imageAttachments && data.imageAttachments.length > 0) {
    addHeading("Снимки от посещението");
    for (const att of data.imageAttachments) {
      const compressed = await fetchCompressedImageDataUrl(att.url);
      if (!compressed) continue;
      try {
        const props = doc.getImageProperties(compressed.dataUrl);
        const maxW = pageWidth - 40;
        const w = Math.min(maxW, props.width);
        const h = (props.height * w) / props.width;
        ensureSpace(h + 24);
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(9);
        doc.text(att.name || "Снимка", 20, yPos);
        yPos += 6;
        doc.addImage(compressed.dataUrl, compressed.format, 20, yPos, w, h);
        yPos += h + 10;
      } catch {
        // skip invalid image data
      }
    }
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(10);
  doc.text(`Издадено от ${brand.nameBg}`, centerX, pageHeight - 15, {
    align: "center",
  });

  return doc.output("blob");
}