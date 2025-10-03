"use client";

import { jsPDF } from "jspdf";
import type { AnimalDoc } from "@/types/animal";
import type { InvoiceDoc } from "@/types/visit";
import { brand } from "./brand";
import { formatCurrency, formatDate } from "./format";

const FONT_REGULAR_PATH = "/fonts/NotoSans-Regular.ttf";
const FONT_BOLD_PATH = "/fonts/NotoSans-Bold.ttf";

let cachedFonts: { regular: string; bold: string } | null = null;
let fontsPromise: Promise<{ regular: string; bold: string } | null> | null = null;

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
  if (typeof window === "undefined") throw new Error("Font loading supported only in browser");
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load font at ${path}`);
  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

async function loadFonts(): Promise<{ regular: string; bold: string }> {
  const [regular, bold] = await Promise.all([fetchFont(FONT_REGULAR_PATH), fetchFont(FONT_BOLD_PATH)]);
  return { regular, bold };
}

async function ensureFonts(doc: jsPDF) {
  if (!cachedFonts) {
    fontsPromise = fontsPromise ?? loadFonts();
    cachedFonts = await fontsPromise;
  }
  if (!cachedFonts) throw new Error("Unable to cache fonts");
  doc.addFileToVFS("NotoSans-Regular.ttf", cachedFonts.regular);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", cachedFonts.bold);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
}

/**
 * Generate a vaccination certificate PDF for an animal
 */
export async function generateVaccinationCertificatePdf(
  animal: AnimalDoc,
  owner: { name?: string | null; phone?: string | null; email?: string | null } = {}
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
  const microchip = (animal as any).microchip ?? (animal as any).microchipId ?? "Няма";
  const sexLabel = animal.sex === "male" ? "Мъжки" : animal.sex === "female" ? "Женски" : "Неизвестен";
  const birthDate = (animal as any).dob ?? (animal as any).dateOfBirth ?? null;

  doc.text(`Име на пациента: ${animal.name ?? ""}`, 20, yPos);
  yPos += 10;
  doc.text(`Вид: ${animal.species ?? ""}`, 20, yPos);
  yPos += 10;
  if (animal.breed) {
    doc.text(`Порода: ${animal.breed}`, 20, yPos);
    yPos += 10;
  }
  doc.text(`Микрочип: ${microchip || "Няма"}`, 20, yPos);
  yPos += 10;
  doc.text(`Пол: ${sexLabel}`, 20, yPos);
  yPos += 10;
  if (birthDate) {
    doc.text(`Дата на раждане: ${formatDate(birthDate)}`, 20, yPos);
    yPos += 10;
  }

  yPos += 10;
  doc.setFont("NotoSans", "bold");
  doc.text("Притежател:", 20, yPos);
  doc.setFont("NotoSans", "normal");
  yPos += 10;
  doc.text(owner.name || "", 20, yPos);
  yPos += 10;
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

/**
 * Generate an invoice PDF
 */
export async function generateInvoicePdf(invoice: InvoiceDoc): Promise<Blob> {
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
  doc.text(`Номер: ${invoice.invoiceNumber}`, 20, yPos);
  yPos += 10;
  doc.text(`Дата: ${formatDate(invoice.issueDate)}`, 20, yPos);
  yPos += 10;
  const status = invoice.status === "paid" ? "Платена" : invoice.status === "pending" ? "Чакаща" : "Отменена";
  doc.text(`Статус: ${status}`, 20, yPos);

  yPos += 20;
  doc.setFont("NotoSans", "bold");
  doc.text("Клиент:", 20, yPos);
  yPos += 10;
  doc.setFont("NotoSans", "normal");
  doc.text(invoice.ownerName ?? "", 20, yPos);

  yPos += 20;
  doc.setFont("NotoSans", "bold");
  doc.text("Описание", 20, yPos);
  doc.text("Количество", 110, yPos);
  doc.text("Цена", 150, yPos);
  doc.text("Сума", 180, yPos, { align: "right" });

  doc.setFont("NotoSans", "normal");
  yPos += 10;
  invoice.items.forEach((item) => {
    doc.text(item.description ?? "", 20, yPos);
    doc.text(String(item.quantity ?? 0), 110, yPos);
    doc.text(formatCurrency(item.unitPrice ?? 0), 150, yPos);
    doc.text(formatCurrency((item.quantity ?? 0) * (item.unitPrice ?? 0)), 180, yPos, { align: "right" });
    yPos += 10;
  });

  yPos += 10;
  doc.setFont("NotoSans", "bold");
  doc.text("Общо:", 150, yPos);
  doc.text(formatCurrency(invoice.totalAmount ?? 0), 180, yPos, { align: "right" });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(10);
  doc.text(`Издадено от ${brand.nameBg}`, centerX, pageHeight - 15, { align: "center" });

  return doc.output("blob");
}

/**
 * Generate a visit summary PDF
 */
export async function generateVisitSummaryPdf(visit: any): Promise<Blob> {
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
  doc.text(`Дата: ${formatDate(visit.date)}`, 20, yPos);
  yPos += 10;
  doc.text(`Пациент: ${visit.animalName ?? ""}`, 20, yPos);
  yPos += 10;
  doc.text(`Притежател: ${visit.ownerName ?? ""}`, 20, yPos);

  yPos += 20;
  doc.setFont("NotoSans", "bold");
  doc.text("SOAP бележки:", 20, yPos);
  yPos += 10;
  doc.setFont("NotoSans", "normal");

  const addSection = (title: string, content?: string) => {
    if (!content) return;
    doc.setFont("NotoSans", "bold");
    doc.text(title, 20, yPos);
    yPos += 7;
    doc.setFont("NotoSans", "normal");
    const lines = doc.splitTextToSize(content, pageWidth - 40);
    doc.text(lines, 25, yPos);
    yPos += lines.length * 7 + 5;
  };

  addSection("Субективни:", visit.subjective);
  addSection("Обективни:", visit.objective);
  addSection("Оценка:", visit.assessment);
  addSection("План:", visit.plan);

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(10);
  doc.text(`Издадено от ${brand.nameBg}`, centerX, pageHeight - 15, { align: "center" });

  return doc.output("blob");
}
