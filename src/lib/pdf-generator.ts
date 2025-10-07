"use client";

import { jsPDF } from "jspdf";
import type { AnimalDoc } from "@/types/animal";
import type { InvoiceDoc } from "@/types/visit";
import { brand } from "@/lib/brand";
import { formatCurrency, formatDate } from "@/lib/format";

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

type VaccinationOwnerInfo = {
  name?: string;
  phone?: string;
  email?: string;
};

type InvoicePdfMeta = {
  ownerName?: string;
  issuedAt?: Date | number | string;
  status?: "paid" | "pending" | "cancelled" | "draft";
};

type VisitSummaryData = {
  // Header
  code?: string;
  status?: string;
  date: Date | number | string;
  // Parties
  animalName?: string;
  animalSpecies?: string;
  alerts?: string[];
  ownerName?: string;
  ownerPhone?: string;
  // Measurements
  weight?: string | number | null;
  temperature?: string | number | null;
  pulse?: string | number | null;
  // SOAP
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  // Lists
  procedures?: string[];
  medications?: string[];
  // Billing
  invoiceCode?: string | null;
  outstandingAmount?: string | null;
};

export async function generateVaccinationCertificatePdf(
  animal: AnimalDoc,
  owner: VaccinationOwnerInfo = {},
): Promise<Blob> {
  const doc = new jsPDF();
  await ensureFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(20);
  doc.text(brand.nameBg, centerX, 20, { align: "center" });

  doc.setFontSize(16);
  doc.text("Удостоверение за ваксинация", centerX, 30, { align: "center" });

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(12);

  let yPos = 50;
  const microchip = animal.microchip ?? "Няма";
  const sex =
    animal.sex === "male"
      ? "Мъжки"
      : animal.sex === "female"
        ? "Женски"
        : "Неизвестен";

  doc.text(`Име на пациента: ${animal.name}`, 20, yPos);
  yPos += 10;
  doc.text(`Вид: ${animal.species}`, 20, yPos);
  yPos += 10;
  if (animal.breed) {
    doc.text(`Порода: ${animal.breed}`, 20, yPos);
    yPos += 10;
  }
  doc.text(`Микрочип: ${microchip}`, 20, yPos);
  yPos += 10;
  doc.text(`Пол: ${sex}`, 20, yPos);
  yPos += 10;
  if (animal.dob !== undefined && animal.dob !== null) {
    doc.text(`Дата на раждане: ${formatDate(animal.dob)}`, 20, yPos);
    yPos += 10;
  }

  yPos += 10;
  doc.setFont("NotoSans", "bold");
  doc.text("Притежател:", 20, yPos);
  doc.setFont("NotoSans", "normal");
  yPos += 10;
  if (owner.name) {
    doc.text(owner.name, 20, yPos);
    yPos += 10;
  }
  if (owner.phone) {
    doc.text(`Телефон: ${owner.phone}`, 20, yPos);
    yPos += 10;
  }
  if (owner.email) {
    doc.text(`Имейл: ${owner.email}`, 20, yPos);
    yPos += 10;
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(10);
  doc.text(`Издадено от ${brand.nameBg}`, centerX, pageHeight - 15, {
    align: "center",
  });

  return doc.output("blob");
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
  const invoiceNumber = meta.ownerName
    ? `${meta.ownerName}`
    : `${invoice.code ?? `#${invoice._id}`}`;
  doc.text(`Номер: ${invoiceNumber}`, 20, yPos);
  yPos += 10;
  const issuedAt = meta.issuedAt ?? invoice.createdAt;
  doc.text(`Дата: ${formatDate(issuedAt)}`, 20, yPos);
  yPos += 10;
  const statusKey = meta.status ?? (invoice.paid ? "paid" : "draft");
  const statusLabel =
    statusKey === "paid"
      ? "Платена"
      : statusKey === "pending"
        ? "Чакаща"
        : statusKey === "cancelled"
          ? "Отменена"
          : "Чернова";
  doc.text(`Статус: ${statusLabel}`, 20, yPos);

  yPos += 20;
  doc.setFont("NotoSans", "bold");
  doc.text("Клиент:", 20, yPos);
  doc.setFont("NotoSans", "normal");
  yPos += 10;
  if (meta.ownerName) {
    doc.text(meta.ownerName, 20, yPos);
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
  invoice.items.forEach((item) => {
    const unitPrice = item.price;
    const total = item.total;
    doc.text(item.description, descriptionX, yPos);
    doc.text(String(item.quantity), quantityX, yPos, { align: "center" });
    doc.text(formatCurrency(unitPrice), priceX, yPos, { align: "right" });
    doc.text(formatCurrency(total), amountX, yPos, { align: "right" });
    yPos += 10;
  });

  yPos += 10;
  doc.setFont("NotoSans", "bold");
  doc.text("Общо:", priceX, yPos, { align: "right" });
  doc.text(formatCurrency(invoice.total), amountX, yPos, { align: "right" });

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
  addHeading("Пациент и собственик");
  addRow(
    "Пациент",
    [data.animalName, data.animalSpecies].filter(Boolean).join(" · "),
  );
  if (data.alerts?.length) addRow("Предупреждения", data.alerts.join(", "));
  addRow("Собственик", data.ownerName);
  addRow("Телефон", data.ownerPhone);

  // Measurements
  addHeading("Измервания");
  const w =
    data.weight != null && data.weight !== "" ? String(data.weight) : "—";
  const t =
    data.temperature != null && data.temperature !== ""
      ? String(data.temperature)
      : "—";
  const pu = data.pulse != null && data.pulse !== "" ? String(data.pulse) : "—";
  addRow("Тегло", w ? `${w} кг` : undefined);
  addRow("Температура", t ? `${t} °C` : undefined);
  addRow("Пулс", pu);

  // SOAP
  addHeading("SOAP бележки");
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
  addSection("Субективно", data.subjective);
  addSection("Обективно", data.objective);
  addSection("Оценка", data.assessment);
  addSection("План", data.plan);

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
  addList("Процедури", data.procedures);
  addList("Медикаменти", data.medications);

  // Billing
  addHeading("Фактуриране");
  addRow("Номер на фактура", data.invoiceCode ?? undefined);
  addRow("Дължима сума", data.outstandingAmount ?? undefined);

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(10);
  doc.text(`Издадено от ${brand.nameBg}`, centerX, pageHeight - 15, {
    align: "center",
  });

  return doc.output("blob");
}
