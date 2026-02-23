"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { bg } from "date-fns/locale";
import { startOfDay, setHours, setMinutes } from "date-fns";
import {
  validateSlotTime,
  getAvailableHours,
  getNextAvailableSlot,
  isPastDate,
} from "@/lib/schedule";
import type { ScheduleSlot } from "@/types/schedule";
import type { Id } from "@/../convex/_generated/dataModel";
import { FormField } from "@/components/ui/form-field";
import { FormError } from "@/components/ui/form-error";
import { cn } from "@/lib/utils";

type ScheduleSlotFormProps = {
  selectedDate: Date;
  onSubmit: (data: {
    date: number;
    startTime: number;
    endTime: number;
    title: string;
    description?: string;
    visitId?: Id<"visits">;
    ownerId?: Id<"owners">;
    animalId?: Id<"animals">;
    status?: "scheduled" | "completed" | "cancelled";
  }) => Promise<void>;
  onCancel?: () => void;
  initialData?: ScheduleSlot | null;
  owners?: Array<{ _id: string; name: string; phone?: string }>;
  animals?: Array<{
    _id: string;
    name: string;
    species: string;
    ownerId?: string | null;
  }>;
  visits?: Array<{ _id: string; code?: string | null }>;
  hideDatePicker?: boolean; // Hide date picker when using calendar selection
  existingSlots?: Array<{ startTime: number; endTime: number }>; // Existing slots for the selected date
  animalDraftVisitMap?: Map<string, string>; // Map of animalId -> draft visit ID
};

