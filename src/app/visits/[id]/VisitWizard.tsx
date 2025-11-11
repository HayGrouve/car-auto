"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { Check, X } from "lucide-react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { FormField } from "@/components/ui/form-field";
import { FormError } from "@/components/ui/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  "soap-so": "SOAP — Anamnesa vitae/Anamnesa morbi",
  "soap-ap": "SOAP — Лабораторна диагностика/Diagnosis",
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

function isWizardStepId(value: string | null): value is WizardStepId {
  return wizardStepOrder.includes(value as WizardStepId);
}

function getFirstUnfinishedStep(
  weight: string,
  temperature: string,
  pulse: string,
  s: string,
  o: string,
  a: string,
  p: string,
  procedures: string[],
  medications: string[],
): WizardStepId {
  // Check measurements step
  if (!weight && !temperature && !pulse) {
    return "measurements";
  }
  // Check soap-so step
  if (![s, o].some((val) => (val ?? "").trim())) {
    return "soap-so";
  }
  // Check soap-ap step
  if (![a, p].some((val) => (val ?? "").trim())) {
    return "soap-ap";
  }
  // Check procedures step
  if (!procedures.length && !medications.length) {
    return "procedures";
  }
  // All steps completed, go to review
  return "review";
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
  const lastWeightsQuery = useQuery(
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
  );
  const lastWeightsResult = lastWeightsQuery as
    | { items: { weight?: number | null }[]; total: number; hasMore: boolean }
    | undefined;
  const lastWeights = lastWeightsResult?.items;
  const update = useMutation(api.visits.update);
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
  const [initializedStep, setInitializedStep] = useState(false);
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

  // Initialize step on mount - only run once when visit data is loaded and hydrated
  useEffect(() => {
    if (!visit || !hydratedWizard || initializedStep) return;

    if (isFinalized) {
      setActiveStep("review");
      setInitializedStep(true);
      return;
    }

    // Check URL parameter first
    const param = searchParams.get("step");
    if (isWizardStepId(param)) {
      setActiveStep(param);
      setInitializedStep(true);
      return;
    }

    // Otherwise, find first unfinished step
    const firstUnfinished = getFirstUnfinishedStep(
      weight,
      temperature,
      pulse,
      s,
      o,
      a,
      p,
      procedures,
      medications,
    );
    setActiveStep(firstUnfinished);
    setInitializedStep(true);
  }, [
    visit,
    hydratedWizard,
    isFinalized,
    searchParams,
    initializedStep,
    weight,
    temperature,
    pulse,
    s,
    o,
    a,
    p,
    procedures,
    medications,
  ]);

  // Update URL when step changes in draft mode (without page reload)
  useEffect(() => {
    if (isFinalized || !initializedStep) return;
    const current = searchParams.get("step");
    if (current === activeStep) return;
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("step", activeStep);
    const newUrl = `${pathname}?${sp.toString()}`;
    window.history.replaceState({}, "", newUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, isFinalized, initializedStep]);

  useEffect(() => {
    if (!isFinalized || !initializedStep) return;
    const current = searchParams.get("step");
    if (current === activeStep) return;
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("step", activeStep);
    const newUrl = `${pathname}?${sp.toString()}`;
    window.history.replaceState({}, "", newUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, initializedStep]);

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
    // Validate procedures step - check if there's text in inputs that hasn't been added
    if (activeStep === "procedures") {
      const procError = procInput.trim()
        ? "Моля, натиснете 'Добави' за да добавите процедурата"
        : undefined;
      const medError = medInput.trim()
        ? "Моля, натиснете 'Добави' за да добавите медикамента"
        : undefined;

      if (procError || medError) {
        toast.error(procError ?? medError);
        return;
      }
    }

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
          content: (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Използвайте бързите бутони за типични стойности или въведете
                точните измервания.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                <FormField
                  label="Килограми"
                  htmlFor="weight"
                  error={
                    weight
                      ? (() => {
                          const num = parseFloat(weight);
                          if (isNaN(num) || num < 0.1 || num > 200) {
                            return "Теглото трябва да е между 0.1 и 200 кг";
                          }
                          return undefined;
                        })()
                      : undefined
                  }
                  hint={`Последно тегло: ${latestWeightText}`}
                >
                  <Input
                    id="weight"
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
                      // Trigger validation immediately
                    }}
                    placeholder="напр. 12.4"
                    aria-invalid={
                      weight
                        ? (() => {
                            const num = parseFloat(weight);
                            return isNaN(num) || num < 0.1 || num > 200;
                          })()
                        : false
                    }
                  />
                </FormField>
                <FormField
                  label="Температура (°C)"
                  htmlFor="temperature"
                  error={
                    temperature
                      ? (() => {
                          const num = parseFloat(temperature);
                          if (isNaN(num) || num < 30 || num > 45) {
                            return "Температурата трябва да е между 30 и 45°C";
                          }
                          return undefined;
                        })()
                      : undefined
                  }
                  hint="Норм. куче ~ 38.3–39.2 °C"
                >
                  <Input
                    id="temperature"
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
                      // Trigger validation immediately
                    }}
                    placeholder="напр. 38.6"
                    aria-invalid={
                      temperature
                        ? (() => {
                            const num = parseFloat(temperature);
                            return isNaN(num) || num < 30 || num > 45;
                          })()
                        : false
                    }
                  />
                </FormField>
                <FormField
                  label="Пулс"
                  htmlFor="pulse"
                  error={
                    pulse
                      ? (() => {
                          const num = parseInt(pulse, 10);
                          if (
                            isNaN(num) ||
                            !Number.isInteger(num) ||
                            num < 30 ||
                            num > 300
                          ) {
                            return "Пулсът трябва да е цяло число между 30 и 300 удара/мин";
                          }
                          return undefined;
                        })()
                      : undefined
                  }
                  hint="Норм. диапазон зависи от вид/възраст"
                >
                  <Input
                    id="pulse"
                    value={pulse}
                    inputMode="numeric"
                    disabled={isFinalized}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const cleaned = raw.replace(/[^0-9]/g, "");
                      setPulse(cleaned);
                      // Trigger validation immediately
                    }}
                    placeholder="напр. 80"
                    aria-invalid={
                      pulse
                        ? (() => {
                            const num = parseInt(pulse, 10);
                            return (
                              isNaN(num) ||
                              !Number.isInteger(num) ||
                              num < 30 ||
                              num > 300
                            );
                          })()
                        : false
                    }
                  />
                </FormField>
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
                aria-label="Anamnesa vitae"
                value={s}
                disabled={isFinalized}
                onChange={(e) => setS(e.target.value)}
                placeholder="Anamnesa vitae"
              />
              <Textarea
                aria-label="Anamnesa morbi"
                value={o}
                disabled={isFinalized}
                onChange={(e) => setO(e.target.value)}
                placeholder="Anamnesa morbi"
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
                aria-label="Лабораторна диагностика"
                value={a}
                disabled={isFinalized}
                onChange={(e) => setA(e.target.value)}
                placeholder="Лабораторна диагностика"
              />
              <Textarea
                aria-label="Diagnosis"
                value={p}
                disabled={isFinalized}
                onChange={(e) => setP(e.target.value)}
                placeholder="Diagnosis"
              />
            </div>
          ),
        },
        {
          id: proceduresId,
          label: wizardStepTitles[proceduresId],
          summary:
            procedures.length || medications.length ? (
              <span className="flex flex-col">
                <span>{procedures.length} процедури</span>
                <span>{medications.length} медикаменти</span>
              </span>
            ) : undefined,
          completed: Boolean(procedures.length || medications.length),
          content: (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-sm font-medium">Процедури</div>
                <div className="flex flex-col gap-2">
                  <div className="space-y-1.5">
                    <Input
                      value={procInput}
                      disabled={isFinalized}
                      onChange={(e) => setProcInput(e.target.value)}
                      placeholder="Добави процедура"
                      aria-invalid={procInput.trim() ? true : undefined}
                      className={cn(procInput.trim() && "border-destructive")}
                    />
                    {procInput.trim() && (
                      <FormError message="Моля, натиснете 'Добави' за да добавите процедурата" />
                    )}
                  </div>
                  <Button
                    type="button"
                    disabled={isFinalized}
                    onClick={() => {
                      const name = procInput.trim();
                      if (!name) return;
                      setProcedures((arr) => [...arr, name]);
                      setProcInput("");
                    }}
                    className="min-h-[44px] w-full sm:w-auto"
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
                <div className="flex flex-col gap-2">
                  <div className="space-y-1.5">
                    <Input
                      value={medInput}
                      disabled={isFinalized}
                      onChange={(e) => setMedInput(e.target.value)}
                      placeholder="Добави медикамент"
                      aria-invalid={medInput.trim() ? true : undefined}
                      className={cn(medInput.trim() && "border-destructive")}
                    />
                    {medInput.trim() && (
                      <FormError message="Моля, натиснете 'Добави' за да добавите медикамента" />
                    )}
                  </div>
                  <Button
                    type="button"
                    disabled={isFinalized}
                    onClick={() => {
                      const name = medInput.trim();
                      if (!name) return;
                      setMedications((arr) => [...arr, name]);
                      setMedInput("");
                    }}
                    className="min-h-[44px] w-full sm:w-auto"
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
          content: (
            <div className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="font-medium">Кратко резюме:</div>

                {/* Measurements */}
                <div className="space-y-1">
                  <div className="font-medium">Измервания:</div>
                  <ul className="text-muted-foreground ml-5 list-disc space-y-1">
                    <li>Тегло: {weight || "—"} кг</li>
                    <li>Температура: {temperature || "—"} °C</li>
                    <li>Пулс: {pulse || "—"}</li>
                  </ul>
                </div>

                {/* SOAP Notes */}
                <div className="space-y-1">
                  <div className="font-medium">SOAP бележки:</div>
                  <div className="text-muted-foreground ml-5 space-y-2">
                    {s.trim() ? (
                      <div>
                        <span className="font-medium">Anamnesa vitae:</span>{" "}
                        <span className="whitespace-pre-wrap">{s}</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground/70">
                        Anamnesa vitae: —
                      </div>
                    )}
                    {o.trim() ? (
                      <div>
                        <span className="font-medium">Anamnesa morbi:</span>{" "}
                        <span className="whitespace-pre-wrap">{o}</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground/70">
                        Anamnesa morbi: —
                      </div>
                    )}
                    {a.trim() ? (
                      <div>
                        <span className="font-medium">Лабораторна диагностика:</span>{" "}
                        <span className="whitespace-pre-wrap">{a}</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground/70">Лабораторна диагностика: —</div>
                    )}
                    {p.trim() ? (
                      <div>
                        <span className="font-medium">Diagnosis:</span>{" "}
                        <span className="whitespace-pre-wrap">{p}</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground/70">Diagnosis: —</div>
                    )}
                  </div>
                </div>

                {/* Procedures */}
                <div className="space-y-1">
                  <div className="font-medium">
                    Процедури:{" "}
                    {(procedures ?? []).length > 0
                      ? `(${(procedures ?? []).length})`
                      : ""}
                  </div>
                  {(procedures ?? []).length > 0 ? (
                    <ul className="text-muted-foreground ml-5 list-disc space-y-1">
                      {(procedures ?? []).map((proc, idx) => (
                        <li key={`proc-review-${idx}`}>{proc}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-muted-foreground/70 ml-5">
                      Няма процедури
                    </div>
                  )}
                </div>

                {/* Medications */}
                <div className="space-y-1">
                  <div className="font-medium">
                    Медикаменти:{" "}
                    {(medications ?? []).length > 0
                      ? `(${(medications ?? []).length})`
                      : ""}
                  </div>
                  {(medications ?? []).length > 0 ? (
                    <ul className="text-muted-foreground ml-5 list-disc space-y-1">
                      {(medications ?? []).map((med, idx) => (
                        <li key={`med-review-${idx}`}>{med}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-muted-foreground/70 ml-5">
                      Няма медикаменти
                    </div>
                  )}
                </div>
              </div>
              {!isFinalized ? (
                <div className="flex flex-wrap gap-2">
                  {visit?.ownerId ? (
                    <Button
                      type="button"
                      onClick={() => {
                        void router.push(
                          `/invoices/new?ownerId=${encodeURIComponent(String(visit.ownerId))}${visit?.animalId ? `&animalId=${encodeURIComponent(String(visit.animalId))}` : ""}&visitId=${encodeURIComponent(String(visit._id))}`,
                        );
                      }}
                      className="min-h-[44px] w-full sm:w-auto"
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

  const stepIndicator = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs font-medium sm:text-sm">
        Стъпки:
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep;
          const isCompleted = Boolean(step.completed);
          const handleStepClick = () => {
            if (isFinalized) return;
            handleStepChange(step.id);
          };
          return (
            <Button
              key={step.id}
              type="button"
              onClick={handleStepClick}
              disabled={isFinalized}
              variant={isActive ? "outline" : "outline"}
              size="sm"
              className={cn(
                "flex min-h-[32px] items-center gap-1 sm:min-h-[36px]",
                isActive && "bg-accent border-accent-foreground/20 font-medium",
              )}
              aria-label={`Стъпка ${index + 1}: ${step.label}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="text-muted-foreground flex items-center gap-1">
                {index + 1}
                {isCompleted ? (
                  <Check className="size-3 text-emerald-600" />
                ) : (
                  <X className="size-3 text-red-600" />
                )}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );

  return (
    <VisitWizardPanel
      steps={steps}
      activeStep={activeStep}
      onStepChange={handleStepChange}
      isFinalized={isFinalized}
      announcement={announceText}
      className="space-y-4"
      contentRef={contentRef}
      stepIndicator={stepIndicator}
      footer={
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="text-muted-foreground text-sm">{progressLabel}</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={activeStep === wizardStepOrder[0] || isFinalized}
              className="min-h-[44px] w-full sm:w-auto"
            >
              Назад
            </Button>
            <Button
              size="sm"
              onClick={() => void handleNext()}
              disabled={isFinalized}
              className="min-h-[44px] w-full sm:w-auto"
            >
              Напред
            </Button>
          </div>
        </div>
      }
    />
  );
}
