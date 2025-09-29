"use client";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { InvoiceDoc } from "@/types/visit";
import { brand } from "@/lib/brand";

// Register a Unicode font that supports Bulgarian (Cyrillic)
let __fontRegistered = false;
function ensureFont() {
  if (__fontRegistered) return;
  try {
    Font.register({
      family: "NotoSans",
      fonts: [
        {
          src: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
          fontWeight: 400,
        },
        {
          src: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf",
          fontWeight: 700,
        },
      ],
    });
    __fontRegistered = true;
  } catch {}
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 11,
    color: "#111",
    fontFamily: "NotoSans",
  },
  header: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 700,
  },
  muted: {
    color: "#666",
    marginBottom: 6,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 6,
  },
  cellRight: {
    textAlign: "right",
  },
  footer: {
    marginTop: 16,
    fontSize: 10,
    color: "#666",
  },
});

export function InvoicePdf({ inv }: { inv: InvoiceDoc }) {
  ensureFont();
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{brand.nameBg} · Фактура {inv.code ?? `#${String(inv._id)}`}</Text>
        <Text style={styles.muted}>Дата: {new Date(inv.createdAt).toLocaleString("bg-BG")}</Text>
        <Text style={styles.muted}>Статус: {inv.paid ? "Платена" : "Неплатена"}{inv.paid && inv.paidAt ? ` · ${new Date(inv.paidAt).toLocaleString("bg-BG")}` : ""}</Text>

        <Text style={styles.sectionTitle}>Редове</Text>
        <View style={[styles.row]}> 
          <Text style={[styles.cell]}>Описание</Text>
          <Text style={[styles.cell, styles.cellRight]}>Кол-во</Text>
          <Text style={[styles.cell, styles.cellRight]}>Цена</Text>
          <Text style={[styles.cell, styles.cellRight]}>Сума</Text>
        </View>
        {inv.items.map((it, idx) => (
          <View key={idx} style={[styles.row]}> 
            <Text style={[styles.cell]}>{it.description}</Text>
            <Text style={[styles.cell, styles.cellRight]}>{it.quantity}</Text>
            <Text style={[styles.cell, styles.cellRight]}>{it.price.toFixed(2)} BGN</Text>
            <Text style={[styles.cell, styles.cellRight]}>{it.total.toFixed(2)} BGN</Text>
          </View>
        ))}

        <View style={[styles.row]}> 
          <Text style={[styles.cell]}></Text>
          <Text style={[styles.cell]}></Text>
          <Text style={[styles.cell, styles.cellRight]}>Общо</Text>
          <Text style={[styles.cell, styles.cellRight]}>{inv.total.toFixed(2)} BGN</Text>
        </View>

        <Text style={styles.footer}>© {new Date().getFullYear()} {brand.nameBg}</Text>
      </Page>
    </Document>
  );
}

export default InvoicePdf;


