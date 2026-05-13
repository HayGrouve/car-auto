"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { fmtDateTimeBG } from "@/lib/format";
import { VisitStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Car, GripVertical } from "lucide-react";

export type KanbanVisitRow = {
  _id: string;
  code: string | null;
  datetime: number;
  status: string;
  customerId: string | null;
  customerName: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
};

const COLUMNS: { id: string; title: string }[] = [
  { id: "draft", title: "Ново" },
  { id: "in_progress", title: "В работа" },
  { id: "ready", title: "Готов" },
  { id: "finalized", title: "Приключени (7 дни)" },
];

function KanbanColumnDropZone({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-muted/40 flex min-h-[280px] flex-col rounded-lg border p-2",
        isOver && "ring-primary ring-2 ring-offset-2",
      )}
    >
      <h3 className="text-muted-foreground mb-2 flex items-center gap-2 px-1 text-sm font-semibold">
        <span>{title}</span>
      </h3>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

function KanbanVisitCard({ visit }: { visit: KanbanVisitRow }) {
  const locked = visit.status === "finalized";
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: visit._id,
      disabled: locked,
    });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card rounded-md border shadow-sm",
        isDragging && "z-10 opacity-90",
        locked && "opacity-95",
      )}
    >
      <div className="flex gap-1 p-2">
        {!locked ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mt-0.5 cursor-grab touch-none p-1 active:cursor-grabbing"
            aria-label="Премести посещение"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="size-4" />
          </button>
        ) : (
          <span className="w-6 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            href={`/visits/${visit._id}`}
            className="font-medium leading-snug underline-offset-2 hover:underline"
          >
            {visit.code ?? `#${visit._id}`}
          </Link>
          <div className="text-muted-foreground text-xs">
            {fmtDateTimeBG(visit.datetime)}
          </div>
          {visit.customerName ? (
            <div className="truncate text-xs">{visit.customerName}</div>
          ) : null}
          {visit.vehiclePlate ? (
            <div className="flex items-center gap-1 text-xs">
              <Car className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{visit.vehiclePlate}</span>
            </div>
          ) : null}
          <VisitStatusBadge status={visit.status} />
        </div>
      </div>
    </div>
  );
}

export function VisitsKanbanBoard() {
  const rows = useQuery(api.visits.kanbanBoard, {}) as
    | KanbanVisitRow[]
    | undefined;
  const updateVisit = useMutation(api.visits.update);
  const finalizeVisit = useMutation(api.visits.finalize);

  const [finalizeId, setFinalizeId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
  );

  const byColumn = useMemo(() => {
    const map = new Map<string, KanbanVisitRow[]>();
    for (const c of COLUMNS) map.set(c.id, []);
    for (const v of rows ?? []) {
      const stRaw = v.status;
      const st =
        stRaw === "in_progress" ||
        stRaw === "ready" ||
        stRaw === "draft" ||
        stRaw === "finalized"
          ? stRaw
          : "draft";
      const list = map.get(st);
      if (list) list.push({ ...v, status: st });
    }
    return map;
  }, [rows]);

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const visitId = String(active.id);
      const targetStatus = String(over.id);
      const visit = (rows ?? []).find((r) => r._id === visitId);
      if (!visit || visit.status === "finalized") return;
      if (visit.status === targetStatus) return;

      if (targetStatus === "finalized") {
        setFinalizeId(visitId);
        return;
      }

      if (!["draft", "in_progress", "ready"].includes(targetStatus)) {
        return;
      }

      try {
        await updateVisit({
          id: visitId as Id<"visits">,
          status: targetStatus,
        });
        toast.success("Статусът е обновен");
      } catch (e) {
        console.error(e);
        toast.error(
          e instanceof Error ? e.message : "Грешка при промяна на статуса",
        );
      }
    },
    [rows, updateVisit],
  );

  async function confirmFinalize() {
    if (!finalizeId) return;
    try {
      const res = await finalizeVisit({ id: finalizeId as Id<"visits"> });
      if (res?.ok) {
        toast.success("Посещението е приключено");
      } else {
        toast.error("Неуспешно приключване");
      }
    } catch (e) {
      console.error(e);
      toast.error("Грешка при приключване");
    } finally {
      setFinalizeId(null);
    }
  }

  if (rows === undefined) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        Зареждане на таблото…
      </div>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <KanbanColumnDropZone key={col.id} id={col.id} title={col.title}>
              {(byColumn.get(col.id) ?? []).map((visit) => (
                <KanbanVisitCard key={visit._id} visit={visit} />
              ))}
              {(byColumn.get(col.id) ?? []).length === 0 ? (
                <div className="text-muted-foreground flex flex-1 items-center justify-center px-2 py-8 text-center text-xs">
                  Няма посещения
                </div>
              ) : null}
            </KanbanColumnDropZone>
          ))}
        </div>
      </DndContext>

      <AlertDialog
        open={finalizeId !== null}
        onOpenChange={(open) => {
          if (!open) setFinalizeId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Приключване на посещение</AlertDialogTitle>
            <AlertDialogDescription>
              Сигурни ли сте? След приключване посещението се заключва и не може
              да се редактира. Това действие не може да се отмени.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline">
                Отказ
              </Button>
            </AlertDialogCancel>
            <Button type="button" onClick={() => void confirmFinalize()}>
              Приключи
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
