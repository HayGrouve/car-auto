"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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
      }
    | undefined;
  const lastWeights = useQuery(
    api.weights.listByAnimal,
    useMemo(
      () =>
        visit?.animalId
          ? { animalId: visit.animalId as Id<"animals"> }
          : ("skip" as unknown as { animalId: Id<"animals"> }),
      [visit?.animalId],
    ),
  ) as { kg: number }[] | undefined;
  const update = useMutation(api.visits.update);
  const finalize = useMutation(api.visits.finalize);
  const [step, setStep] = useState<number>(1);
  const stepRef = useRef<HTMLDivElement | null>(null);
  const [announceText, setAnnounceText] = useState("");
  const stepTitles: Record<number, string> = {
    1: "Измервания",
    2: "SOAP — Субективно/Обективно",
    3: "SOAP — Оценка/План",
    4: "Процедури и медикаменти",
    5: "Преглед и финализиране",
  };

  // Local state
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

  // Prefill weight from last recorded value if empty
  useEffect(() => {
    if (!weight && (lastWeights ?? []).length > 0) {
      const latest = (lastWeights ?? [])[0];
      if (latest?.kg) setWeight(String(latest.kg));
    }
  }, [lastWeights, weight]);

  const latestWeightText = useMemo(() => {
    const kg = lastWeights?.[0]?.kg;
    return typeof kg === "number" ? `${kg.toFixed(2)} кг` : "—";
  }, [lastWeights]);

  // Initialize step from URL (?step=1..5)
  useEffect(() => {
    const raw = searchParams.get("step");
    const n = raw ? Number(raw) : 1;
    if (Number.isFinite(n) && n >= 1 && n <= 5) setStep(n);
  }, [searchParams]);

  // Persist step in URL (replace to avoid backstack spam)
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("step", String(step));
    router.replace(`${pathname}?${sp.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Announce step changes and manage focus to step region
  useEffect(() => {
    setAnnounceText(`Стъпка ${step} от 5: ${stepTitles[step] ?? ""}`);
    const t = setTimeout(() => {
      stepRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Debounce helper
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

  // Autosave: measurements (Step 1)
  useDebouncedEffect(() => {
    void saveMeasurements();
  }, [id, weight, temperature, pulse]);
  // Autosave: S/O (Step 2)
  useDebouncedEffect(() => {
    void saveSO();
  }, [id, s, o]);
  // Autosave: A/P (Step 3)
  useDebouncedEffect(() => {
    void saveAP();
  }, [id, a, p]);
  // Autosave: Procedures/Medications (Step 4)
  useDebouncedEffect(() => {
    void savePM();
  }, [id, procedures, medications]);

  function Footer() {
    return (
      <div className="bg-background fixed right-0 bottom-0 left-0 z-10 flex items-center justify-between border-t p-3 pt-2 md:static md:p-0 md:pt-2">
        <Button
          variant="outline"
          onClick={() => setStep((n) => Math.max(1, n - 1))}
          disabled={step === 1}
        >
          Назад
        </Button>
        <div className="text-muted-foreground text-sm">Стъпка {step}/5</div>
        {step < 5 ? (
          <Button
            onClick={async () => {
              if (step === 1) await saveMeasurements();
              if (step === 2) await saveSO();
              if (step === 3) await saveAP();
              toast.success("Запазено");
              setStep((n) => n + 1);
            }}
          >
            Напред
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              // clear step param on close
              const sp = new URLSearchParams(searchParams.toString());
              sp.delete("step");
              router.replace(
                `${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`,
              );
              onClose?.();
            }}
          >
            Затвори
          </Button>
        )}
      </div>
    );
  }

  if (!visit) return <div className="p-3">Зареждане...</div>;

  return (
    <div className="space-y-3 rounded-md border p-3 pb-20">
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announceText}
      </div>
      {/* Stepper header */}
      <nav aria-label="Стъпки" className="mb-2">
        <ol className="flex flex-wrap gap-2 text-xs">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
            <li
              key={n}
              className={`inline-flex items-center gap-2 ${n === step ? "font-medium" : "text-muted-foreground"}`}
              aria-current={n === step ? "step" : undefined}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${n === step ? "bg-accent" : ""}`}
              >
                {n}
              </span>
              <span className="hidden sm:inline">{stepTitles[n]}</span>
            </li>
          ))}
        </ol>
      </nav>
      {step === 1 && (
        <div
          ref={stepRef}
          tabIndex={-1}
          role="region"
          aria-labelledby="step-title-1"
          className="space-y-2"
        >
          <div id="step-title-1" className="font-medium">
            Измервания
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <label className="text-sm">Килограми</label>
              <Input
                value={weight}
                inputMode="decimal"
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
              <label className="text-sm">Температура (°C)</label>
              <Input
                value={temperature}
                inputMode="decimal"
                onChange={(e) => {
                  const raw = e.target.value;
                  // Allow digits and one decimal point, keep user typing intact
                  const cleaned = raw.replace(/[^0-9.,]/g, "");
                  // Normalize comma to dot but do not strip trailing dot
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
              <label className="text-sm">Пулс</label>
              <Input
                value={pulse}
                inputMode="numeric"
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
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              className="hover:bg-accent rounded-full border px-2 py-1"
              onClick={() => setTemperature("38.6")}
            >
              Темп 38.6
            </button>
            <button
              type="button"
              className="hover:bg-accent rounded-full border px-2 py-1"
              onClick={() => setPulse("80")}
            >
              Пулс 80
            </button>
          </div>
          <Footer />
        </div>
      )}
      {step === 2 && (
        <div
          ref={stepRef}
          tabIndex={-1}
          role="region"
          aria-labelledby="step-title-2"
          className="space-y-2"
        >
          <div id="step-title-2" className="font-medium">
            SOAP — Субективно/Обективно
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              "Загуба на апетит",
              "Повръщане",
              "Диария",
              "Летаргия",
              "Кашлица",
            ].map((t, i) => (
              <button
                key={`t-${i}`}
                type="button"
                className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
                onClick={() => setS((prev) => (prev ? prev + "\n" + t : t))}
              >
                {t}
              </button>
            ))}
          </div>
          <Textarea
            aria-label="Субективно"
            value={s}
            onChange={(e) => setS(e.target.value)}
            placeholder="Субективно"
          />
          <Textarea
            aria-label="Обективно"
            value={o}
            onChange={(e) => setO(e.target.value)}
            placeholder="Обективно"
          />
          <Footer />
        </div>
      )}
      {step === 3 && (
        <div
          ref={stepRef}
          tabIndex={-1}
          role="region"
          aria-labelledby="step-title-3"
          className="space-y-2"
        >
          <div id="step-title-3" className="font-medium">
            SOAP — Оценка/План
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              "Остър гастроентерит",
              "Дехидратация",
              "Горна респираторна инфекция",
              "Паразитоза",
              "Алергична реакция",
            ].map((t, i) => (
              <button
                key={`a-${i}`}
                type="button"
                className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
                onClick={() => setA((prev) => (prev ? prev + "\n" + t : t))}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              "Орална рехидратация",
              "Диетичен режим 24–48ч",
              "Антибиотична терапия по схема",
              "Обезпаразитяване",
              "Контролен преглед след 3 дни",
            ].map((t, i) => (
              <button
                key={`p-${i}`}
                type="button"
                className="hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1"
                onClick={() => setP((prev) => (prev ? prev + "\n" + t : t))}
              >
                {t}
              </button>
            ))}
          </div>
          <Textarea
            aria-label="Оценка"
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder="Оценка"
          />
          <Textarea
            aria-label="План"
            value={p}
            onChange={(e) => setP(e.target.value)}
            placeholder="План"
          />
          <Footer />
        </div>
      )}
      {step === 4 && (
        <div
          ref={stepRef}
          tabIndex={-1}
          role="region"
          aria-labelledby="step-title-4"
          className="space-y-2"
        >
          <div id="step-title-4" className="font-medium">
            Процедури и медикаменти
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Процедури</div>
            <div className="flex gap-2">
              <Input
                value={procInput}
                onChange={(e) => setProcInput(e.target.value)}
                placeholder="Добави процедура"
              />
              <Button
                type="button"
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
                      key={`ps-${i}`}
                      type="button"
                      aria-pressed={selected}
                      className={`hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1 ${selected ? "bg-accent" : ""}`}
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
                    key={`pr-${idx}`}
                    className="flex items-center justify-between p-2 text-sm"
                  >
                    <div>{name}</div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setProcedures((arr) => arr.filter((_, i) => i !== idx))
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
                onChange={(e) => setMedInput(e.target.value)}
                placeholder="Добави медикамент"
              />
              <Button
                type="button"
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
                      key={`ms-${i}`}
                      type="button"
                      aria-pressed={selected}
                      className={`hover:bg-accent inline-flex items-center gap-1 rounded-full border px-2 py-1 ${selected ? "bg-accent" : ""}`}
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
                    key={`md-${idx}`}
                    className="flex items-center justify-between p-2 text-sm"
                  >
                    <div>{name}</div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setMedications((arr) => arr.filter((_, i) => i !== idx))
                      }
                    >
                      Премахни
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <Footer />
        </div>
      )}
      {step === 5 && (
        <div
          ref={stepRef}
          tabIndex={-1}
          role="region"
          aria-labelledby="step-title-5"
          className="space-y-2"
        >
          <div id="step-title-5" className="font-medium">
            Преглед и финализиране
          </div>
          <div className="space-y-1 text-sm">
            <div>Кратко резюме:</div>
            <ul className="text-muted-foreground ml-5 list-disc">
              <li>
                Тегло: {weight || "—"} кг · Температура: {temperature || "—"} °C
                · Пулс: {pulse || "—"}
              </li>
              <li>
                S/O/A/P въведени:{" "}
                {[s, o, a, p].some((v) => (v ?? "").trim()) ? "Да" : "Не"}
              </li>
              <li>Процедури: {(procedures ?? []).length}</li>
              <li>Медикаменти: {(medications ?? []).length}</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={async () => {
                const res = await finalize({ id });
                if (res?.ok) {
                  toast.success("Посещението е приключено");
                  const sp2 = new URLSearchParams(searchParams.toString());
                  sp2.delete("step");
                  router.replace(
                    `${pathname}${sp2.toString() ? `?${sp2.toString()}` : ""}`,
                  );
                  onClose?.();
                }
              }}
            >
              Приключи посещението
            </Button>
            {visit?.ownerId ? (
              <a
                className="hover:bg-accent inline-flex items-center rounded-md border px-3 py-2 text-sm"
                href={`/invoices/new?ownerId=${encodeURIComponent(String(visit.ownerId))}${visit?.animalId ? `&animalId=${encodeURIComponent(String(visit.animalId))}` : ""}&visitId=${encodeURIComponent(String(visit._id))}`}
              >
                Създай фактура
              </a>
            ) : null}
          </div>
          <Footer />
        </div>
      )}
    </div>
  );
}
