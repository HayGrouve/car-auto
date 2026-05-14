"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import { ScheduleDayView } from "@/components/schedule/ScheduleDayView";
import { ScheduleSlotForm } from "@/components/schedule/ScheduleSlotForm";
import { formatScheduleDate } from "@/lib/format";
import { startOfDay } from "date-fns";
import { isPastDate, type TimeRangeMs } from "@/lib/schedule";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";
import { type ScheduleSlot, parseScheduleSlot } from "@/types/schedule";
import {
  parseCalendarKindParam,
  calendarKindLabelBg,
  CALENDAR_KINDS,
  type CalendarKind,
} from "@/lib/calendar-kind";
import type { Id } from "@/../convex/_generated/dataModel";
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

export default function SchedulePage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-6xl p-6">Зареждане...</div>}
    >
      <SchedulePageContent />
    </Suspense>
  );
}

function SchedulePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const calendarKind: CalendarKind =
    parseCalendarKindParam(searchParams.get("calendar")) ?? "workshop";

  const updateCalendarKind = (kind: CalendarKind) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("calendar", kind);
    router.replace(`${pathname}?${p.toString()}`);
  };
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    // Check if there's a date parameter in the URL
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    return new Date();
  });
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotToDelete, setSlotToDelete] = useState<ScheduleSlot | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [draftRange, setDraftRange] = useState<TimeRangeMs | null>(null);

  const dateTimestamp = useMemo(() => {
    if (!selectedDate) return undefined;
    return startOfDay(selectedDate).getTime();
  }, [selectedDate]);

  const rawSlots = useQuery(
    api.schedule.getByDate,
    dateTimestamp !== undefined
      ? { date: dateTimestamp, calendarKind }
      : "skip",
  );

  const slots = useMemo(() => {
    if (!rawSlots) return undefined;
    return rawSlots.map((s) => parseScheduleSlot(s));
  }, [rawSlots]);

  const editingSlot = useMemo(() => {
    if (!editingSlotId || !slots) return null;
    return slots.find((s) => s._id === editingSlotId) ?? null;
  }, [editingSlotId, slots]);

  useEffect(() => {
    if (editingSlotId && slots !== undefined && !editingSlot) {
      setEditingSlotId(null);
    }
  }, [editingSlotId, slots, editingSlot]);

  useEffect(() => {
    setDraftRange(null);
    setEditingSlotId(null);
  }, [selectedDate, calendarKind]);

  const createSlot = useMutation(api.schedule.create);
  const updateSlot = useMutation(api.schedule.update);
  const removeSlot = useMutation(api.schedule.remove);

  // Get all slots for calendar indicators
  const allSlots = useQuery(api.schedule.list, {}) as
    | ScheduleSlot[]
    | undefined;

  const slotsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    if (allSlots) {
      allSlots.forEach((slot) => {
        const dateStr = new Date(slot.date).toISOString().split("T")[0];
        if (dateStr) {
          map[dateStr] = (map[dateStr] ?? 0) + 1;
        }
      });
    }
    return map;
  }, [allSlots]);

  // Fetch related data for form
  const customersQuery = useQuery(
    api.customers.list,
    useMemo(() => ({ search: "" }), []),
  );
  const customersResult = customersQuery as
    | { items: { _id: string; name: string; phone?: string }[]; total: number; hasMore: boolean }
    | undefined;
  const customers = customersResult?.items;

  const vehiclesQuery = useQuery(
    api.vehicles.list,
    useMemo(() => ({ search: "", limit: 1000, sort: "createdAtDesc" }), []),
  );
  const vehiclesResult = vehiclesQuery as
    | {
        items: { _id: string; licensePlate: string; make: string; customerId?: string | null }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const vehicles = vehiclesResult?.items;

  const visitsQuery = useQuery(
    api.visits.list,
    useMemo(() => ({ limit: 1000, sort: "datetimeDesc" }), []),
  );
  const visitsResult = visitsQuery as
    | {
        items: { _id: string; code?: string | null; vehicleId?: string | null; status?: string }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const visits = visitsResult?.items;

  // Query for draft visits to create vehicle -> draft visit map
  const draftVisitsQuery = useQuery(
    api.visits.list,
    useMemo(
      () => ({
        statuses: ["draft", "in_progress", "ready"],
        limit: 1000,
      }),
      [],
    ),
  );
  const draftVisitsResult = draftVisitsQuery as
    | {
        items: { _id: string; vehicleId?: string | null }[];
        total: number;
        hasMore: boolean;
      }
    | undefined;
  const draftVisits = draftVisitsResult?.items;

  // Create a map of vehicleId -> draft visit ID
  const vehicleDraftVisitMap = useMemo(() => {
    const map = new Map<string, string>();
    if (draftVisits) {
      draftVisits.forEach((visit) => {
        if (visit.vehicleId) {
          map.set(String(visit.vehicleId), visit._id);
        }
      });
    }
    return map;
  }, [draftVisits]);

  const handleCreate = async (data: {
    date: number;
    startTime: number;
    endTime: number;
    title: string;
    calendarKind: CalendarKind;
    description?: string;
    visitId?: Id<"visits">;
    customerId?: Id<"customers">;
    vehicleId?: Id<"vehicles">;
    status?: "scheduled" | "completed" | "cancelled";
  }) => {
    try {
      const res = await createSlot(data);
      if (res?.ok) {
        toast.success("Слотът е добавен успешно");
        setShowCreatePanel(false);
        setDraftRange(null);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Грешка при добавяне на слот",
      );
      throw error;
    }
  };

  const handleUpdate = async (data: {
    date?: number;
    startTime?: number;
    endTime?: number;
    title?: string;
    description?: string;
    visitId?: Id<"visits">;
    customerId?: Id<"customers">;
    vehicleId?: Id<"vehicles">;
    status?: "scheduled" | "completed" | "cancelled";
  }) => {
    if (!editingSlot) return;
    try {
      const res = await updateSlot({
        id: editingSlot._id as Id<"schedule">,
        ...data,
      });
      if (res?.ok) {
        toast.success("Слотът е обновен успешно");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Грешка при обновяване на слот",
      );
      throw error;
    }
  };

  const handleSlotTimeCommit = async (slotId: string, range: TimeRangeMs) => {
    if (!selectedDate || dateTimestamp === undefined) return;
    if (isPastDate(selectedDate)) {
      toast.error("Не можете да променяте слотове за минали дни");
      return;
    }
    try {
      const res = await updateSlot({
        id: slotId as Id<"schedule">,
        date: dateTimestamp,
        startTime: range.startTime,
        endTime: range.endTime,
      });
      if (!res?.ok) {
        toast.error("Неуспешно преместване на слота");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Грешка при обновяване на слот",
      );
    }
  };

  const handleTimelineSelectSlot = (slotId: string | null) => {
    if (selectedDate && isPastDate(selectedDate)) {
      return;
    }
    if (slotId) {
      setEditingSlotId(slotId);
      setDraftRange(null);
    } else {
      setEditingSlotId(null);
    }
  };

  const handleRequestNewDraft = (range: TimeRangeMs) => {
    setEditingSlotId(null);
    setDraftRange(range);
  };

  const openDeleteDialogForEditing = () => {
    if (!editingSlot) return;
    if (isPastDate(new Date(editingSlot.date))) {
      toast.error("Не можете да изтривате слотове за минали дни");
      return;
    }
    setSlotToDelete(editingSlot);
    setShowDeleteDialog(true);
  };

  useBreadcrumbRegistration([
    { label: "Начало", href: "/" } satisfies BreadcrumbItem,
    {
      label: "График",
      href: "/schedule",
      current: true,
    } satisfies BreadcrumbItem,
  ]);

  const confirmDelete = async () => {
    if (!slotToDelete) return;
    try {
      const res = await removeSlot({ id: slotToDelete._id as Id<"schedule"> });
      if (res?.ok) {
        toast.success("Слотът е изтрит успешно");
        setShowDeleteDialog(false);
        if (slotToDelete && slotToDelete._id === editingSlotId) {
          setEditingSlotId(null);
        }
        setSlotToDelete(null);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Грешка при изтриване на слот",
      );
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl md:text-3xl">График</h1>
          {selectedDate && (
            <p className="text-muted-foreground text-sm">
              {formatScheduleDate(selectedDate)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="bg-muted flex w-full max-w-md rounded-lg border p-1 sm:w-auto">
            {CALENDAR_KINDS.map((kind) => (
              <Button
                key={kind}
                type="button"
                variant={calendarKind === kind ? "default" : "ghost"}
                className="flex-1"
                onClick={() => updateCalendarKind(kind)}
              >
                {calendarKindLabelBg(kind)}
              </Button>
            ))}
          </div>
          {selectedDate && !isPastDate(selectedDate) && (
            <Button
              className="md:hidden w-full sm:w-auto"
              variant="outline"
              onClick={() => setShowCreatePanel(true)}
            >
              <Plus className="mr-2 size-4" />
              Нов слот
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(320px,520px)]">
        <section id="timeline" className="space-y-3">
          <h2 className="font-medium">Дневен график</h2>
          {selectedDate ? (
            <ScheduleDayView
              date={selectedDate}
              slots={slots}
              draftRange={draftRange}
              selectedSlotId={editingSlotId}
              readOnly={isPastDate(selectedDate)}
              scrollSessionKey={`${String(dateTimestamp ?? "none")}-${calendarKind}`}
              onDraftRangeChange={setDraftRange}
              onRequestNewDraft={handleRequestNewDraft}
              onSelectSlot={handleTimelineSelectSlot}
              onSlotTimeCommit={handleSlotTimeCommit}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Изберете дата от календара.
            </p>
          )}
        </section>

        <aside
          id="calendar"
          className={`${showCreatePanel ? "block" : "hidden"} space-y-4 md:block`}
        >
          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Календар</h2>
              <Button
                className="md:hidden"
                variant="outline"
                size="sm"
                onClick={() => setShowCreatePanel(false)}
              >
                Затвори
              </Button>
            </div>
            <ScheduleCalendar
              selected={selectedDate}
              onSelect={setSelectedDate}
              slotsByDate={slotsByDate}
            />
          </div>

          <div className="space-y-3 rounded-md border p-4">
            {selectedDate && isPastDate(selectedDate) ? (
              <div>
                <h2 className="font-medium mb-2">Само за преглед</h2>
                <p className="text-muted-foreground text-sm">
                  Не можете да създавате или редактирате слотове за минали дни.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">
                    {editingSlot
                      ? "Редактиране на слот"
                      : draftRange
                        ? "Нов слот"
                        : "Детайли"}
                  </h2>
                  <Button
                    className="md:hidden"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreatePanel(false);
                      setEditingSlotId(null);
                      setDraftRange(null);
                    }}
                  >
                    Затвори
                  </Button>
                </div>
                {selectedDate ? (
                  editingSlot ? (
                    <ScheduleSlotForm
                      calendarKind={editingSlot.calendarKind}
                      selectedDate={new Date(editingSlot.date)}
                      onSubmit={async (data) => {
                        await handleUpdate({
                          date: data.date,
                          startTime: data.startTime,
                          endTime: data.endTime,
                          title: data.title,
                          description: data.description,
                          visitId: data.visitId,
                          customerId: data.customerId,
                          vehicleId: data.vehicleId,
                          status: data.status,
                        });
                      }}
                      onCancel={() => setEditingSlotId(null)}
                      onRequestDelete={openDeleteDialogForEditing}
                      initialData={editingSlot}
                      customers={customers}
                      vehicles={vehicles}
                      visits={visits}
                      vehicleDraftVisitMap={vehicleDraftVisitMap}
                      hideDatePicker={true}
                      externalTimeRange={{
                        startTime: editingSlot.startTime,
                        endTime: editingSlot.endTime,
                      }}
                    />
                  ) : draftRange ? (
                    <ScheduleSlotForm
                      calendarKind={calendarKind}
                      selectedDate={selectedDate}
                      onSubmit={handleCreate}
                      onCancel={() => setDraftRange(null)}
                      customers={customers}
                      vehicles={vehicles}
                      visits={visits}
                      vehicleDraftVisitMap={vehicleDraftVisitMap}
                      hideDatePicker={true}
                      existingSlots={slots ?? []}
                      externalTimeRange={draftRange}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Кликнете върху празно място в графика за нов слот или
                      изберете съществуващ слот за редактиране.
                    </p>
                  )
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Изберете дата от календара.
                  </p>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изтриване на слот</AlertDialogTitle>
            <AlertDialogDescription>
              Сигурни ли сте, че искате да изтриете този слот? Това действие не
              може да бъде отменено.
              {slotToDelete && (
                <>
                  <br />
                  <br />
                  <strong>{slotToDelete.title}</strong>
                  {slotToDelete.description && ` - ${slotToDelete.description}`}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSlotToDelete(null)}>
              Отказ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Изтрий
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}