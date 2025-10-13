"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  VisitWizardPanel,
  type VisitWizardStep,
} from "@/components/visits/VisitWizardPanel";

const wizardStepOrder = [
  "measurements",
  "soap-so",
  "soap-ap",
  "procedures",
  "review",
] as const;

function stepAt(index: number): WizardStepId {
  const clamped = Math.max(0, Math.min(index, wizardStepOrder.length - 1));
  return wizardStepOrder[clamped]!;
}

function getNextStep(current: WizardStepId): WizardStepId {
  const index = wizardStepOrder.indexOf(current);
  return stepAt(index + 1);
}

function getPrevStep(current: WizardStepId): WizardStepId {
  const index = wizardStepOrder.indexOf(current);
  return stepAt(index - 1);
}

type WizardStepId = (typeof wizardStepOrder)[number];

const soapSoId: WizardStepId = "soap-so";
const soapApId: WizardStepId = "soap-ap";
const proceduresId: WizardStepId = "procedures";
const reviewId: WizardStepId = "review";

const wizardStepTitles: Record<WizardStepId, string> = {
  measurements: "Измервания",
  "soap-so": "SOAP — Субективно/Обективно",
  "soap-ap": "SOAP — Оценка/План",
  procedures: "Процедури и медикаменти",
  review: "Преглед и финализиране",
};

const soapSubjectiveOptions = [
  "Загуба на апетит",
  "Повръщане",
  "Диария",
  "Летаргия",
  "Кашлица",
];

const soapAssessmentOptions = [
  "Остър гастроентерит",
  "Дехидратация",
  "Горна респираторна инфекция",
  "Паразитоза",
  "Алергична реакция",
];

const soapPlanOptions = [
  "Орална рехидратация",
  "Диетичен режим 24–48ч",
  "Антибиотична терапия по схема",
  "Обезпаразитяване",
  "Контролен преглед след 3 дни",
];

const hintsByStep: Record<WizardStepId, ReactNode | undefined> = {
  measurements: (
    <div className="space-y-2">
      <p>
        Използвайте бързите бутони за типични стойности или въведете точните
        измервания.
      </p>
      <p>Нормалната телесна температура на куче е 38.3–39.2°C.</p>
    </div>
  ),
  "soap-so": (
    <div className="space-y-2">
      <p>
        <strong>Субективно (S)</strong>: Информацията, предадена от собственика.
      </p>
      <p>
        <strong>Обективно (O)</strong>: Наблюдения и измервания по време на
        прегледа.
      </p>
    </div>
  ),
  "soap-ap": (
    <div className="space-y-2">
      <p>
        <strong>Оценка (A)</strong>: Диагноза или списък с проблеми.
      </p>
      <p>
        <strong>План (P)</strong>: Терапия и последващи действия.
      </p>
    </div>
  ),
  procedures: (
    <div className="space-y-2">
      <p>Добавете проведените процедури и приложените медикаменти.</p>
      <p>Използвайте предложенията за бързо попълване.</p>
    </div>
  ),
  review: (
    <div className="space-y-2">
      <p>Проверете въведените данни преди финализиране.</p>
      <p>Финализираното посещение става само за четене.</p>
    </div>
  ),
};

function isWizardStepId(value: string | null): value is WizardStepId {
  return wizardStepOrder.includes(value as WizardStepId);
}

