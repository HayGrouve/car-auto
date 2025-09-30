"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { VisitDocSchema, type VisitDoc } from "@/types/visit";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { toast } from "sonner";
import { brand } from "@/lib/brand";
import { fmtDateTimeBG } from "@/lib/format";
import dynamic from "next/dynamic";
import VisitPdfButton from "@/components/pdf/VisitPdfButton";
import { CalendarCheck, FileText, Printer, FilePlus } from "lucide-react";
const VisitPdf = dynamic(() => import("@/components/pdf/VisitPdf"), { ssr: false });

export default function VisitDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"visits">;
  const visitUnknown = useQuery(api.visits.getById, useMemo(() => ({ id }), [id])) as unknown;
  const update = useMutation(api.visits.update);
  const finalize = useMutation(api.visits.finalize);
  const createVisit = useMutation(api.visits.create) as unknown as (args: { ownerId: string; animalId?: string | null; datetime?: number; soap: { s?: string; o?: string; a?: string; p?: string }; procedures?: string[]; medications?: string[] }) => Promise<{ ok: boolean; id: string }>;
  const router = useRouter();

  const [s, setS] = useState("");
  const [o, setO] = useState("");
  const [a, setA] = useState("");
  const [p, setP] = useState("");
  const [dt, setDt] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [procedures, setProcedures] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [procInput, setProcInput] = useState("");
  const [medInput, setMedInput] = useState("");
  const procedureSuggestions = useQuery(api.visits.suggestProcedures, useMemo(() => ({ limit: 8 }), [])) as string[] | undefined;
  const medicationSuggestions = useQuery(api.visits.suggestMedications, useMemo(() => ({ limit: 8 }), [])) as string[] | undefined;
  const [animalId, setAnimalId] = useState<string | null>(null);
  const [animalSearch, setAnimalSearch] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");
  const owners = useQuery(api.owners.list, useMemo(() => ({ search: ownerSearch }), [ownerSearch])) as { _id: string; name: string; phone?: string }[] | undefined;
  const animals = useQuery(api.animals.list, useMemo(() => ({ search: animalSearch }), [animalSearch])) as { _id: string; name: string; species: string; ownerId?: string | null }[] | undefined;
  const [ownerId, setOwnerId] = useState<string>("");

  const parsed = VisitDocSchema.safeParse(visitUnknown);
  const visit: VisitDoc | null = parsed.success ? parsed.data : null;

  useEffect(() => {
    if (!hydrated && visit) {
      setS(visit.soap?.s ?? "");
      setO(visit.soap?.o ?? "");
      setA(visit.soap?.a ?? "");
      setP(visit.soap?.p ?? "");
      const baseTs = (visit as VisitDoc & { datetime?: number }).datetime ?? visit.createdAt;
      setDt(baseTs ? new Date(baseTs).toISOString().slice(0,16) : "");
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
      ownerId: (ownerId || null) as Id<"owners"> | null,
    })) as { ok: boolean };
    if (res?.ok) toast.success("Записът е обновен");
  }

  async function onFinalize() {
    const res = await finalize({ id });
    if (res?.ok) {
      toast.success("Приключено");
      router.push("/visits");
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
      router.push(`/visits/${res.id}`);
    }
  }

  function onPrint() {
    if (!visit) return;
    const soapRows = [
      { label: "S - Субективно", value: s },
      { label: "O - Обективно", value: o },
      { label: "A - Оценка", value: a },
      { label: "P - План", value: p },
    ]
      .filter((row) => (row.value ?? "").trim() !== "")
      .map((row) => `<tr><td class=\"muted\">${row.label}</td><td>${(row.value ?? "").replace(/</g, "&lt;")}</td></tr>`) 
      .join("");
    const procedureRows = (procedures ?? [])
      .map((pr) => `<li>${String(pr).replace(/</g, "&lt;")}</li>`) 
      .join("");
    const medRows = (medications ?? [])
      .map((md) => `<li>${String(md).replace(/</g, "&lt;")}</li>`) 
      .join("");
    const when = (visit as VisitDoc & { datetime?: number }).datetime ?? visit.createdAt;
    const html = `<!doctype html>
      <html lang=\"bg\">
        <head>
          <meta charset=\"utf-8\" />
          <title>Посещение ${(visit as VisitDoc & { code?: string }).code ?? `#${String(visit._id)}`}</title>
          <style>
            body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;color:#111}
            h1{font-size:20px;margin:0 0 12px}
            table{border-collapse:collapse;width:100%;margin-top:12px}
            th,td{border:1px solid #ddd;padding:8px;vertical-align:top}
            .muted{color:#666;width:180px}
            .section{margin-top:16px}
          </style>
        </head>
        <body>
          <h1>Посещение ${(visit as VisitDoc & { code?: string }).code ?? `#${String(visit._id)}`}</h1>
          <div class=\"muted\">Дата/час: ${new Date(when).toLocaleString('bg-BG')}</div>
          <div class=\"muted\">Статус: ${visit.status === 'draft' ? 'Чернова' : visit.status === 'finalized' ? 'Приключено' : visit.status}</div>
          <table>
            <tbody>
              ${soapRows}
            </tbody>
          </table>
          <div class=\"section\">
            <div><strong>Процедури</strong></div>
            <ul>${procedureRows || '<li class=\"muted\">(няма)</li>'}</ul>
          </div>
          <div class=\"section\">
            <div><strong>Медикаменти</strong></div>
            <ul>${medRows || '<li class=\"muted\">(няма)</li>'}</ul>
          </div>
          <script>window.onload = () => window.print()</script>
        </body>
      </html>`;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  if (!visit) return <main className="p-6 max-w-3xl mx-auto">Зареждане...</main>;
  const isFinalized = visit.status !== "draft";

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">{brand.nameBg}: Посещение</h1>
      <form onSubmit={onSave} className="grid md:grid-cols-4 gap-2">
        <div className="md:col-span-2">
          <Label>Собственик</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between" disabled={isFinalized}>
                {ownerId ? (owners ?? []).find((o) => o._id === ownerId)?.name : "Изберете собственик"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
              <Command>
                <CommandInput placeholder="Търси собственик..." value={ownerSearch} onValueChange={setOwnerSearch} />
                <CommandList>
                  <CommandEmpty>Няма резултати</CommandEmpty>
                  {(owners ?? []).map((o) => (
                    <CommandItem key={o._id} value={o._id} onSelect={(v) => { setOwnerId(v); setAnimalId(null); }}>
                      {o.name}{o.phone ? ` · ${o.phone}` : ""}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="md:col-span-2">
          <Label>Животно</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between" disabled={isFinalized}>
                {animalId ? (animals ?? []).find((a) => a._id === animalId)?.name : "Без животно"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
              <Command>
                <CommandInput placeholder="Търси животно..." value={animalSearch} onValueChange={setAnimalSearch} />
                <CommandList>
                  <CommandEmpty>Няма резултати</CommandEmpty>
                  {(animals ?? []).filter((an) => !ownerId || String(an.ownerId) === String(ownerId)).map((an) => (
                    <CommandItem key={an._id} value={an._id} onSelect={(v) => { if (isFinalized) return; setAnimalId(v); const chosen = (animals ?? []).find((x) => x._id === v); if (chosen?.ownerId) setOwnerId(String(chosen.ownerId)); }}>
                      {an.name} ({an.species})
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="md:col-span-4 grid md:grid-cols-4 gap-2">
          <div>
            <Label>Статус</Label>
            <div className="h-10 flex items-center px-3 rounded-md border text-sm bg-muted/30">
              {visit.status === "draft" ? "Чернова" : visit.status === "finalized" ? "Приключено" : visit.status}
            </div>
          </div>
          <div>
            <Label htmlFor="datetime">Дата/час</Label>
            <Input id="datetime" type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} disabled={isFinalized} />
          </div>
          <div className="md:col-span-2">
            <Label>Създадено</Label>
            <div className="h-10 flex items-center px-3 rounded-md border text-sm bg-muted/30">
              {fmtDateTimeBG(visit.createdAt)}
            </div>
          </div>
          <div>
            <Label htmlFor="s">S - Субективно</Label>
            <Textarea id="s" value={s} onChange={(e) => setS(e.target.value)} disabled={isFinalized} />
          </div>
          <div>
            <Label htmlFor="o">O - Обективно</Label>
            <Textarea id="o" value={o} onChange={(e) => setO(e.target.value)} disabled={isFinalized} />
          </div>
          <div>
            <Label htmlFor="a">A - Оценка</Label>
            <Textarea id="a" value={a} onChange={(e) => setA(e.target.value)} disabled={isFinalized} />
          </div>
          <div>
            <Label htmlFor="p">P - План</Label>
            <Textarea id="p" value={p} onChange={(e) => setP(e.target.value)} disabled={isFinalized} />
          </div>
        </div>
        <div className="md:col-span-4 grid md:grid-cols-2 gap-4">
          <div>
            <Label>Процедури</Label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  value={procInput}
                  onChange={(e) => setProcInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (isFinalized) return;
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = procInput.trim();
                      if (!v) return;
                      setProcedures((arr) => (arr.includes(v) ? arr : [...arr, v]));
                      setProcInput("");
                    }
                  }}
                  placeholder="напр. Ваксинация"
                  disabled={isFinalized}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (isFinalized) return;
                  const v = procInput.trim();
                  if (!v) return;
                  setProcedures((arr) => (arr.includes(v) ? arr : [...arr, v]));
                  setProcInput("");
                }}
                disabled={isFinalized}
              >
                Добави
              </Button>
            </div>
            {(procedureSuggestions ?? []).length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {(procedureSuggestions ?? []).map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-1 hover:bg-accent"
                    onClick={() => { if (isFinalized) return; setProcedures((arr) => (arr.includes(name) ? arr : [...arr, name])); }}
                    disabled={isFinalized}
                  >{name}</button>
                ))}
              </div>
            ) : null}
            <ul className="mt-2 space-y-1 text-sm">
              {procedures.map((pr, i) => (
                <li key={i} className="flex justify-between">
                  <span>{pr}</span>
                  <Button type="button" variant="ghost" onClick={() => setProcedures((arr) => arr.filter((_, idx) => idx !== i))} disabled={isFinalized}>Премахни</Button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Label>Медикаменти</Label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  value={medInput}
                  onChange={(e) => setMedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (isFinalized) return;
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = medInput.trim();
                      if (!v) return;
                      setMedications((arr) => (arr.includes(v) ? arr : [...arr, v]));
                      setMedInput("");
                    }
                  }}
                  placeholder="напр. Амоксицилин"
                  disabled={isFinalized}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (isFinalized) return;
                  const v = medInput.trim();
                  if (!v) return;
                  setMedications((arr) => (arr.includes(v) ? arr : [...arr, v]));
                  setMedInput("");
                }}
                disabled={isFinalized}
              >
                Добави
              </Button>
            </div>
            {(medicationSuggestions ?? []).length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {(medicationSuggestions ?? []).map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-1 hover:bg-accent"
                    onClick={() => { if (isFinalized) return; setMedications((arr) => (arr.includes(name) ? arr : [...arr, name])); }}
                    disabled={isFinalized}
                  >{name}</button>
                ))}
              </div>
            ) : null}
            <ul className="mt-2 space-y-1 text-sm">
              {medications.map((md, i) => (
                <li key={i} className="flex justify-between">
                  <span>{md}</span>
                  <Button type="button" variant="ghost" onClick={() => setMedications((arr) => arr.filter((_, idx) => idx !== i))} disabled={isFinalized}>Премахни</Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="md:col-span-4 flex gap-2">
          <Button type="submit" disabled={isFinalized}>Запази</Button>
          <Button type="button" variant="outline" onClick={onFinalize} disabled={visit.status !== "draft"} aria-label="Приключи посещението">
            <CalendarCheck className="mr-1 size-4" aria-hidden /> Приключи
          </Button>
          <Button type="button" variant="secondary" onClick={onDuplicate} aria-label="Дублирай посещението">
            <FilePlus className="mr-1 size-4" aria-hidden /> Дублирай
          </Button>
          <Button type="button" variant="ghost" onClick={onPrint} aria-label="Печат на посещението">
            <Printer className="mr-1 size-4" aria-hidden /> Печат
          </Button>
          <VisitPdfButton
            visit={visit}
            soap={{ s, o, a, p }}
            procedures={procedures}
            medications={medications}
            fileName={`visit-${(visit as VisitDoc & { code?: string }).code ?? String(visit._id)}.pdf`}
          />
          <a
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-accent"
            href={`/invoices/new?ownerId=${encodeURIComponent(visit.ownerId)}${visit.animalId ? `&animalId=${encodeURIComponent(visit.animalId)}` : ""}&visitId=${encodeURIComponent(visit._id)}`}
          >
            <FilePlus className="mr-1 size-4" aria-hidden /> Нова фактура
          </a>
          <Button type="button" variant="ghost" onClick={() => router.back()}>Назад</Button>
        </div>
      </form>
    </main>
  );
}
