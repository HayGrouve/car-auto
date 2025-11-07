"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import { ScheduleList } from "@/components/schedule/ScheduleList";
import { ScheduleSlotForm } from "@/components/schedule/ScheduleSlotForm";
import { formatScheduleDate } from "@/lib/format";
import { startOfDay } from "date-fns";
import {
  useBreadcrumbRegistration,
  type BreadcrumbItem,
} from "@/components/breadcrumbs";
import type { ScheduleSlot } from "@/types/schedule";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<ScheduleSlot | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const dateTimestamp = useMemo(() => {
    if (!selectedDate) return undefined;
    return startOfDay(selectedDate).getTime();
  }, [selectedDate]);

  const slots = useQuery(
    api.schedule.getByDate,
    dateTimestamp !== undefined
      ? { date: dateTimestamp }
      : "skip",
  ) as ScheduleSlot[] | undefined;

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
        map[dateStr] = (map[dateStr] || 0) + 1;
      });
    }
    return map;
  }, [allSlots]);

  // Fetch related data for form
  const owners = useQuery(
    api.owners.list,
    useMemo(() => ({ search: "" }), []),
  ) as { _id: string; name: string; phone?: string }[] | undefined;

  const animals = useQuery(
    api.animals.list,
    useMemo(() => ({ search: "", limit: 1000, sort: "createdAtDesc" }), []),
  ) as { _id: string; name: string; species: string; ownerId?: string | null }[] | undefined;

  const visits = useQuery(
    api.visits.list,
    useMemo(() => ({ limit: 1000, sort: "datetimeDesc" }), []),
  ) as { _id: string; code?: string | null }[] | undefined;

  const handleCreate = async (data: {
    date: number;
    startTime: number;
    endTime: number;
    title: string;
    description?: string;
    visitId?: Id<"visits">;
    ownerId?: Id<"owners">;
    animalId?: Id<"animals">;
  }) => {
    try {
      const res = await createSlot(data);
      if (res?.ok) {
        toast.success("Слотът е добавен успешно");
        setShowCreatePanel(false);
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
    ownerId?: Id<"owners">;
    animalId?: Id<"animals">;
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
        setShowEditDialog(false);
        setEditingSlot(null);
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

  const handleDelete = async (slotId: string) => {
    const slot = slots?.find((s) => s._id === slotId);
    if (slot) {
      setSlotToDelete(slot);
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = async () => {
    if (!slotToDelete) return;
    try {
      const res = await removeSlot({ id: slotToDelete._id as Id<"schedule"> });
      if (res?.ok) {
        toast.success("Слотът е изтрит успешно");
        setShowDeleteDialog(false);
        setSlotToDelete(null);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Грешка при изтриване на слот",
      );
    }
  };

  const handleEdit = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setShowEditDialog(true);
  };

  useBreadcrumbRegistration([
    { label: "Начало", href: "/" } satisfies BreadcrumbItem,
    {
      label: "График",
      href: "/schedule",
      current: true,
    } satisfies BreadcrumbItem,
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">График</h1>
          {selectedDate && (
            <p className="text-muted-foreground text-sm">
              {formatScheduleDate(selectedDate)}
            </p>
          )}
        </div>
        <Button
          className="md:hidden"
          variant="outline"
          onClick={() => setShowCreatePanel(true)}
        >
          <Plus className="mr-2 size-4" />
          Нов слот
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_380px]">
        <nav className="text-muted-foreground mb-2 inline-flex items-center gap-3 text-xs md:hidden">
          <a href="#list" className="underline underline-offset-2">
            Списък
          </a>
          <a href="#calendar" className="underline underline-offset-2">
            Календар
          </a>
        </nav>

        {/* Left: Schedule List */}
        <section id="list" className="space-y-4">
          <ScheduleList
            slots={slots}
            selectedDate={selectedDate}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </section>

        {/* Right: Calendar + Create Panel */}
        <aside id="calendar" className={`${showCreatePanel ? "block" : "hidden"} md:block space-y-4`}>
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
            <div className="flex items-center justify-between">
              <h2 className="font-medium">
                {editingSlot ? "Редактиране на слот" : "Нов слот"}
              </h2>
              <Button
                className="md:hidden"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreatePanel(false);
                  setEditingSlot(null);
                }}
              >
                Затвори
              </Button>
            </div>
            {selectedDate ? (
              <ScheduleSlotForm
                selectedDate={selectedDate}
                onSubmit={handleCreate}
                owners={owners}
                animals={animals}
                visits={visits}
                hideDatePicker={true}
                existingSlots={slots || []}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Изберете дата от календара, за да добавите слот.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактиране на слот</DialogTitle>
          </DialogHeader>
          {editingSlot && selectedDate ? (
            <ScheduleSlotForm
              selectedDate={new Date(editingSlot.date)}
              onSubmit={async (data) => {
                await handleUpdate({
                  date: data.date,
                  startTime: data.startTime,
                  endTime: data.endTime,
                  title: data.title,
                  description: data.description,
                  visitId: data.visitId,
                  ownerId: data.ownerId,
                  animalId: data.animalId,
                });
              }}
              onCancel={() => {
                setShowEditDialog(false);
                setEditingSlot(null);
              }}
              initialData={editingSlot}
              owners={owners}
              animals={animals}
              visits={visits}
            />
          ) : null}
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Изтрий
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

