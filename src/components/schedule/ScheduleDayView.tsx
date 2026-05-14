"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { formatTimeRange } from "@/lib/format";
import type { ScheduleSlot } from "@/types/schedule";
import {
  getDayTimelineModel,
  isWorkingDay,
  constrainSlotMove,
  constrainSlotResizeEnd,
  snapMsTo15Min,
  type TimeRangeMs,
} from "@/lib/schedule";

const PIXELS_PER_HOUR = 88;
const DRAFT_SLOT_ID = "__draft__";
const DEFAULT_NEW_DURATION_MS = 30 * 60 * 1000;
const CLICK_MOVE_THRESHOLD_PX = 6;

type TimedItem = { id: string; start: number; end: number };

function assignOverlapColumns(items: TimedItem[]): Map<
  string,
  { col: number; colCount: number }
> {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const columnEnds: number[] = [];
  const colById = new Map<string, number>();
  for (const item of sorted) {
    let col = columnEnds.findIndex((end) => end <= item.start);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(item.end);
    } else {
      columnEnds[col] = item.end;
    }
    colById.set(item.id, col);
  }
  const colCount = Math.max(1, columnEnds.length);
  const result = new Map<string, { col: number; colCount: number }>();
  for (const item of sorted) {
    result.set(item.id, {
      col: colById.get(item.id) ?? 0,
      colCount,
    });
  }
  return result;
}

function halfHourTicks(
  timelineStartMs: number,
  timelineEndMs: number,
): number[] {
  const d = new Date(timelineStartMs);
  d.setSeconds(0, 0);
  const mins = d.getMinutes();
  const stepUp = mins % 30 === 0 ? 0 : 30 - (mins % 30);
  let cur = d.getTime() + stepUp * 60 * 1000;
  const out: number[] = [];
  while (cur <= timelineEndMs) {
    out.push(cur);
    cur += 30 * 60 * 1000;
  }
  return out;
}

function hourLabels(timelineStartMs: number, timelineEndMs: number): number[] {
  const d = new Date(timelineStartMs);
  d.setMinutes(0, 0, 0);
  if (d.getTime() < timelineStartMs) {
    d.setHours(d.getHours() + 1);
  }
  const out: number[] = [];
  let cur = d.getTime();
  while (cur <= timelineEndMs) {
    out.push(cur);
    cur += 60 * 60 * 1000;
  }
  return out;
}

