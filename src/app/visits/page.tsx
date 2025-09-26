"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";
import { toast } from "sonner";
import { CalendarCheck } from "lucide-react";
import type { VisitDoc } from "@/types/visit";

export default function VisitsPage() {
  const visits = useQuery(api.visits.list, useMemo(() => ({ limit: 50 }), [])) as VisitDoc[] | undefined;
  const createVisit = useMutation(api.visits.create) as unknown as (args: { ownerId: string; animalId?: string; soap: { s?: string; o?: string; a?: string; p?: string } }) => Promise<{ ok: boolean }>;
  const finalizeVisit = useMutation(api.visits.finalize) as unknown as (args: { id: string }) => Promise<{ ok: boolean }>;

  const [ownerId, setOwnerId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [s, setS] = useState("");
  const [o, setO] = useState("");
  const [a, setA] = useState("");
  const [p, setP] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId) {
      toast.error("Изберете собственик (ownerId)");
      return;
    }
    const res = await createVisit({ ownerId, animalId: animalId || undefined, soap: { s, o, a, p } });
    if (res?.ok) {
      toast.success("Посещението е създадено");
      setS(""); setO(""); setA(""); setP("");
    }
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <CalendarCheck className="size-5 text-primary" />
        <h1 className="text-2xl font-semibold">{brand.nameBg}: Посещения</h1>
      </div>

      <form onSubmit={onCreate} className="grid md:grid-cols-4 gap-2">
        <input className="border rounded-md px-3 h-10" placeholder="ownerId (временно)" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} />
        <input className="border rounded-md px-3 h-10" placeholder="animalId (по избор)" value={animalId} onChange={(e) => setAnimalId(e.target.value)} />
        <div className="md:col-span-4 grid md:grid-cols-4 gap-2">
          <textarea className="border rounded-md p-2" placeholder="S - Субективно" value={s} onChange={(e) => setS(e.target.value)} />
          <textarea className="border rounded-md p-2" placeholder="O - Обективно" value={o} onChange={(e) => setO(e.target.value)} />
          <textarea className="border rounded-md p-2" placeholder="A - Оценка" value={a} onChange={(e) => setA(e.target.value)} />
          <textarea className="border rounded-md p-2" placeholder="P - План" value={p} onChange={(e) => setP(e.target.value)} />
        </div>
        <div className="md:col-span-4"><Button type="submit">Ново посещение</Button></div>
      </form>

      <div className="border rounded-md divide-y">
        {(visits ?? []).map((v) => (
          <div key={v._id} className="p-3 flex items-center justify-between text-sm">
            <div className="space-y-1">
              <div className="font-medium">#{String(v._id)} - {new Date(v.createdAt).toLocaleString()}</div>
              <div className="text-muted-foreground">Статус: {v.status}</div>
            </div>
            {v.status === "draft" ? (
              <Button variant="outline" onClick={async () => { const r = await finalizeVisit({ id: v._id }); if (r?.ok) toast.success("Приключено"); }}>
                Приключи
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
}


