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
  const [regular, bold] = await Promise.all([fetchFont(FONT_REGULAR_PATH), fetchFont(FONT_BOLD_PATH)]);
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
  date: Date | number | string;
  animalName: string;
  ownerName: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
};

export async function generateVaccinationCertificatePdf(
  animal: AnimalDoc,
  owner: VaccinationOwnerInfo = {}
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
  const sex = animal.sex === "male" ? "Мъжки" : animal.sex === "female" ? "Женски" : "Неизвестен";

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
  doc.text(`Издадено от ${brand.nameBg}`, centerX, pageHeight - 15, { align: "center" });

  return doc.output("blob");
}

export async function generateInvoicePdf(invoice: InvoiceDoc, meta: InvoicePdfMeta = {}): Promise<Blob> {
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
  const invoiceNumber = meta.ownerName ? `${meta.ownerName}` : `${invoice.code ?? `#${invoice._id}`}`;
  doc.text(`Номер: ${invoiceNumber}`, 20, yPos);
  yPos += 10;
  const issuedAt = meta.issuedAt ?? invoice.createdAt;
  doc.text(`Дата: ${formatDate(issuedAt)}`, 20, yPos);
  yPos += 10;
  const statusKey = meta.status ?? (invoice.paid ? "paid" : "draft");
  const statusLabel = statusKey === "paid" ? "Платена" : statusKey === "pending" ? "Чакаща" : statusKey === "cancelled" ? "Отменена" : "Чернова";
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
  doc.text("Описание", 20, yPos);
  doc.text("Количество", 110, yPos);
  doc.text("Цена", 150, yPos);
  doc.text("Сума", 180, yPos, { align: "right" });

  doc.setFont("NotoSans", "normal");
  yPos += 10;
  invoice.items.forEach((item) => {
    const unitPrice = item.price;
    const total = item.total;
    doc.text(item.description, 20, yPos);
    doc.text(String(item.quantity), 110, yPos);
    doc.text(formatCurrency(unitPrice), 150, yPos);
    doc.text(formatCurrency(total), 180, yPos, { align: "right" });
    yPos += 10;
  });

  yPos += 10;
  doc.setFont("NotoSans", "bold");
  doc.text("Общо:", 150, yPos);
  doc.text(formatCurrency(invoice.total), 180, yPos, { align: "right" });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(10);
  doc.text(`Издадено от ${brand.nameBg}`, centerX, pageHeight - 15, { align: "center" });

  return doc.output("blob");
}

export async function generateVisitSummaryPdf(data: VisitSummaryData): Promise<Blob> {
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
  doc.text(`Дата: ${formatDate(data.date)}`, 20, yPos);
  yPos += 10;
  doc.text(`Пациент: ${data.animalName}`, 20, yPos);
  yPos += 10;
  doc.text(`Притежател: ${data.ownerName}`, 20, yPos);

  yPos += 20;
  doc.setFont("NotoSans", "bold");
  doc.text("SOAP бележки:", 20, yPos);
  yPos += 10;
  doc.setFont("NotoSans", "normal");

  const addSection = (title: string, value?: string) => {
    if (!value) return;
    doc.setFont("NotoSans", "bold");
    doc.text(title, 20, yPos);
    yPos += 7;
    doc.setFont("NotoSans", "normal");
    const lines: string[] = doc.splitTextToSize(value, pageWidth - 40) as string[];
    doc.text(lines, 25, yPos);
    yPos += lines.length * 7 + 5;
  };

  addSection("Субективни:", data.subjective);
  addSection("Обективни:", data.objective);
  addSection("Оценка:", data.assessment);
  addSection("План:", data.plan);

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(10);
  doc.text(`Издадено от ${brand.nameBg}`, centerX, pageHeight - 15, { align: "center" });

  return doc.output("blob");
}