export default function VisitWizard({
  id,
  onClose,
}: {
  id: Id<"visits">;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visit = useQuery(
    api.visits.getById,
    useMemo(() => ({ id }), [id]),
  ) as
    | {
        _id: string;
        ownerId: string;
        animalId?: string | null;
        weight?: number | null;
        temperature?: number | null;
        pulse?: number | null;
        soap?: { s?: string; o?: string; a?: string; p?: string };
        procedures?: string[];
        medications?: string[];
        createdAt: number;
        status?: string;
      }
    | undefined;
  const lastWeights = useQuery(
    api.visits.list,
    useMemo(
      () =>
        visit?.animalId
          ? {
              animalId: visit.animalId as Id<"animals">,
              sort: "datetimeDesc",
              limit: 10,
            }
          : { sort: "datetimeDesc", limit: 0 },
      [visit?.animalId],
    ),
  ) as { weight?: number | null }[] | undefined;
  const update = useMutation(api.visits.update);
  const finalize = useMutation(api.visits.finalize);
  const [activeStep, setActiveStep] = useState<WizardStepId>("measurements");
  const contentRef = useRef<HTMLDivElement>(null);
  const [announceText, setAnnounceText] = useState("");
  const isFinalized = visit?.status !== undefined && visit.status !== "draft";

  const [weight, setWeight] = useState<string>("");
  const [temperature, setTemperature] = useState<string>("");
  const [pulse, setPulse] = useState<string>("");
  const [s, setS] = useState("");
  const [o, setO] = useState("");
  const [a, setA] = useState("");
  const [p, setP] = useState("");
  const [procedures, setProcedures] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [procInput, setProcInput] = useState("");
  const [medInput, setMedInput] = useState("");
  const procSuggestions = useQuery(
    api.visits.suggestProcedures,
    useMemo(() => ({ limit: 8 }), []),
  ) as string[] | undefined;
  const medSuggestions = useQuery(
    api.visits.suggestMedications,
    useMemo(() => ({ limit: 8 }), []),
  ) as string[] | undefined;

  const [hydratedWizard, setHydratedWizard] = useState(false);
  useEffect(() => {
    if (!visit || hydratedWizard) return;
    setWeight(visit.weight ? String(visit.weight) : "");
    setTemperature(visit.temperature ? String(visit.temperature) : "");
    setPulse(visit.pulse ? String(visit.pulse) : "");
    setS(visit.soap?.s ?? "");
    setO(visit.soap?.o ?? "");
    setA(visit.soap?.a ?? "");
    setP(visit.soap?.p ?? "");
    setProcedures(visit.procedures ?? []);
    setMedications(visit.medications ?? []);
    setHydratedWizard(true);
  }, [visit, hydratedWizard]);

  useEffect(() => {
    if (!weight && (lastWeights ?? []).length > 0) {
      const latest = (lastWeights ?? [])[0];
      if (typeof latest?.weight === "number") setWeight(String(latest.weight));
    }
  }, [lastWeights, weight]);

  const latestWeightText = useMemo(() => {
    const kg = lastWeights?.[0]?.weight;
    return typeof kg === "number" ? `${kg.toFixed(2)} кг` : "—";
  }, [lastWeights]);

  useEffect(() => {
    if (isFinalized) {
      setActiveStep("review");
      return;
    }
    // Draft mode: respect user interaction; only adopt URL if it explicitly specifies a valid step.
    const param = searchParams.get("step");
    if (isWizardStepId(param) && param !== activeStep) {
      setActiveStep(param);
    }
  }, [isFinalized, searchParams, activeStep]);

  useEffect(() => {
    if (!isFinalized) return;
    const current = searchParams.get("step");
    if (current === activeStep) return;
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("step", activeStep);
    router.replace(`${pathname}?${sp.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  useEffect(() => {
    if (!isFinalized) return;
    const sp = new URLSearchParams(searchParams.toString());
    if (!sp.has("step")) return;
    sp.delete("step");
    router.replace(`${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinalized]);

  useEffect(() => {
    const index = wizardStepOrder.indexOf(activeStep);
    setAnnounceText(
      `Стъпка ${index + 1} от ${wizardStepOrder.length}: ${wizardStepTitles[activeStep] ?? ""}`,
    );
  }, [activeStep]);

  function useDebouncedEffect(
    fn: () => void | Promise<void>,
    deps: unknown[],
    delay = 500,
  ) {
    useEffect(() => {
      const t = setTimeout(() => {
        void fn();
      }, delay);
      return () => clearTimeout(t);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
  }

  async function saveMeasurements() {
    try {
      await update({
        id,
        weight: weight ? parseFloat(weight) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        pulse: pulse ? parseFloat(pulse) : null,
      });
    } catch {
      // ignore transient save errors in autosave
    }
  }

  async function saveSO() {
    try {
      await update({
        id,
        soap: {
          s,
          o,
          a: visit?.soap?.a ?? undefined,
          p: visit?.soap?.p ?? undefined,
        },
      });
    } catch {
      // ignore
    }
  }

  async function saveAP() {
    try {
      await update({
        id,
        soap: {
          s: visit?.soap?.s ?? undefined,
          o: visit?.soap?.o ?? undefined,
          a,
          p,
        },
      });
    } catch {
      // ignore
    }
  }

  async function savePM() {
    try {
      await update({ id, procedures, medications });
    } catch {
      // ignore
    }
  }

  useDebouncedEffect(() => {
    void saveMeasurements();
  }, [id, weight, temperature, pulse]);
  useDebouncedEffect(() => {
    void saveSO();
  }, [id, s, o]);
  useDebouncedEffect(() => {
    void saveAP();
  }, [id, a, p]);
  useDebouncedEffect(() => {
    void savePM();
  }, [id, procedures, medications]);

  const currentIndex = Math.max(wizardStepOrder.indexOf(activeStep), 0);

  function handleStepChange(next: string) {
    if (!isWizardStepId(next)) return;
    setActiveStep(next);
  }

  function handlePrev() {
    if (currentIndex === 0) return;
    setActiveStep(getPrevStep(activeStep));
  }

  async function handleNext() {
    switch (activeStep) {
      case "measurements":
        await saveMeasurements();
        break;
      case "soap-so":
        await saveSO();
        break;
      case "soap-ap":
        await saveAP();
        break;
      case "procedures":
        await savePM();
        break;
      default:
        break;
    }
    if (currentIndex < wizardStepOrder.length - 1) {
      setActiveStep(getNextStep(activeStep));
    } else {
      handleClose();
    }
  }

  function handleClose() {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("step");
    router.replace(`${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`);
    onClose?.();
  }

  async function finalizeVisit() {
    const res = await finalize({ id });
    if (res?.ok) {
      toast.success("Посещението е приключено");
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("step");
      router.replace(`${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`);
      onClose?.();
    } else {
      toast.error("Неуспешно финализиране");
    }
  }

  const steps: VisitWizardStep[] = visit
    ? [
        {
          id: "measurements",
          label: wizardStepTitles.measurements,
          summary:
            weight || temperature || pulse
              ? "Записани измервания"
              : latestWeightText !== "—"
                ? `Последно тегло: ${latestWeightText}`
                : undefined,
          completed: Boolean(weight || temperature || pulse),
          hints: hintsByStep.measurements,
          content: (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Използвайте бързите бутони за типични стойности или въведете
                точните измервания.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Килограми</label>
                  <Input
                    value={weight}
                    inputMode="decimal"
                    disabled={isFinalized}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const cleaned = raw.replace(/[^0-9.,]/g, "");
                      const normalized = cleaned.includes(",")
                        ? cleaned.replace(",", ".")
                        : cleaned;
                      setWeight(normalized);
                    }}
                    placeholder="напр. 12.4"
                  />
                  <div className="text-muted-foreground mt-1 text-xs">
                    Последно тегло: {latestWeightText}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Температура (°C)
                  </label>
                  <Input
                    value={temperature}
                    inputMode="decimal"
                    disabled={isFinalized}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const cleaned = raw.replace(/[^0-9.,]/g, "");
                      const normalized = cleaned.includes(",")
                        ? cleaned.replace(",", ".")
                        : cleaned;
                      setTemperature(normalized);
                    }}
                    placeholder="напр. 38.6"
                  />
                  <div className="text-muted-foreground mt-1 text-xs">
                    Норм. куче ~ 38.3–39.2 °C
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Пулс</label>
                  <Input
                    value={pulse}
                    inputMode="numeric"
                    disabled={isFinalized}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const cleaned = raw.replace(/[^0-9]/g, "");
                      setPulse(cleaned);
                    }}
                    placeholder="напр. 80"
                  />
                  <div className="text-muted-foreground mt-1 text-xs">
                    Норм. диапазон зависи от вид/възраст
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  className="hover:bg-accent rounded-full border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isFinalized}
                  onClick={() => setTemperature("38.6")}
                >
                  Темп 38.6
                </button>
                <button
                  type="button"
                  className="hover:bg-accent rounded-full border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isFinalized}
                  onClick={() => setPulse("80")}
                >
                  Пулс 80
                </button>
              </div>
            </div>
          ),
        },
        {
          id: soapSoId,
          label: wizardStepTitles[soapSoId],
          summary: [s, o].some((val) => (val ?? "").trim())
            ? "Въведени бележки"
            : undefined,
          completed: [s, o].some((val) => (val ?? "").trim()),
          hints: hintsByStep[soapSoId],
          content: (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                {soapSubjectiveOptions.map((text, index) => (
                  <button
                    key={`subjective-${index}`}
                    type="button"
                    className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isFinalized}
                    onClick={() =>
                      setS((prev) => (prev ? `${prev}\n${text}` : text))
                    }
                  >
                    {text}
                  </button>
                ))}
              </div>
              <Textarea
                aria-label="Субективно"
                value={s}
                disabled={isFinalized}
                onChange={(e) => setS(e.target.value)}
                placeholder="Субективно"
              />
              <Textarea
                aria-label="Обективно"
                value={o}
                disabled={isFinalized}
                onChange={(e) => setO(e.target.value)}
                placeholder="Обективно"
              />
            </div>
          ),
        },
        {
          id: soapApId,
          label: wizardStepTitles[soapApId],
          summary: [a, p].some((val) => (val ?? "").trim())
            ? "Добавени A/P бележки"
            : undefined,
          completed: [a, p].some((val) => (val ?? "").trim()),
          hints: hintsByStep[soapApId],
          content: (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                {soapAssessmentOptions.map((text, index) => (
                  <button
                    key={`assessment-${index}`}
                    type="button"
                    className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isFinalized}
                    onClick={() =>
                      setA((prev) => (prev ? `${prev}\n${text}` : text))
                    }
                  >
                    {text}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {soapPlanOptions.map((text, index) => (
                  <button
                    key={`plan-${index}`}
                    type="button"
                    className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isFinalized}
                    onClick={() =>
                      setP((prev) => (prev ? `${prev}\n${text}` : text))
                    }
                  >
                    {text}
                  </button>
                ))}
              </div>
              <Textarea
                aria-label="Оценка"
                value={a}
                disabled={isFinalized}
                onChange={(e) => setA(e.target.value)}
                placeholder="Оценка"
              />
              <Textarea
                aria-label="План"
                value={p}
                disabled={isFinalized}
                onChange={(e) => setP(e.target.value)}
                placeholder="План"
              />
            </div>
          ),
        },
        {
          id: proceduresId,
          label: wizardStepTitles[proceduresId],
          summary:
            procedures.length || medications.length
              ? `${procedures.length} процедури · ${medications.length} медикаменти`
              : undefined,
          completed: Boolean(procedures.length || medications.length),
          hints: hintsByStep[proceduresId],
          content: (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-sm font-medium">Процедури</div>
                <div className="flex gap-2">
                  <Input
                    value={procInput}
                    disabled={isFinalized}
                    onChange={(e) => setProcInput(e.target.value)}
                    placeholder="Добави процедура"
                  />
                  <Button
                    type="button"
                    disabled={isFinalized}
                    onClick={() => {
                      const name = procInput.trim();
                      if (!name) return;
                      setProcedures((arr) => [...arr, name]);
                      setProcInput("");
                    }}
                  >
                    Добави
                  </Button>
                </div>
                {(procSuggestions ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(procSuggestions ?? []).map((name, i) => {
                      const selected = (procedures ?? []).includes(name);
                      return (
                        <button
                          key={`proc-suggestion-${i}`}
                          type="button"
                          aria-pressed={selected}
                          className={`hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "bg-accent" : ""}`}
                          disabled={isFinalized}
                          onClick={() =>
                            setProcedures((arr) =>
                              selected
                                ? arr.filter((n) => n !== name)
                                : [...arr, name],
                            )
                          }
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <div className="divide-y rounded-md border">
                  {(procedures ?? []).length === 0 ? (
                    <div className="text-muted-foreground p-2 text-sm">
                      Няма процедури
                    </div>
                  ) : (
                    (procedures ?? []).map((name, idx) => (
                      <div
                        key={`procedure-${idx}`}
                        className="flex items-center justify-between p-2 text-sm"
                      >
                        <div>{name}</div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isFinalized}
                          onClick={() =>
                            setProcedures((arr) =>
                              arr.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          Премахни
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Медикаменти</div>
                <div className="flex gap-2">
                  <Input
                    value={medInput}
                    disabled={isFinalized}
                    onChange={(e) => setMedInput(e.target.value)}
                    placeholder="Добави медикамент"
                  />
                  <Button
                    type="button"
                    disabled={isFinalized}
                    onClick={() => {
                      const name = medInput.trim();
                      if (!name) return;
                      setMedications((arr) => [...arr, name]);
                      setMedInput("");
                    }}
                  >
                    Добави
                  </Button>
                </div>
                {(medSuggestions ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(medSuggestions ?? []).map((name, i) => {
                      const selected = (medications ?? []).includes(name);
                      return (
                        <button
                          key={`med-suggestion-${i}`}
                          type="button"
                          aria-pressed={selected}
                          className={`hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "bg-accent" : ""}`}
                          disabled={isFinalized}
                          onClick={() =>
                            setMedications((arr) =>
                              selected
                                ? arr.filter((n) => n !== name)
                                : [...arr, name],
                            )
                          }
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <div className="divide-y rounded-md border">
                  {(medications ?? []).length === 0 ? (
                    <div className="text-muted-foreground p-2 text-sm">
                      Няма медикаменти
                    </div>
                  ) : (
                    (medications ?? []).map((name, idx) => (
                      <div
                        key={`medication-${idx}`}
                        className="flex items-center justify-between p-2 text-sm"
                      >
                        <div>{name}</div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isFinalized}
                          onClick={() =>
                            setMedications((arr) =>
                              arr.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          Премахни
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ),
        },
        {
          id: reviewId,
          label: wizardStepTitles.review,
          summary: isFinalized ? "Посещението е приключено" : undefined,
          completed: isFinalized,
          hints: hintsByStep.review,
          content: (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <div>Кратко резюме:</div>
                <ul className="text-muted-foreground ml-5 list-disc space-y-1">
                  <li>
                    Тегло: {weight || "—"} кг · Температура:{" "}
                    {temperature || "—"}
                    °C · Пулс: {pulse || "—"}
                  </li>
                  <li>
                    S/O/A/P въведени:{" "}
                    {[s, o, a, p].some((v) => (v ?? "").trim()) ? "Да" : "Не"}
                  </li>
                  <li>Процедури: {(procedures ?? []).length}</li>
                  <li>Медикаменти: {(medications ?? []).length}</li>
                </ul>
              </div>
              {!isFinalized ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void finalizeVisit()}>
                    Приключи посещението
                  </Button>
                  {visit?.ownerId ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void router.push(
                          `/invoices/new?ownerId=${encodeURIComponent(String(visit.ownerId))}${visit?.animalId ? `&animalId=${encodeURIComponent(String(visit.animalId))}` : ""}&visitId=${encodeURIComponent(String(visit._id))}`,
                        );
                      }}
                    >
                      Създай фактура
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  Посещението е финализирано и е само за четене.
                </div>
              )}
            </div>
          ),
        },
      ]
    : [];

  if (!visit) {
    return <div className="p-3">Зареждане...</div>;
  }

  const progressLabel = `Стъпка ${currentIndex + 1} от ${wizardStepOrder.length}`;

  return (
    <VisitWizardPanel
      steps={steps}
      activeStep={activeStep}
      onStepChange={handleStepChange}
      isFinalized={isFinalized}
      announcement={announceText}
      className="space-y-4"
      contentRef={contentRef}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <div className="text-muted-foreground text-sm">{progressLabel}</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={activeStep === wizardStepOrder[0] || isFinalized}
            >
              Назад
            </Button>
            <Button
              size="sm"
              onClick={() => void handleNext()}
              disabled={isFinalized}
            >
              Напред
            </Button>
          </div>
        </div>
      }
    />
  );
}
