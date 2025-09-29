"use client";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { VisitDoc } from "@/types/visit";
import { brand } from "@/lib/brand";

let __visitFontRegistered = false;
function ensureVisitFont() {
  if (__visitFontRegistered) return;
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
    __visitFontRegistered = true;
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
  title: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: 700,
  },
  box: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    marginBottom: 8,
  },
});

export function VisitPdf({ visit, soap, procedures, medications }: { visit: VisitDoc; soap: { s?: string; o?: string; a?: string; p?: string }; procedures: string[]; medications: string[] }) {
  ensureVisitFont();
  const when = (visit as VisitDoc & { datetime?: number }).datetime ?? visit.createdAt;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{brand.nameBg} · Посещение {(visit as VisitDoc & { code?: string }).code ?? `#${String(visit._id)}`}</Text>
        <Text style={styles.muted}>Дата/час: {new Date(when).toLocaleString("bg-BG")}</Text>
        <Text style={styles.muted}>Статус: {visit.status}</Text>

        {soap.s ? (
          <View style={styles.box}>
            <Text style={styles.title}>S - Субективно</Text>
            <Text>{soap.s}</Text>
          </View>
        ) : null}
        {soap.o ? (
          <View style={styles.box}>
            <Text style={styles.title}>O - Обективно</Text>
            <Text>{soap.o}</Text>
          </View>
        ) : null}
        {soap.a ? (
          <View style={styles.box}>
            <Text style={styles.title}>A - Оценка</Text>
            <Text>{soap.a}</Text>
          </View>
        ) : null}
        {soap.p ? (
          <View style={styles.box}>
            <Text style={styles.title}>P - План</Text>
            <Text>{soap.p}</Text>
          </View>
        ) : null}

        <View style={styles.box}>
          <Text style={styles.title}>Процедури</Text>
          <Text>{(procedures ?? []).length ? procedures.join("; ") : "(няма)"}</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.title}>Медикаменти</Text>
          <Text>{(medications ?? []).length ? medications.join("; ") : "(няма)"}</Text>
        </View>
      </Page>
    </Document>
  );
}

export default VisitPdf;


