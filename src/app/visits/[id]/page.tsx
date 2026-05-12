"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { type VisitDoc } from "@/types/visit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Trash,
  AlertTriangle,
  Paperclip,
  File,
  Download,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { generateVisitSummaryPdf } from "@/lib/pdf-generator";
import VisitWizard from "./VisitWizard";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";
import { VisitHero } from "@/components/visits/VisitHero";
import {
  VisitActionsMenuDesktop,
  VisitActionsMenuMobile,
} from "@/components/visits/VisitActionsMenu";
import { SectionCard } from "@/components/ui/section-card";

// Lazy load PDF button component
const PdfDownloadButton = dynamic(
  () => import("@/components/pdf/PdfDownloadButton"),
  { ssr: false },
);

export default function VisitDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"visits">;
  const visitUnknown = useQuery(
    api.visits.getById,
    useMemo(() => ({ id }), [id]),
  ) as VisitDoc | null | undefined;
  const finalize = useMutation(api.visits.finalize);
  const removeVisit = useMutation(api.visits.remove) as unknown as (args: {
    id: string;
  }) => Promise<{ ok: boolean }>;
  const router = useRouter();

  const [issue, setIssue] = useState("");
  const [inspection, setInspection] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [plan, setPlan] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [parts, setParts] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const customersQuery = useQuery(
    api.customers.list,
    useMemo(() => ({ search: "" }), []),
  );
  const customersResult = customersQuery as
    | {
        items: { _id: string; name: string; phone?: string }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const customers = customersResult?.items;
  const vehiclesQuery = useQuery(
    api.vehicles.list,
    useMemo(() => ({ search: "" }), []),
  );
  const vehiclesResult = vehiclesQuery as
    | {
        items: {
          _id: string;
          licensePlate: string;
          make: string;
          customerId?: string | null;
        }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const vehicles = vehiclesResult?.items;
  const [customerId, setCustomerId] = useState<string>("");
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const generateUploadUrl = useMutation(api.visits.generateAttachmentUploadUrl);
  const addAttachment = useMutation(api.visits.addAttachment);
  const removeAttachment = useMutation(api.visits.removeAttachment);
  const [isUploading, setIsUploading] = useState(false);

  const visit: VisitDoc | null = visitUnknown ?? null;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`Файлът ${file.name} е твърде голям (макс. 25MB)`);
          continue;
        }

        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!res.ok) throw new Error("Upload failed");

        const { storageId } = (await res.json()) as { storageId: string };
        await addAttachment({
          visitId: id,
          storageId,
          name: file.name,
          type: file.type,
          size: file.size,
        });
      }
      toast.success("Файловете са качени");
    } catch (error) {
      console.error(error);
      toast.error("Грешка при качване на файлове");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemoveAttachment(attachmentId: string) {
    if (!confirm("Сигурни ли сте, че искате да премахнете този файл?")) return;
    try {
      await removeAttachment({ visitId: id, attachmentId });
      toast.success("Файлът е премахнат");
    } catch (error) {
      console.error(error);
      toast.error("Грешка при премахване на файл");
    }
  }

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
      setIssue(visit.notes?.issue ?? "");
      setInspection(visit.notes?.inspection ?? "");
      setDiagnosis(visit.notes?.diagnosis ?? "");
      setPlan(visit.notes?.plan ?? "");
      setVehicleId(visit.vehicleId ?? null);
      setCustomerId(visit.customerId ?? "");
      setServices(visit.services ?? []);
      setParts(visit.parts ?? []);
      setHydrated(true);
    }
  }, [visit, hydrated]);

  async function onFinalize() {
    // Check if visit has an invoice
    if (!visit?.invoiceCode) {
      setShowFinalizeConfirm(true);
      return;
    }

    // Proceed with finalization if invoice exists
    await handleFinalizeConfirm();
  }

  async function handleFinalizeConfirm() {
    setShowFinalizeConfirm(false);
    const res = await finalize({ id });
    if (res?.ok) {
      toast.success("Приключено");
      void router.push("/visits");
    }
  }

  async function handleDeleteConfirm() {
    if (!visit) return;
    const expectedText = `изтрии ${visit.code ?? visit._id}`;
    if (deleteConfirmationText.trim() !== expectedText) {
      toast.error("Текстът за потвърждение не съвпада");
      return;
    }
    try {
      const res = await removeVisit({ id });
      if (res?.ok) {
        toast.success("Посещението е изтрито");
        setShowDeleteConfirm(false);
        setDeleteConfirmationText("");
        void router.push("/visits");
      } else {
        toast.error("Грешка при изтриване на посещението");
      }
    } catch {
      toast.error("Грешка при изтриване на посещението");
    }
  }

  function onDelete() {
    setShowDeleteConfirm(true);
    setDeleteConfirmationText("");
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

    const vehicleName = (vehicleInfo?.licensePlate ?? visit.vehicleName ?? "").trim();
    const vehicleMake = (
      vehicleInfo?.make ??
      visit.vehicleMake ??
      ""
    ).trim();
    const alerts = (visit.alerts ?? []).join(", ");
    const customerNameVal = customerInfo?.name ?? "";
    const customerPhoneVal = customerInfo?.phone ?? "";
    const mileageVal = visit.mileage != null ? `${visit.mileage} км` : "—";
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
    const notesRows = [
      row("Оплакване", issue),
      row("Оглед", inspection),
      row("Диагноза", diagnosis),
      row("План за ремонт", plan),
    ].join("");
    const serviceList = (services?.length ? services : [])
      .map((pr) => `<li>${esc(pr)}</li>`)
      .join("");
    const partList = (parts?.length ? parts : [])
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
            <tr><th colspan=2>Автомобил и клиент</th></tr>
            ${row("Автомобил", [vehicleName, vehicleMake].filter(Boolean).join(" · "))}
            ${row("Предупреждения", alerts)}
            ${row("Клиент", customerNameVal)}
            ${row("Телефон", customerPhoneVal)}
          </tbody></table>

          <table class=\"section\"><tbody>
            <tr><th colspan=2>Пробег</th></tr>
            ${row("Пробег", mileageVal)}
          </tbody></table>

          <table class=\"section\"><tbody>
            <tr><th colspan=2>Бележки</th></tr>
            ${notesRows || row("—", "Няма бележки")}
          </tbody></table>

          <table class=\"section\"><tbody>
            <tr><th colspan=2>Услуги</th></tr>
            ${rowHtml("Списък", serviceList || '<span class=\"muted\">(няма)</span>')}
          </tbody></table>

          <table class=\"section\"><tbody>
            <tr><th colspan=2>Части</th></tr>
            ${rowHtml("Списък", partList || '<span class=\"muted\">(няма)</span>')}
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

  const customerInfo = customerId
    ? (customers ?? []).find((o) => o._id === customerId)
    : null;
  const vehicleInfo = vehicleId
    ? (vehicles ?? []).find((a) => a._id === vehicleId)
    : null;
  const visitTimestamp =
    (visit as VisitDoc & { datetime?: number }).datetime ?? visit.createdAt;
  const visitCode = visit.code ?? String(visit._id);
  const deleteConfirmationPhrase = `изтрии ${visitCode}`;

  const generateVisitPdf = async () => {
    const vehicle = (vehicles ?? []).find((a) => a._id === visit.vehicleId);
    const customer = (customers ?? []).find((o) => o._id === visit.customerId);
    return generateVisitSummaryPdf({
      code: (visit as VisitDoc & { code?: string }).code,
      status:
        visit.status === "draft"
          ? "Чернова"
          : visit.status === "finalized"
            ? "Приключено"
            : visit.status,
      date: visitTimestamp,

      vehicleName: vehicle?.licensePlate ?? visit.vehicleName ?? undefined,
      vehicleMake: vehicle?.make ?? visit.vehicleMake ?? undefined,
      alerts: visit.alerts ?? [],
      customerName: customer?.name,
      customerPhone: customer?.phone,
      mileage: visit.mileage ?? null,
      issue: issue,
      inspection: inspection,
      diagnosis: diagnosis,
      plan: plan,
      services: visit.services ?? [],
      parts: visit.parts ?? [],
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
                )}&customerId=${encodeURIComponent(visit.customerId)}${visit.vehicleId ? `&vehicleId=${encodeURIComponent(String(visit.vehicleId))}` : ""}`;
                void router.push(url);
              }}
              extraActions={[
                {
                  label: "Изтрий",
                  onSelect: onDelete,
                  icon: <Trash className="h-4 w-4" aria-hidden="true" />,
                },
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
                )}&customerId=${encodeURIComponent(visit.customerId)}${visit.vehicleId ? `&vehicleId=${encodeURIComponent(String(visit.vehicleId))}` : ""}`;
                void router.push(url);
              }}
              extraActions={[
                {
                  label: "Изтрий",
                  onSelect: onDelete,
                  icon: <Trash className="h-4 w-4" aria-hidden="true" />,
                },
              ]}
            />
          }
          customer={{
            name: customerInfo?.name,
            phone: customerInfo?.phone,
          }}
          vehicle={{
            id: visit.vehicleId ? String(visit.vehicleId) : undefined,
            name: vehicleInfo?.licensePlate ?? visit.vehicleName ?? undefined,
            make: vehicleInfo?.make ?? visit.vehicleMake ?? undefined,
            alerts: visit.alerts ?? [],
          }}
          billing={{
            invoiceCode: visit.invoiceCode ?? null,
            outstanding: visit.outstandingAmount ?? null,
          }}
        />
      </section>
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
                    )}&customerId=${encodeURIComponent(visit.customerId)}${
                      visit.vehicleId
                        ? `&vehicleId=${encodeURIComponent(String(visit.vehicleId))}`
                        : ""
                    }`,
                variant: "ghost",
              },
            ]}
          >
            <div className="grid gap-6 md:grid-cols-2 md:justify-items-center">
              <div className="w-full max-w-md space-y-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Бележки
                </p>
                <div className="space-y-2 text-sm">
                  {(issue ?? "").trim() ? (
                    <div>
                      <span className="text-muted-foreground mr-2 font-medium">
                        Оплакване:
                      </span>
                      <span>{issue}</span>
                    </div>
                  ) : null}
                  {(inspection ?? "").trim() ? (
                    <div>
                      <span className="text-muted-foreground mr-2 font-medium">
                        Оглед:
                      </span>
                      <span>{inspection}</span>
                    </div>
                  ) : null}
                  {(diagnosis ?? "").trim() ? (
                    <div>
                      <span className="text-muted-foreground mr-2 font-medium">
                        Диагноза:
                      </span>
                      <span>{diagnosis}</span>
                    </div>
                  ) : null}
                  {(plan ?? "").trim() ? (
                    <div>
                      <span className="text-muted-foreground mr-2 font-medium">
                        План за ремонт:
                      </span>
                      <span>{plan}</span>
                    </div>
                  ) : null}
                  {!(
                    (issue ?? "").trim() ||
                    (inspection ?? "").trim() ||
                    (diagnosis ?? "").trim() ||
                    (plan ?? "").trim()
                  ) ? (
                    <div className="text-muted-foreground">(няма данни)</div>
                  ) : null}
                </div>
              </div>

              <div className="w-full max-w-md space-y-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Услуги
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {(visit.services ?? []).length ? (
                    (visit.services ?? []).map((pr, idx) => (
                      <li key={idx}>{pr}</li>
                    ))
                  ) : (
                    <li className="text-muted-foreground list-none">(няма)</li>
                  )}
                </ul>
              </div>

              <div className="w-full max-w-md space-y-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Части
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {(visit.parts ?? []).length ? (
                    (visit.parts ?? []).map((md, idx) => (
                      <li key={idx}>{md}</li>
                    ))
                  ) : (
                    <li className="text-muted-foreground list-none">(няма)</li>
                  )}
                </ul>
              </div>

              <div className="w-full max-w-md space-y-3">
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

<SectionCard
          title="Прикачени файлове"
          description={
            <>
              Снимки от оглед, документи и други файлове.
              <br />
              Позволени формати: JPG, PNG, PDF и други, макс. 25MB
            </>
          }
          headerIcon={<Paperclip className="h-4 w-4" />}
          headerActions={
            !isFinalized
              ? [
                  {
                    label: isUploading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Качване...
                      </span>
                    ) : (
                      "Добави файл"
                    ),
                    onClick: () =>
                      document.getElementById("file-upload")?.click(),
                    variant: "outline",
                  },
                ]
              : []
          }
        >
          <input
            id="file-upload"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading || isFinalized}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visit.documents && visit.documents.length > 0 ? (
              visit.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="group bg-background relative flex flex-col overflow-hidden rounded-lg border transition-all hover:shadow-md"
                >
                  {doc.type?.startsWith("image/") && doc.url ? (
                    <div className="bg-muted aspect-video w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={doc.url}
                        alt={doc.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="bg-muted flex aspect-video w-full items-center justify-center">
                      <File className="text-muted-foreground/40 h-10 w-10" />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-3">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span
                        className="line-clamp-1 text-sm font-medium"
                        title={doc.name}
                      >
                        {doc.name}
                      </span>
                      {doc.type?.startsWith("image/") && (
                        <ImageIcon className="text-muted-foreground/60 h-3.5 w-3.5 flex-shrink-0" />
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <div className="text-muted-foreground text-[10px]">
                        {doc.size
                          ? `${(doc.size / 1024 / 1024).toFixed(2)} MB`
                          : ""}
                        {doc.uploadedAt
                          ? ` • ${new Date(doc.uploadedAt).toLocaleDateString("bg-BG")}`
                          : ""}
                      </div>

                      <div className="flex items-center gap-1">
                        {doc.url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={async () => {
                              if (!doc.url) return;
                              try {
                                const response = await fetch(doc.url);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = doc.name;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                console.error("Download failed", error);
                                window.open(doc.url, "_blank");
                              }
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="sr-only">Изтегли</span>
                          </Button>
                        )}
                        {!isFinalized && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7"
                            onClick={() =>
                              doc.id && handleRemoveAttachment(doc.id)
                            }
                          >
                            <Trash className="h-3.5 w-3.5" />
                            <span className="sr-only">Премахни</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                <Paperclip className="text-muted-foreground/20 mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  Няма прикачени файлове
                </p>
              </div>
            )}
          </div>
        </SectionCard>
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
      <AlertDialog
        open={showFinalizeConfirm}
        onOpenChange={setShowFinalizeConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Няма създадена фактура</AlertDialogTitle>
            <AlertDialogDescription>
              Това посещение няма свързана фактура. Сигурни ли сте, че искате да
              го приключите без фактура?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отказ</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalizeConfirm}>
              Да, приключи
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изтриване на посещение</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="text-destructive mt-0.5 h-6 w-6 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="font-semibold">Внимание:</span> Посещенията
                    се записват за всеки автомобил, за да можем да събираме
                    исторически данни. Изтриването трябва да се извърши
                    внимателно.
                  </div>
                </div>
                <div>
                  За да потвърдите изтриването, моля въведете:{" "}
                  <strong>{deleteConfirmationPhrase}</strong>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder={deleteConfirmationPhrase}
              className="w-full"
              aria-label="Потвърждение за изтриване"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmationText("");
              }}
            >
              Отказ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={
                deleteConfirmationText.trim() !== deleteConfirmationPhrase
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive cursor-pointer"
            >
              Изтрий
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}