"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { type VisitDoc } from "@/types/visit";
// removed inline edit inputs in favor of wizard-only editing
import { Button } from "@/components/ui/button";
// removed popover/command inputs tied to inline form
import { toast } from "sonner";
import { fmtDateTimeBG } from "@/lib/format";
import PdfDownloadButton from "@/components/pdf/PdfDownloadButton";
import { generateVisitSummaryPdf } from "@/lib/pdf-generator";
import VisitWizard from "./VisitWizard";
// pathname/searchParams no longer used in wizard default flow
// import { usePathname, useSearchParams } from "next/navigation";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";
import { VisitHero } from "@/components/visits/VisitHero";
import {
  VisitActionsMenuDesktop,
  VisitActionsMenuMobile,
  buildDuplicateAction,
} from "@/components/visits/VisitActionsMenu";
// icons only used in other sections
// import { CalendarCheck, FilePlus, Printer } from "lucide-react";
// import { VisitSecondaryPanels } from "@/components/visits/VisitSecondaryPanels";
import { SectionCard } from "@/components/ui/section-card";

export default function VisitDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"visits">;
  const visitUnknown = useQuery(
    api.visits.getById,
    useMemo(() => ({ id }), [id]),
  ) as VisitDoc | null | undefined;
  const update = useMutation(api.visits.update);
  const finalize = useMutation(api.visits.finalize);
  const createVisit = useMutation(api.visits.create) as unknown as (args: {
    ownerId: string;
    animalId?: string | null;
    datetime?: number;
    soap: { s?: string; o?: string; a?: string; p?: string };
    procedures?: string[];
    medications?: string[];
  }) => Promise<{ ok: boolean; id: string }>;
  const router = useRouter();

  const [s, setS] = useState("");
  const [o, setO] = useState("");
  const [a, setA] = useState("");
  const [p, setP] = useState("");
  const [dt, setDt] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [procedures, setProcedures] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  // removed inline editing helpers (wizard-only editing)
  const [animalId, setAnimalId] = useState<string | null>(null);
  const owners = useQuery(
    api.owners.list,
    useMemo(() => ({ search: "" }), []),
  ) as { _id: string; name: string; phone?: string }[] | undefined;
  const animals = useQuery(
    api.animals.list,
    useMemo(() => ({ search: "" }), []),
  ) as
    | { _id: string; name: string; species: string; ownerId?: string | null }[]
    | undefined;
  const [ownerId, setOwnerId] = useState<string>("");

  const visit: VisitDoc | null = visitUnknown ?? null;
  // const pathname = usePathname();
  // const sp = useSearchParams();

  // Wizard visibility
  const [showWizard, setShowWizard] = useState(true);
  useBreadcrumbRegistration(
    [
      { label: "Начало", href: "/" } satisfies BreadcrumbItem,
      { label: "Посещения", href: "/visits" } satisfies BreadcrumbItem,
      visit?.code
        ? ({
            id: String(id),
            label: visit.code,
            href: `/visits/${id}`,
            current: true,
          } satisfies BreadcrumbItem)
        : ({ label: "Посещение", current: true } satisfies BreadcrumbItem),
    ].filter(Boolean) as BreadcrumbItem[],
  );
  const isFinalized = !!visit && visit.status !== "draft";

  useEffect(() => {
    if (!hydrated && visit) {
      setS(visit.soap?.s ?? "");
      setO(visit.soap?.o ?? "");
      setA(visit.soap?.a ?? "");
      setP(visit.soap?.p ?? "");
      const baseTs =
        (visit as VisitDoc & { datetime?: number }).datetime ?? visit.createdAt;
      setDt(baseTs ? new Date(baseTs).toISOString().slice(0, 16) : "");
      setAnimalId(visit.animalId ?? null);
      setOwnerId(visit.ownerId ?? "");
      setProcedures(visit.procedures ?? []);
      setMedications(visit.medications ?? []);
      setHydrated(true);
    }
  }, [visit, hydrated]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const res = (await update({
      id,
      datetime: dt ? Date.parse(dt) : undefined,
      soap: { s, o, a, p },
      procedures,
      medications,
      animalId: animalId ? (animalId as Id<"animals">) : null,
      ownerId: ownerId ? (ownerId as Id<"owners">) : null,
    })) as { ok: boolean };
    if (res?.ok) toast.success("Записът е обновен");
  }

  async function onFinalize() {
    const res = await finalize({ id });
    if (res?.ok) {
      toast.success("Приключено");
      void router.push("/visits");
    }
  }

  async function onDuplicate() {
    if (!visit) return;
    const res = await createVisit({
      ownerId: visit.ownerId,
      animalId: visit.animalId ?? undefined,
      datetime: Date.now(),
      soap: { s, o, a, p },
      procedures,
      medications,
    });
    if (res?.ok && res.id) {
      toast.success("Дублирано посещение");
      void router.push(`/visits/${res.id}`);
    }
  }

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function onPrint() {
    if (!visit) return;
    const when =
      (visit as VisitDoc & { datetime?: number }).datetime ?? visit.createdAt;
    const code =
      (visit as VisitDoc & { code?: string }).code ?? `#${String(visit._id)}`;
    const statusLabel =
      visit.status === "draft"
        ? "Чернова"
        : visit.status === "finalized"
          ? "Приключено"
          : visit.status;

    const patientName = (animalInfo?.name ?? visit.animalName ?? "").trim();
    const patientSpecies = (
      animalInfo?.species ??
      visit.animalSpecies ??
      ""
    ).trim();
    const alerts = (visit.alerts ?? []).join(", ");
    const ownerNameVal = ownerInfo?.name ?? "";
    const ownerPhoneVal = ownerInfo?.phone ?? "";
    const weightVal = visit.weight != null ? `${visit.weight} кг` : "—";
    const tempVal = visit.temperature != null ? `${visit.temperature} °C` : "—";
    const pulseVal = visit.pulse != null ? String(visit.pulse) : "—";
    const invoiceCode = visit.invoiceCode ?? "";
    const outstanding = visit.outstandingAmount ?? "";

    const esc = (t: unknown) => {
      let s = "";
      if (t == null) s = "";
      else if (typeof t === "string") s = t;
      else if (typeof t === "number" || typeof t === "boolean") s = String(t);
      return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    };
    const isNonEmpty = (v?: string) => Boolean(v?.trim());
    const row = (label: string, value?: string) =>
      isNonEmpty(value)
        ? `<tr><td class=\"label\">${esc(label)}</td><td>${esc(value!)}</td></tr>`
        : "";
    const rowHtml = (label: string, html?: string) =>
      isNonEmpty(html)
        ? `<tr><td class=\"label\">${esc(label)}</td><td>${html!}</td></tr>`
        : "";
    const soapRows = [
      row("S - Субективно", s),
      row("O - Обективно", o),
      row("A - Оценка", a),
      row("P - План", p),
    ].join("");
    const procedureList = (procedures?.length ? procedures : [])
      .map((pr) => `<li>${esc(pr)}</li>`)
      .join("");
    const medicationList = (medications?.length ? medications : [])
      .map((md) => `<li>${esc(md)}</li>`)
      .join("");

    const html = `<!doctype html>
      <html lang=\"bg\">
        <head>
          <meta charset=\"utf-8\" />
          <title>Посещение ${esc(code)}</title>
          <style>
            body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;color:#111}
            h1{font-size:20px;margin:0 0 12px}
            table{border-collapse:collapse;width:100%;margin-top:16px}
            th,td{border:1px solid #ddd;padding:8px;vertical-align:top}
            .label{color:#374151;width:220px;font-weight:600}
            .section th{background:#f6f6f6;text-align:left}
            @media print{a{color:inherit;text-decoration:none}}
          </style>
        </head>
        <body>
          <h1>Посещение ${esc(code)}</h1>
          <table class=\"section\"><tbody>
            <tr><th colspan=2>Данни за посещение</th></tr>
            ${row("Код", code)}
            ${row("Статус", statusLabel)}
            ${row("Дата/час", new Date(when).toLocaleString("bg-BG"))}
          </tbody></table>

          <table class=\"section\"><tbody>
            <tr><th colspan=2>Пациент и собственик</th></tr>
            ${row("Пациент", [patientName, patientSpecies].filter(Boolean).join(" · "))}
            ${row("Предупреждения", alerts)}
            ${row("Собственик", ownerNameVal)}
            ${row("Телефон", ownerPhoneVal)}
          </tbody></table>

          <table class=\"section\"><tbody>
            <tr><th colspan=2>Измервания</th></tr>
            ${row("Тегло", weightVal)}
            ${row("Температура", tempVal)}
            ${row("Пулс", pulseVal)}
          </tbody></table>

          <table class=\"section\"><tbody>
            <tr><th colspan=2>SOAP бележки</th></tr>
            ${soapRows || row("—", "Няма бележки")}
          </tbody></table>

          <table class=\"section\"><tbody>
            <tr><th colspan=2>Процедури</th></tr>
            ${rowHtml("Списък", procedureList || '<span class=\"muted\">(няма)</span>')}
          </tbody></table>

          <table class=\"section\"><tbody>
            <tr><th colspan=2>Медикаменти</th></tr>
            ${rowHtml("Списък", medicationList || '<span class=\"muted\">(няма)</span>')}
          </tbody></table>

          <table class=\"section\"><tbody>
            <tr><th colspan=2>Фактуриране</th></tr>
            ${row("Номер на фактура", invoiceCode)}
            ${row("Дължима сума", outstanding)}
          </tbody></table>

          <script>window.onload = () => { try { window.focus(); } catch(e){} window.print(); }</script>
        </body>
      </html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    try {
      w.focus();
    } catch {}
  }

  if (visitUnknown === undefined)
    return <main className="mx-auto max-w-3xl p-6">Зареждане...</main>;
  if (!visit)
    return (
      <main className="mx-auto max-w-3xl p-6">Не е намерено посещение</main>
    );

  const ownerInfo = ownerId
    ? (owners ?? []).find((o) => o._id === ownerId)
    : null;
  const animalInfo = animalId
    ? (animals ?? []).find((a) => a._id === animalId)
    : null;
  const documents = visit.documents ?? [];
  const visitHistory = visit.history ?? [];
  const showSecondary = documents.length > 0 || visitHistory.length > 0;
  const visitTimestamp =
    (visit as VisitDoc & { datetime?: number }).datetime ?? visit.createdAt;
  const quickFacts = [
    {
      label: "Статус",
      value:
        visit.status === "draft"
          ? "Чернова"
          : visit.status === "finalized"
            ? "Приключено"
            : visit.status,
    },
    {
      label: "Дата",
      value: fmtDateTimeBG(visitTimestamp),
    },

    {
      label: "Телефон",
      value: ownerInfo?.phone ?? "",
    },
    {
      label: "Пациент",
      value: animalInfo?.name ?? visit.animalName ?? "",
    },
  ].filter((fact) => fact.value && fact.value.trim().length > 0);

  const generateVisitPdf = async () => {
    const animal = (animals ?? []).find((a) => a._id === visit.animalId);
    const owner = (owners ?? []).find((o) => o._id === visit.ownerId);
    return generateVisitSummaryPdf({
      code: (visit as VisitDoc & { code?: string }).code,
      status:
        visit.status === "draft"
          ? "Чернова"
          : visit.status === "finalized"
            ? "Приключено"
            : visit.status,
      date: visitTimestamp,

      animalName: animal?.name ?? visit.animalName ?? undefined,
      animalSpecies: animal?.species ?? visit.animalSpecies ?? undefined,
      alerts: visit.alerts ?? [],
      ownerName: owner?.name,
      ownerPhone: owner?.phone,
      weight: visit.weight ?? null,
      temperature: visit.temperature ?? null,
      pulse: visit.pulse ?? null,
      subjective: s,
      objective: o,
      assessment: a,
      plan: p,
      procedures: visit.procedures ?? [],
      medications: visit.medications ?? [],
      invoiceCode: visit.invoiceCode ?? null,
      outstandingAmount: visit.outstandingAmount ?? null,
    });
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 pb-28 lg:pb-10">
      <section className="grid gap-6">
        <VisitHero
          visit={visit}
          actionsMenuDesktop={
            <VisitActionsMenuDesktop
              onFinalize={!isFinalized ? onFinalize : undefined}
              onPrint={() => onPrint()}
              onInvoice={() => {
                const url = `/invoices/new?visitId=${encodeURIComponent(
                  visit._id,
                )}&ownerId=${encodeURIComponent(visit.ownerId)}${
                  visit.animalId
                    ? `&animalId=${encodeURIComponent(String(visit.animalId))}`
                    : ""
                }`;
                void router.push(url);
              }}
              extraActions={[
                buildDuplicateAction(() => {
                  void onDuplicate();
                }),
              ]}
            />
          }
          actionsMenuMobile={
            <VisitActionsMenuMobile
              onFinalize={!isFinalized ? onFinalize : undefined}
              onPrint={() => onPrint()}
              onInvoice={() => {
                const url = `/invoices/new?visitId=${encodeURIComponent(
                  visit._id,
                )}&ownerId=${encodeURIComponent(visit.ownerId)}${
                  visit.animalId
                    ? `&animalId=${encodeURIComponent(String(visit.animalId))}`
                    : ""
                }`;
                void router.push(url);
              }}
              extraActions={[
                buildDuplicateAction(() => {
                  void onDuplicate();
                }),
              ]}
            />
          }
          owner={{
            name: ownerInfo?.name,
            phone: ownerInfo?.phone,
          }}
          animal={{
            name: animalInfo?.name ?? visit.animalName ?? undefined,
            species: animalInfo?.species ?? visit.animalSpecies ?? undefined,
            alerts: visit.alerts ?? [],
          }}
          billing={{
            invoiceCode: visit.invoiceCode ?? null,
            outstanding: visit.outstandingAmount ?? null,
          }}
        />
      </section>
      {quickFacts.length ? (
        <section className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 lg:hidden">
          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs font-medium">
            {quickFacts.slice(0, 3).map((fact) => (
              <span key={fact.label} className="inline-flex items-center gap-1">
                <span className="text-foreground font-semibold">
                  {fact.value}
                </span>
                <span className="tracking-wide uppercase">{fact.label}</span>
              </span>
            ))}
          </div>
          {ownerInfo?.phone ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                window.location.href = `tel:${ownerInfo.phone}`;
              }}
            >
              Обади се
            </Button>
          ) : null}
        </section>
      ) : null}
      {quickFacts.length ? (
        <section className="lg:hidden">
          <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2 text-xs">
            {quickFacts.map((fact) => (
              <div
                key={fact.label}
                className="bg-muted flex w-max items-center gap-2 rounded-full border px-3 py-2 shadow-sm"
              >
                <span className="text-foreground font-semibold">
                  {fact.value}
                </span>
                <span className="text-muted-foreground uppercase">
                  {fact.label}
                </span>
              </div>
            ))}
            {ownerInfo?.phone ? (
              <Button
                variant="outline"
                size="sm"
                className="w-max rounded-full border px-3 py-2"
                onClick={() => {
                  window.location.href = `tel:${ownerInfo.phone}`;
                }}
              >
                Обади се
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}
      <section className="space-y-6 pb-20 lg:pb-0">
        {!isFinalized ? (
          <SectionCard
            title="Ръководен режим"
            description="Структурирани стъпки за обработка на посещението."
            headerActions={[
              {
                label: showWizard ? "Скрий ръководство" : "Покажи ръководство",
                onClick: () => setShowWizard((v) => !v),
                variant: "outline",
              },
            ]}
          >
            {showWizard ? (
              <VisitWizard id={id} onClose={() => setShowWizard(false)} />
            ) : null}
          </SectionCard>
        ) : (
          <SectionCard
            title="Резюме"
            description="Обобщение на приключеното посещение"
            headerActions={[
              {
                label: "Печат",
                onClick: () => onPrint(),
                variant: "outline",
              },
              {
                label: "PDF",
                onClick: () => {
                  void (async () => {
                    const blob = await generateVisitPdf();
                    downloadBlob(blob, `visit-${id}.pdf`);
                  })();
                },
                variant: "outline",
              },
              {
                label: visit.invoiceCode ? "Фактура" : "Нова фактура",
                href: visit.invoiceCode
                  ? `/invoices/${encodeURIComponent(visit.invoiceCode)}`
                  : `/invoices/new?visitId=${encodeURIComponent(
                      visit._id,
                    )}&ownerId=${encodeURIComponent(visit.ownerId)}${
                      visit.animalId
                        ? `&animalId=${encodeURIComponent(String(visit.animalId))}`
                        : ""
                    }`,
                variant: "ghost",
              },
            ]}
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  SOAP
                </p>
                <div className="space-y-2 text-sm">
                  {(s ?? "").trim() ? (
                    <div>
                      <span className="text-muted-foreground mr-2 font-medium">
                        S:
                      </span>
                      <span>{s}</span>
                    </div>
                  ) : null}
                  {(o ?? "").trim() ? (
                    <div>
                      <span className="text-muted-foreground mr-2 font-medium">
                        O:
                      </span>
                      <span>{o}</span>
                    </div>
                  ) : null}
                  {(a ?? "").trim() ? (
                    <div>
                      <span className="text-muted-foreground mr-2 font-medium">
                        A:
                      </span>
                      <span>{a}</span>
                    </div>
                  ) : null}
                  {(p ?? "").trim() ? (
                    <div>
                      <span className="text-muted-foreground mr-2 font-medium">
                        P:
                      </span>
                      <span>{p}</span>
                    </div>
                  ) : null}
                  {!(
                    (s ?? "").trim() ||
                    (o ?? "").trim() ||
                    (a ?? "").trim() ||
                    (p ?? "").trim()
                  ) ? (
                    <div className="text-muted-foreground">(няма данни)</div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Процедури
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {(visit.procedures ?? []).length ? (
                    (visit.procedures ?? []).map((pr, idx) => (
                      <li key={idx}>{pr}</li>
                    ))
                  ) : (
                    <li className="text-muted-foreground list-none">(няма)</li>
                  )}
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Медикаменти
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {(visit.medications ?? []).length ? (
                    (visit.medications ?? []).map((md, idx) => (
                      <li key={idx}>{md}</li>
                    ))
                  ) : (
                    <li className="text-muted-foreground list-none">(няма)</li>
                  )}
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Фактуриране
                </p>
                <div className="text-sm">
                  {visit.invoiceCode ? (
                    <div>Фактура {visit.invoiceCode}</div>
                  ) : (
                    <div className="text-muted-foreground">
                      Няма издадена фактура
                    </div>
                  )}
                  {visit.outstandingAmount ? (
                    <div>Дължима сума: {visit.outstandingAmount}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Removed editable "Основни данни" block – edits now happen in the Visit Wizard exclusively */}
      </section>
      <div className="lg:hidden" aria-hidden>
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/70 fixed inset-x-0 bottom-0 z-20 border-t p-3 shadow-lg shadow-black/5 backdrop-blur">
          <div className="flex items-center gap-2">
            <Button
              className="flex-1"
              size="sm"
              onClick={() => onFinalize()}
              disabled={visit.status !== "draft"}
            >
              {visit.status !== "draft" ? "Приключено" : "Приключи"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onPrint}
            >
              Печат
            </Button>
            <PdfDownloadButton
              variant="outline"
              className="flex-1"
              fileName={`visit-${id}.pdf`}
              ariaLabel="Изтегли резюме на посещението"
              generatePdf={generateVisitPdf}
            >
              PDF
            </PdfDownloadButton>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() =>
                void router.push(`/invoices/new?visitId=${visit._id}`)
              }
            >
              Фактура
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