function formatHourLabel(ms: number): string {
  return new Intl.DateTimeFormat("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function yToMs(
  clientY: number,
  rectTop: number,
  timelineStartMs: number,
  totalMs: number,
  totalHeightPx: number,
): number {
  const y = clientY - rectTop;
  const ratio = Math.max(0, Math.min(1, y / totalHeightPx));
  return timelineStartMs + ratio * totalMs;
}

export type ScheduleDayViewProps = {
  date: Date;
  slots: ScheduleSlot[] | undefined;
  draftRange: TimeRangeMs | null;
  selectedSlotId: string | null;
  readOnly: boolean;
  scrollSessionKey: string;
  onDraftRangeChange: (range: TimeRangeMs | null) => void;
  onRequestNewDraft: (range: TimeRangeMs) => void;
  onSelectSlot: (slotId: string | null) => void;
  onSlotTimeCommit: (slotId: string, range: TimeRangeMs) => Promise<void>;
};

type MoveDrag = {
  kind: "move";
  pointerId: number;
  slotId: string;
  originStart: number;
  originEnd: number;
  pointerStartY: number;
};

type ResizeDrag = {
  kind: "resize";
  pointerId: number;
  slotId: string;
  originStart: number;
  originEnd: number;
  pointerStartY: number;
};

type ActiveDrag = MoveDrag | ResizeDrag;

export function ScheduleDayView({
  date,
  slots,
  draftRange,
  selectedSlotId,
  readOnly,
  scrollSessionKey,
  onDraftRangeChange,
  onRequestNewDraft,
  onSelectSlot,
  onSlotTimeCommit,
}: ScheduleDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const model = useMemo(() => getDayTimelineModel(date), [date]);
  const totalMs = model ? model.timelineEndMs - model.timelineStartMs : 0;
  const totalHeightPx = useMemo(
    () => (totalMs / (60 * 60 * 1000)) * PIXELS_PER_HOUR,
    [totalMs],
  );

  const halfTicks = useMemo(
    () =>
      model
        ? halfHourTicks(model.timelineStartMs, model.timelineEndMs)
        : [],
    [model],
  );
  const hourMarkMs = useMemo(
    () =>
      model ? hourLabels(model.timelineStartMs, model.timelineEndMs) : [],
    [model],
  );

  const msToY = useCallback(
    (ms: number) =>
      ((ms - (model?.timelineStartMs ?? 0)) / totalMs) * totalHeightPx,
    [model?.timelineStartMs, totalMs, totalHeightPx],
  );

  const peers = useMemo(() => slots ?? [], [slots]);
  const [drag, setDrag] = useState<ActiveDrag | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    pointerId: number;
    slotId: string;
    originStart: number;
    originEnd: number;
    pointerStartY: number;
  } | null>(null);
  const [previewById, setPreviewById] = useState<
    Record<string, TimeRangeMs | undefined>
  >({});
  const dragPreviewRef = useRef<Partial<Record<string, TimeRangeMs>>>({});
  const gridInteractRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    didDrag: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !model) return;
    let targetY = 0;
    if (isToday(date)) {
      const now = Date.now();
      if (now >= model.timelineStartMs && now <= model.timelineEndMs) {
        const ny = msToY(now);
        targetY = ny - el.clientHeight / 3;
      }
    }
    el.scrollTop = Math.max(0, targetY);
  }, [scrollSessionKey, model, date, msToY]);

  const timedForLayout = useMemo(() => {
    const list: TimedItem[] = peers.map((s) => ({
      id: s._id,
      start: s.startTime,
      end: s.endTime,
    }));
    if (draftRange) {
      list.push({
        id: DRAFT_SLOT_ID,
        start: draftRange.startTime,
        end: draftRange.endTime,
      });
    }
    for (const [id, pr] of Object.entries(previewById)) {
      if (!pr) continue;
      const idx = list.findIndex((x) => x.id === id);
      if (idx >= 0) {
        list[idx] = { id, start: pr.startTime, end: pr.endTime };
      }
    }
    return list;
  }, [peers, draftRange, previewById]);

  const layout = useMemo(
    () => assignOverlapColumns(timedForLayout),
    [timedForLayout],
  );

  const applyMovePreview = useCallback(
    (slotId: string, clientY: number, d: MoveDrag) => {
      if (!model) return;
      const desiredStart = snapMsTo15Min(
        d.originStart +
          ((clientY - d.pointerStartY) / totalHeightPx) * totalMs,
      );
      const duration = d.originEnd - d.originStart;
      const exclude =
        slotId === DRAFT_SLOT_ID ? undefined : slotId;
      const next = constrainSlotMove(
        date,
        desiredStart,
        duration,
        peers,
        exclude,
      );
      if (next) {
        dragPreviewRef.current[slotId] = next;
        setPreviewById((p) => ({
          ...p,
          [slotId]: { startTime: next.startTime, endTime: next.endTime },
        }));
      }
    },
    [date, model, peers, totalHeightPx, totalMs],
  );

  const applyResizePreview = useCallback(
    (slotId: string, clientY: number, d: ResizeDrag) => {
      if (!model) return;
      const desiredEnd = snapMsTo15Min(
        d.originEnd + ((clientY - d.pointerStartY) / totalHeightPx) * totalMs,
      );
      const exclude =
        slotId === DRAFT_SLOT_ID ? undefined : slotId;
      const next = constrainSlotResizeEnd(
        date,
        d.originStart,
        desiredEnd,
        peers,
        exclude,
      );
      if (next) {
        dragPreviewRef.current[slotId] = next;
        setPreviewById((p) => ({
          ...p,
          [slotId]: { startTime: next.startTime, endTime: next.endTime },
        }));
      }
    },
    [date, model, peers, totalHeightPx, totalMs],
  );

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      if (drag.kind === "move") {
        applyMovePreview(drag.slotId, e.clientY, drag);
      } else {
        applyResizePreview(drag.slotId, e.clientY, drag);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const slotId = drag.slotId;
      const preview = dragPreviewRef.current[slotId];
      delete dragPreviewRef.current[slotId];
      setDrag(null);
      setPreviewById((p) => {
        const next = { ...p };
        delete next[slotId];
        return next;
      });
      if (
        preview &&
        (preview.startTime !== drag.originStart ||
          preview.endTime !== drag.originEnd)
      ) {
        if (slotId === DRAFT_SLOT_ID) {
          onDraftRangeChange(preview);
        } else if (!readOnly) {
          void onSlotTimeCommit(slotId, preview);
        }
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [
    drag,
    onDraftRangeChange,
    onSlotTimeCommit,
    readOnly,
    applyMovePreview,
    applyResizePreview,
  ]);

  useEffect(() => {
    if (!pendingMove) return;
    const pm = pendingMove;
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pm.pointerId) return;
      if (
        Math.abs(e.clientY - pm.pointerStartY) > CLICK_MOVE_THRESHOLD_PX
      ) {
        setPendingMove(null);
        const d: MoveDrag = {
          kind: "move",
          pointerId: pm.pointerId,
          slotId: pm.slotId,
          originStart: pm.originStart,
          originEnd: pm.originEnd,
          pointerStartY: pm.pointerStartY,
        };
        setDrag(d);
        applyMovePreview(pm.slotId, e.clientY, d);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pm.pointerId) return;
      setPendingMove(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [pendingMove, applyMovePreview]);

  const overlapsLunch = useCallback(
    (startMs: number, endMs: number) => {
      if (!model) return true;
      return model.lunchBlocks.some((b) =>
        startMs < b.endMs && endMs > b.startMs,
      );
    },
    [model],
  );

  const handleGridPointerDown = (e: React.PointerEvent) => {
    if (readOnly || e.button !== 0) return;
    if (e.target !== gridRef.current) return;
    gridInteractRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      didDrag: false,
    };
  };

  const handleGridPointerMove = (e: React.PointerEvent) => {
    const g = gridInteractRef.current;
    if (!g || e.pointerId !== g.pointerId) return;
    if (
      Math.abs(e.clientX - g.startX) > CLICK_MOVE_THRESHOLD_PX ||
      Math.abs(e.clientY - g.startY) > CLICK_MOVE_THRESHOLD_PX
    ) {
      g.didDrag = true;
    }
  };

  const handleGridPointerUp = (e: React.PointerEvent) => {
    const g = gridInteractRef.current;
    if (!g || e.pointerId !== g.pointerId) return;
    gridInteractRef.current = null;
    if (g.didDrag || readOnly || !model || !gridRef.current) return;
    if (e.target !== gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const t = snapMsTo15Min(
      yToMs(e.clientY, rect.top, model.timelineStartMs, totalMs, totalHeightPx),
    );
    const end = t + DEFAULT_NEW_DURATION_MS;
    if (!overlapsLunch(t, end)) {
      const valid = constrainSlotMove(
        date,
        t,
        DEFAULT_NEW_DURATION_MS,
        peers,
        undefined,
      );
      if (valid) {
        onSelectSlot(null);
        onRequestNewDraft(valid);
      }
    }
  };

  const startResize = (
    e: React.PointerEvent,
    slotId: string,
    start: number,
    end: number,
  ) => {
    if (readOnly) return;
    e.stopPropagation();
    setPendingMove(null);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      kind: "resize",
      pointerId: e.pointerId,
      slotId,
      originStart: start,
      originEnd: end,
      pointerStartY: e.clientY,
    });
    applyResizePreview(slotId, e.clientY, {
      kind: "resize",
      pointerId: e.pointerId,
      slotId,
      originStart: start,
      originEnd: end,
      pointerStartY: e.clientY,
    });
  };

  if (!isWorkingDay(date) || !model) {
    return (
      <div className="text-muted-foreground rounded-md border p-6 text-sm">
        Не е работен ден за избраната дата.
      </div>
    );
  }

  if (slots === undefined) {
    return (
      <div className="bg-muted/40 h-64 animate-pulse rounded-md border" />
    );
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-[min(70vh,880px)] overflow-y-auto rounded-md border bg-card"
    >
      <div className="flex" style={{ minHeight: totalHeightPx }}>
        <div
          className="relative shrink-0 border-r bg-muted/20"
          style={{ width: 52, height: totalHeightPx }}
        >
          {hourMarkMs.map((ms) => (
            <div
              key={ms}
              className="text-muted-foreground absolute right-1 text-[11px] leading-none"
              style={{ top: msToY(ms) - 6 }}
            >
              {formatHourLabel(ms)}
            </div>
          ))}
        </div>
        <div
          ref={gridRef}
          className="relative min-w-0 flex-1"
          style={{
            height: totalHeightPx,
            touchAction: drag ? "none" : "pan-y",
          }}
          onPointerDown={handleGridPointerDown}
          onPointerMove={handleGridPointerMove}
          onPointerUp={handleGridPointerUp}
          onPointerCancel={() => {
            gridInteractRef.current = null;
          }}
        >
          {model.lunchBlocks.map((b) => (
            <div
              key={`${b.startMs}-${b.endMs}`}
              className="bg-muted/60 pointer-events-none absolute inset-x-0 z-0 border-y border-dashed border-muted-foreground/20"
              style={{
                top: msToY(b.startMs),
                height: Math.max(1, msToY(b.endMs) - msToY(b.startMs)),
              }}
            />
          ))}

          {halfTicks.map((ms) => {
            const isHour = new Date(ms).getMinutes() === 0;
            return (
              <div
                key={ms}
                className={cn(
                  "pointer-events-none absolute inset-x-0 z-0 border-muted-foreground/25",
                  isHour ? "border-t" : "border-t border-dashed opacity-50",
                )}
                style={{ top: msToY(ms) }}
              />
            );
          })}

          {isToday(date) &&
            Date.now() >= model.timelineStartMs &&
            Date.now() <= model.timelineEndMs && (
              <div
                className="pointer-events-none absolute right-0 left-0 z-20 border-t-2 border-red-500"
                style={{ top: msToY(Date.now()) }}
              />
            )}

          {peers.map((slot) => {
            const lo = layout.get(slot._id) ?? { col: 0, colCount: 1 };
            const pr = previewById[slot._id];
            const start = pr?.startTime ?? slot.startTime;
            const end = pr?.endTime ?? slot.endTime;
            const top = msToY(start);
            const h = Math.max(24, msToY(end) - top);
            const wPct = 100 / lo.colCount;
            const leftPct = lo.col * wPct;
            const selected = selectedSlotId === slot._id;
            return (
              <div
                key={slot._id}
                role="button"
                tabIndex={0}
                className={cn(
                  "absolute z-10 flex select-none flex-col overflow-hidden rounded border bg-primary/15 px-1 pt-1 text-left text-xs shadow-sm",
                  selected && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                  readOnly && "cursor-default opacity-90",
                  !readOnly && "cursor-grab active:cursor-grabbing",
                )}
                style={{
                  top,
                  height: h,
                  left: `calc(${leftPct}% + 2px)`,
                  width: `calc(${wPct}% - 4px)`,
                }}
                onPointerDown={(e) => {
                  if (readOnly) return;
                  e.stopPropagation();
                  onSelectSlot(slot._id);
                  setPendingMove({
                    pointerId: e.pointerId,
                    slotId: slot._id,
                    originStart: start,
                    originEnd: end,
                    pointerStartY: e.clientY,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectSlot(slot._id);
                  }
                }}
              >
                <div className="pointer-events-none min-h-0 flex-1">
                  <div className="truncate font-medium">{slot.title}</div>
                  <div className="text-muted-foreground truncate text-[10px] sm:text-xs">
                    {formatTimeRange(start, end)}
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    aria-label="Промени продължителност"
                    className="hover:bg-primary/20 absolute right-0 bottom-0 left-0 h-2 cursor-ns-resize touch-none border-t border-primary/30"
                    onPointerDown={(e) =>
                      startResize(e, slot._id, start, end)
                    }
                  />
                )}
              </div>
            );
          })}

          {draftRange && (() => {
            const lo = layout.get(DRAFT_SLOT_ID) ?? { col: 0, colCount: 1 };
            const pr = previewById[DRAFT_SLOT_ID];
            const start = pr?.startTime ?? draftRange.startTime;
            const end = pr?.endTime ?? draftRange.endTime;
            const top = msToY(start);
            const h = Math.max(24, msToY(end) - top);
            const wPct = 100 / lo.colCount;
            const leftPct = lo.col * wPct;
            return (
              <div
                key={DRAFT_SLOT_ID}
                className={cn(
                  "absolute z-10 flex select-none flex-col overflow-hidden rounded border-2 border-dashed border-primary/60 bg-primary/10 px-1 pt-1 text-xs",
                  !readOnly && "cursor-grab active:cursor-grabbing",
                )}
                style={{
                  top,
                  height: h,
                  left: `calc(${leftPct}% + 2px)`,
                  width: `calc(${wPct}% - 4px)`,
                }}
                onPointerDown={(e) => {
                  if (readOnly) return;
                  e.stopPropagation();
                  setPendingMove({
                    pointerId: e.pointerId,
                    slotId: DRAFT_SLOT_ID,
                    originStart: start,
                    originEnd: end,
                    pointerStartY: e.clientY,
                  });
                }}
              >
                <div className="pointer-events-none min-h-0 flex-1">
                  <div className="truncate font-medium">Нов слот</div>
                  <div className="text-muted-foreground truncate text-[10px] sm:text-xs">
                    {formatTimeRange(start, end)}
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    aria-label="Промени продължителност"
                    className="hover:bg-primary/25 absolute right-0 bottom-0 left-0 h-2 cursor-ns-resize touch-none border-t border-primary/40"
                    onPointerDown={(e) =>
                      startResize(e, DRAFT_SLOT_ID, start, end)
                    }
                  />
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
