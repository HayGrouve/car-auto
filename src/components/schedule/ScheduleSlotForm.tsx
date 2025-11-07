"use client";

import { useState, useMemo } from "react";
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
import { validateSlotTime } from "@/lib/schedule";
import type { ScheduleSlot } from "@/types/schedule";
import type { Id } from "@/../convex/_generated/dataModel";
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
  }) => Promise<void>;
  onCancel?: () => void;
  initialData?: ScheduleSlot | null;
  owners?: Array<{ _id: string; name: string; phone?: string }>;
  animals?: Array<{ _id: string; name: string; species: string }>;
  visits?: Array<{ _id: string; code?: string | null }>;
};

export function ScheduleSlotForm({
  selectedDate,
  onSubmit,
  onCancel,
  initialData,
  owners = [],
  animals = [],
  visits = [],
}: ScheduleSlotFormProps) {
  const [date, setDate] = useState<Date>(initialData ? new Date(initialData.date) : selectedDate);
  const [startTime, setStartTime] = useState(
    initialData
      ? format(new Date(initialData.startTime), "HH:mm")
      : "09:00",
  );
  const [endTime, setEndTime] = useState(
    initialData
      ? format(new Date(initialData.endTime), "HH:mm")
      : "10:00",
  );
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [visitId, setVisitId] = useState<string>(
    initialData?.visitId || "",
  );
  const [ownerId, setOwnerId] = useState<string>(
    initialData?.ownerId || "",
  );
  const [animalId, setAnimalId] = useState<string>(
    initialData?.animalId || "",
  );
  const [ownerSearch, setOwnerSearch] = useState("");
  const [animalSearch, setAnimalSearch] = useState("");
  const [visitSearch, setVisitSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredOwners = useMemo(() => {
    if (!ownerSearch) return owners;
    const search = ownerSearch.toLowerCase();
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(search) ||
        o.phone?.toLowerCase().includes(search),
    );
  }, [owners, ownerSearch]);

  const filteredAnimals = useMemo(() => {
    if (!animalSearch) return animals;
    const search = animalSearch.toLowerCase();
    return animals.filter(
      (a) =>
        a.name.toLowerCase().includes(search) ||
        a.species.toLowerCase().includes(search),
    );
  }, [animals, animalSearch]);

  const filteredVisits = useMemo(() => {
    if (!visitSearch) return visits;
    const search = visitSearch.toLowerCase();
    return visits.filter((v) =>
      v.code?.toLowerCase().includes(search),
    );
  }, [visits, visitSearch]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dayStart = startOfDay(date);
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);

      const startTimestamp = setMinutes(
        setHours(dayStart, startHour),
        startMin,
      ).getTime();
      const endTimestamp = setMinutes(
        setHours(dayStart, endHour),
        endMin,
      ).getTime();

      const validation = validateSlotTime(
        date,
        startTimestamp,
        endTimestamp,
      );
      if (!validation.valid) {
        throw new Error(validation.error);
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
      });

      // Reset form if not editing
      if (!initialData) {
        setTitle("");
        setDescription("");
        setVisitId("");
        setOwnerId("");
        setAnimalId("");
        setStartTime("09:00");
        setEndTime("10:00");
      }
    } catch (error) {
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
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
            >
              <CalendarIcon className="mr-2 size-4" />
              {date ? format(date, "PPP", { locale: bg }) : "Изберете дата"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              locale={bg}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="startTime">Начален час</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="endTime">Краен час</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="title">Заглавие *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="напр. Преглед"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Допълнителна информация..."
          rows={3}
        />
      </div>

      <div>
        <Label>Посещение</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {visitId
                ? visits.find((v) => v._id === visitId)?.code || "Избрано"
                : "Без посещение"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput
                placeholder="Търси посещение..."
                value={visitSearch}
                onValueChange={setVisitSearch}
              />
              <CommandList>
                <CommandEmpty>Няма резултати</CommandEmpty>
                <CommandItem
                  value=""
                  onSelect={() => setVisitId("")}
                >
                  Без посещение
                </CommandItem>
                {filteredVisits.map((v) => (
                  <CommandItem
                    key={v._id}
                    value={v._id}
                    onSelect={(val) => setVisitId(val)}
                  >
                    {v.code || v._id}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label>Собственик</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {ownerId
                ? filteredOwners.find((o) => o._id === ownerId)?.name
                : "Без собственик"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput
                placeholder="Търси собственик..."
                value={ownerSearch}
                onValueChange={setOwnerSearch}
              />
              <CommandList>
                <CommandEmpty>Няма резултати</CommandEmpty>
                <CommandItem value="" onSelect={() => setOwnerId("")}>
                  Без собственик
                </CommandItem>
                {filteredOwners.map((o) => (
                  <CommandItem
                    key={o._id}
                    value={o._id}
                    onSelect={(val) => setOwnerId(val)}
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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {animalId
                ? filteredAnimals.find((a) => a._id === animalId)?.name
                : "Без животно"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput
                placeholder="Търси животно..."
                value={animalSearch}
                onValueChange={setAnimalSearch}
              />
              <CommandList>
                <CommandEmpty>Няма резултати</CommandEmpty>
                <CommandItem value="" onSelect={() => setAnimalId("")}>
                  Без животно
                </CommandItem>
                {filteredAnimals.map((a) => (
                  <CommandItem
                    key={a._id}
                    value={a._id}
                    onSelect={(val) => setAnimalId(val)}
                  >
                    {a.name} ({a.species})
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

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