export function ScheduleSlotForm({
  selectedDate,
  onSubmit,
  onCancel,
  initialData,
  owners = [],
  animals = [],
  visits = [],
  hideDatePicker = false,
  existingSlots = [],
  animalDraftVisitMap,
}: ScheduleSlotFormProps) {
  const [date, setDate] = useState<Date>(
    initialData ? new Date(initialData.date) : selectedDate,
  );
  const [startHour, setStartHour] = useState(
    initialData ? new Date(initialData.startTime).getHours() : 9,
  );
  const [startMinute, setStartMinute] = useState(
    initialData
      ? Math.round(new Date(initialData.startTime).getMinutes() / 15) * 15
      : 0,
  );
  const [endHour, setEndHour] = useState(
    initialData ? new Date(initialData.endTime).getHours() : 10,
  );
  const [endMinute, setEndMinute] = useState(
    initialData
      ? Math.round(new Date(initialData.endTime).getMinutes() / 15) * 15
      : 0,
  );
  // Generate a unique ID for new slots
  const generateSlotId = useMemo(() => {
    if (initialData) return null; // Don't generate for existing slots
    // Generate a 2-3 digit number (100-999)
    const randomId = Math.floor(100 + Math.random() * 900);
    return randomId;
  }, [initialData]);

  const [title, setTitle] = useState(
    initialData?.title ??
      (generateSlotId ? `Преглед ${generateSlotId}` : "Преглед"),
  );
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [visitId, setVisitId] = useState<string>(initialData?.visitId ?? "");
  const [ownerId, setOwnerId] = useState<string>(initialData?.ownerId ?? "");
  const [animalId, setAnimalId] = useState<string>(initialData?.animalId ?? "");
  const [status, setStatus] = useState<"scheduled" | "completed" | "cancelled">(
    initialData?.status ?? "scheduled",
  );
  const [ownerSearch, setOwnerSearch] = useState("");
  const [animalSearch, setAnimalSearch] = useState("");
  const [visitSearch, setVisitSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [visitPopoverOpen, setVisitPopoverOpen] = useState(false);
  const [animalPopoverOpen, setAnimalPopoverOpen] = useState(false);
  const isInitialMount = useRef(true);

  // Update form values when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setDate(new Date(initialData.date));
      setStartHour(new Date(initialData.startTime).getHours());
      setStartMinute(
        Math.round(new Date(initialData.startTime).getMinutes() / 15) * 15,
      );
      setEndHour(new Date(initialData.endTime).getHours());
      setEndMinute(
        Math.round(new Date(initialData.endTime).getMinutes() / 15) * 15,
      );
      setTitle(initialData.title ?? "");
      setDescription(initialData.description ?? "");
      setVisitId(initialData.visitId ?? "");
      setOwnerId(initialData.ownerId ?? "");
      setAnimalId(initialData.animalId ?? "");
      setStatus(initialData.status ?? "scheduled");
      // Reset the initial mount flag when editing a new slot
      isInitialMount.current = true;
    }
  }, [initialData]);

  // Update date when selectedDate changes (for new slots)
  useEffect(() => {
    if (!initialData) {
      setDate(selectedDate);
    }
  }, [selectedDate, initialData]);

  // Filter animals by owner when owner is selected
  const filteredAnimals = useMemo(() => {
    let filtered = animals;

    // Filter by owner if owner is selected
    if (ownerId) {
      filtered = filtered.filter((a) => a.ownerId === ownerId);
    }

    // Filter by search
    if (animalSearch) {
      const search = animalSearch.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(search) ||
          a.species.toLowerCase().includes(search),
      );
    }

    return filtered;
  }, [animals, ownerId, animalSearch]);

  // Auto-fill owner when animal is selected
  const handleAnimalSelect = (animalIdValue: string) => {
    setAnimalId(animalIdValue);
    if (animalIdValue) {
      const selectedAnimal = animals.find((a) => a._id === animalIdValue);
      if (selectedAnimal?.ownerId) {
        setOwnerId(selectedAnimal.ownerId);
      }
      // Auto-fill draft visit if one exists for this animal
      if (animalDraftVisitMap?.has(animalIdValue)) {
        const draftVisitId = animalDraftVisitMap.get(animalIdValue);
        if (draftVisitId) {
          setVisitId(draftVisitId);
        }
      }
    }
    setAnimalPopoverOpen(false);
  };

  // Clear animal when owner changes (if animal doesn't belong to new owner)
  const handleOwnerSelect = (ownerIdValue: string) => {
    setOwnerId(ownerIdValue);
    if (ownerIdValue && animalId) {
      const selectedAnimal = animals.find((a) => a._id === animalId);
      if (selectedAnimal?.ownerId !== ownerIdValue) {
        setAnimalId("");
      }
    } else if (!ownerIdValue) {
      // Clear animal when owner is cleared
      setAnimalId("");
    }
    setOwnerPopoverOpen(false);
  };

  const filteredOwners = useMemo(() => {
    if (!ownerSearch) return owners;
    const search = ownerSearch.toLowerCase();
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(search) ||
        o.phone?.toLowerCase().includes(search),
    );
  }, [owners, ownerSearch]);

  const filteredVisits = useMemo(() => {
    if (!visitSearch) return visits;
    const search = visitSearch.toLowerCase();
    return visits.filter((v) => v.code?.toLowerCase().includes(search));
  }, [visits, visitSearch]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setValidationError(null);

    try {
      if (!title.trim()) {
        setValidationError("Заглавието е задължително");
        setIsSubmitting(false);
        return;
      }

      if (title.length > 100) {
        setValidationError("Заглавието не може да надвишава 100 символа");
        setIsSubmitting(false);
        return;
      }

      const dayStart = startOfDay(date);
      const startTimestamp = setMinutes(
        setHours(dayStart, startHour),
        startMinute,
      ).getTime();
      const endTimestamp = setMinutes(
        setHours(dayStart, endHour),
        endMinute,
      ).getTime();

      const validation = validateSlotTime(date, startTimestamp, endTimestamp);
      if (!validation.valid) {
        setValidationError(validation.error ?? "Невалидно време за слот");
        setIsSubmitting(false);
        return;
      }

      await onSubmit({
        date: dayStart.getTime(),
        startTime: startTimestamp,
        endTime: endTimestamp,
        title,
        description: description || undefined,
        visitId: visitId ? (visitId as Id<"visits">) : undefined,
        ownerId: ownerId ? (ownerId as Id<"owners">) : undefined,
        animalId: animalId ? (animalId as Id<"animals">) : undefined,
        status: status,
      });

      // Reset form if not editing
      if (!initialData) {
        // Generate new ID for next slot
        const newId = Math.floor(100 + Math.random() * 900);
        setTitle(`Преглед ${newId}`);
        setDescription("");
        setVisitId("");
        setOwnerId("");
        setAnimalId("");
        setStatus("scheduled");
        setStartHour(9);
        setStartMinute(0);
        setEndHour(10);
        setEndMinute(0);
      }
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "Възникна грешка",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update date when selectedDate changes (for new slots)
  useEffect(() => {
    if (!initialData) {
      setDate(selectedDate);
      // Prefill with next available slot
      const nextSlot = getNextAvailableSlot(selectedDate, existingSlots, 30);
      if (nextSlot) {
        // Round minutes to nearest 15-minute increment
        const roundedStartMinute = Math.round(nextSlot.startMinute / 15) * 15;
        const roundedEndMinute = Math.round(nextSlot.endMinute / 15) * 15;

        setStartHour(nextSlot.startHour);
        setStartMinute(roundedStartMinute);
        setEndHour(nextSlot.endHour);
        setEndMinute(roundedEndMinute);
        // Reset the initial mount flag so auto-fill doesn't override
        isInitialMount.current = true;
      } else {
        // Fallback to first available hour if no slot found
        const hourOptions = getAvailableHours(selectedDate);
        if (hourOptions.length > 0) {
          const firstHour = hourOptions[0];
          if (firstHour !== undefined) {
            setStartHour(firstHour);
            setStartMinute(0);
            setEndHour(firstHour);
            setEndMinute(30);
            isInitialMount.current = true;
          }
        }
      }
    }
  }, [selectedDate, initialData, existingSlots]);

  // Adjust hours when date changes to ensure they're within working hours
  const hourOptions = useMemo(() => getAvailableHours(date), [date]);
  useEffect(() => {
    if (hourOptions.length > 0) {
      // If start hour is not in available hours, set to first available hour
      if (!hourOptions.includes(startHour)) {
        const firstHour = hourOptions[0];
        if (firstHour !== undefined) {
          setStartHour(firstHour);
          setStartMinute(0);
        }
      }
      // If end hour is not in available hours, set to last available hour
      if (!hourOptions.includes(endHour)) {
        const lastHour = hourOptions[hourOptions.length - 1];
        if (lastHour !== undefined) {
          setEndHour(lastHour);
          setEndMinute(0);
        }
      }
    }
  }, [date, hourOptions, startHour, endHour]);

  // Auto-fill end time to be 30 minutes after start time
  useEffect(() => {
    // Skip auto-fill on initial mount to preserve existing end time when editing
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Auto-fill when start time changes (for both new and editing slots)
    let newEndMinute = startMinute + 30;
    let newEndHour = startHour;

    // Handle minute overflow (e.g., 45 + 30 = 75 -> next hour + 15)
    if (newEndMinute >= 60) {
      newEndMinute = newEndMinute - 60;
      newEndHour = startHour + 1;
    }

    // Ensure end time is within working hours
    if (hourOptions.length > 0) {
      const lastAvailableHour = hourOptions[hourOptions.length - 1];
      if (lastAvailableHour !== undefined && newEndHour <= lastAvailableHour) {
        setEndHour(newEndHour);
        setEndMinute(newEndMinute);
      }
    }
  }, [startHour, startMinute, hourOptions]);

  const minuteOptions = [0, 15, 30, 45];

  // Check if editing a past slot (readonly mode)
  const isEditingPastSlot = initialData
    ? isPastDate(new Date(initialData.date))
    : false;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
      {validationError && (
        <FormError message={validationError} className="mb-2" />
      )}

      {!hideDatePicker && (
        <div>
          <Label>Дата</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                )}
                disabled={isEditingPastSlot}
              >
                <CalendarIcon className="mr-2 size-4" />
                {date ? format(date, "PPP", { locale: bg }) : "Изберете дата"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && !isPastDate(d) && setDate(d)}
                locale={bg}
                disabled={(date) => isPastDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {isEditingPastSlot && (
            <p className="text-muted-foreground mt-1 text-xs">
              Не можете да променяте датата на минали слотове
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Начален час</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={startHour.toString()}
              onValueChange={(v) => setStartHour(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map((h) => (
                  <SelectItem key={h} value={h.toString()}>
                    {h.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={startMinute.toString()}
              onValueChange={(v) => setStartMinute(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minuteOptions.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {m.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Краен час</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={endHour.toString()}
              onValueChange={(v) => setEndHour(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map((h) => (
                  <SelectItem key={h} value={h.toString()}>
                    {h.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={endMinute.toString()}
              onValueChange={(v) => setEndMinute(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minuteOptions.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {m.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <FormField
        label="Заглавие"
        htmlFor="title"
        required
        error={
          title.trim() && title.length > 100
            ? "Заглавието не може да надвишава 100 символа"
            : undefined
        }
        hint="Въведете кратко описание"
      >
        <Input
          id="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setValidationError(null);
          }}
          placeholder="напр. Преглед"
          required
          maxLength={100}
          aria-invalid={title.trim() && title.length > 100 ? true : undefined}
        />
      </FormField>

      <FormField label="Описание" htmlFor="description">
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Допълнителна информация..."
          rows={3}
        />
      </FormField>

      <div>
        <Label>Посещение</Label>
        <Popover open={visitPopoverOpen} onOpenChange={setVisitPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {visitId
                ? (visits.find((v) => v._id === visitId)?.code ?? "Избрано")
                : "Без посещение"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Търси посещение..."
                value={visitSearch}
                onValueChange={setVisitSearch}
              />
              <CommandList>
                <CommandEmpty>Няма резултати</CommandEmpty>
                <CommandItem
                  value=""
                  onSelect={() => {
                    setVisitId("");
                    setVisitPopoverOpen(false);
                  }}
                >
                  Без посещение
                </CommandItem>
                {filteredVisits.map((v) => (
                  <CommandItem
                    key={v._id}
                    value={v.code ?? v._id}
                    onSelect={() => {
                      setVisitId(v._id);
                      setVisitPopoverOpen(false);
                    }}
                  >
                    {v.code ?? v._id}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label>Собственик</Label>
        <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {ownerId
                ? filteredOwners.find((o) => o._id === ownerId)?.name
                : "Без собственик"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Търси собственик..."
                value={ownerSearch}
                onValueChange={setOwnerSearch}
              />
              <CommandList>
                <CommandEmpty>Няма резултати</CommandEmpty>
                <CommandItem
                  value=""
                  onSelect={() => {
                    setOwnerId("");
                    setOwnerPopoverOpen(false);
                  }}
                >
                  Без собственик
                </CommandItem>
                {filteredOwners.map((o) => (
                  <CommandItem
                    key={o._id}
                    value={o.name}
                    onSelect={() => handleOwnerSelect(o._id)}
                  >
                    {o.name}
                    {o.phone ? ` · ${o.phone}` : ""}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label>Животно</Label>
        <Popover open={animalPopoverOpen} onOpenChange={setAnimalPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {animalId
                ? filteredAnimals.find((a) => a._id === animalId)?.name
                : "Без животно"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Търси животно..."
                value={animalSearch}
                onValueChange={setAnimalSearch}
              />
              <CommandList>
                <CommandEmpty>Няма резултати</CommandEmpty>
                <CommandItem
                  value=""
                  onSelect={() => {
                    setAnimalId("");
                    setAnimalPopoverOpen(false);
                  }}
                >
                  Без животно
                </CommandItem>
                {filteredAnimals.map((a) => (
                  <CommandItem
                    key={a._id}
                    value={a.name}
                    onSelect={() => handleAnimalSelect(a._id)}
                  >
                    {a.name} ({a.species})
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {initialData && (
        <div>
          <Label>Статус</Label>
          <Select
            value={status}
            onValueChange={(v) =>
              setStatus(v as "scheduled" | "completed" | "cancelled")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Планирано</SelectItem>
              <SelectItem value="completed">Завършено</SelectItem>
              <SelectItem value="cancelled">Отменено</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting
            ? "Запазване..."
            : initialData
              ? "Запази промените"
              : "Добави слот"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Отказ
          </Button>
        )}
      </div>
    </form>
  );
}
