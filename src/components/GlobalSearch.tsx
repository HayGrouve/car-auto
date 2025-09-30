"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { fmtDateTimeBG } from "@/lib/format";

// Bulgarian transliteration + normalization helpers (to match both Cyrillic and Latin input)
const translitMap: Record<string, string> = {
  А: "A", а: "a", Б: "B", б: "b", В: "V", в: "v", Г: "G", г: "g",
  Д: "D", д: "d", Е: "E", е: "e", Ж: "Zh", ж: "zh", З: "Z", з: "z",
  И: "I", и: "i", Й: "Y", й: "y", К: "K", к: "k", Л: "L", л: "l",
  М: "M", м: "m", Н: "N", н: "n", О: "O", о: "o", П: "P", п: "p",
  Р: "R", р: "r", С: "S", с: "s", Т: "T", т: "t", У: "U", у: "u",
  Ф: "F", ф: "f", Х: "H", х: "h", Ц: "Ts", ц: "ts", Ч: "Ch", ч: "ch",
  Ш: "Sh", ш: "sh", Щ: "Sht", щ: "sht", Ъ: "A", ъ: "a", ь: "",
  Ю: "Yu", ю: "yu", Я: "Ya", я: "ya",
};
const toAscii = (s: string) => Array.from(String(s)).map((ch) => translitMap[ch] ?? ch).join("");
const normalizePair = (s: string) => {
  const base = String(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("bg")
    .replace(/["'`„“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const ascii = toAscii(base).toLowerCase();
  return { base, ascii };
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const owners = useQuery(
    api.owners.list,
    useMemo(() => ({ search: query, limit: 10 }), [query])
  ) as { _id: string; name: string; phone?: string }[] | undefined;

  const animals = useQuery(
    api.animals.list,
    useMemo(() => ({ search: query, limit: 10 }), [query])
  ) as { _id: string; name: string; species: string; ownerId?: string | null }[] | undefined;

  const visitsRaw = useQuery(
    api.visits.list,
    useMemo(() => ({ limit: 50 }), [])
  ) as { _id: string; code?: string; createdAt: number; status: string; ownerId?: string; animalId?: string }[] | undefined;

  const invoicesRaw = useQuery(
    api.invoices.list,
    useMemo(() => ({ unpaidOnly: false }), [])
  ) as { _id: string; code?: string; createdAt: number; total: number; ownerId?: string; visitId?: string }[] | undefined;

  const visits = useMemo(() => {
    const qp = normalizePair(query);
    if (!qp.base) return [] as { _id: string; code?: string; createdAt: number; status: string; ownerId?: string; animalId?: string }[];
    const matchedOwnerIds = new Set((owners ?? []).map((o) => o._id));
    const matchedAnimalIds = new Set((animals ?? []).map((a) => a._id));
    return (visitsRaw ?? [])
      .filter((v) => {
        const code = String(v.code ?? v._id);
        const codePair = normalizePair(code);
        const codeMatch = [codePair.base.includes(qp.base), codePair.ascii.includes(qp.ascii)].some(Boolean);
        const relOwner = v.ownerId ? matchedOwnerIds.has(String(v.ownerId)) : false;
        const relAnimal = v.animalId ? matchedAnimalIds.has(String(v.animalId)) : false;
        const relMatch = [relOwner, relAnimal].some(Boolean);
        return codeMatch ? true : relMatch;
      })
      .slice(0, 10);
  }, [query, owners, animals, visitsRaw]);

  const invoices = useMemo(() => {
    const qp = normalizePair(query);
    if (!qp.base) return [] as { _id: string; code?: string; createdAt: number; total: number; ownerId?: string; visitId?: string }[];
    const matchedOwnerIds = new Set((owners ?? []).map((o) => o._id));
    const matchedVisitIds = new Set((visits ?? []).map((v) => v._id));
    return (invoicesRaw ?? [])
      .filter((i) => {
        const code = String(i.code ?? i._id);
        const codePair = normalizePair(code);
        const codeMatch = [codePair.base.includes(qp.base), codePair.ascii.includes(qp.ascii)].some(Boolean);
        const relOwner = i.ownerId ? matchedOwnerIds.has(String(i.ownerId)) : false;
        const relVisit = i.visitId ? matchedVisitIds.has(String(i.visitId)) : false;
        const relMatch = [relOwner, relVisit].some(Boolean);
        return codeMatch ? true : relMatch;
      })
      .slice(0, 10);
  }, [query, owners, visits, invoicesRaw]);

  const onNavigate = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="hidden md:inline-flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        Търсене...
        <span className="ml-2 hidden lg:inline text-xs text-muted-foreground">Ctrl/⌘ K</span>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Търсене" description="Намери собственици, животни, посещения, фактури">
        <CommandInput autoFocus placeholder="Търси по име, код..." onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>Няма резултати</CommandEmpty>

          {(owners ?? []).length > 0 && query ? (
            <CommandGroup heading="Собственици">
              {(owners ?? []).slice(0, 10).map((o) => (
                <CommandItem key={`owner-${o._id}`} value={`owner-${o._id}`} onSelect={() => onNavigate(`/owners/${o._id}`)}>
                  <span className="font-medium">{o.name}</span>
                  {o.phone ? <span className="text-muted-foreground ml-2">· {o.phone}</span> : null}
                  <CommandShortcut>Owner</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {(animals ?? []).length > 0 && query ? (
            <CommandGroup heading="Животни">
              {(animals ?? []).slice(0, 10).map((a) => (
                <CommandItem key={`animal-${a._id}`} value={`animal-${a._id}`} onSelect={() => onNavigate(`/animals/${a._id}`)}>
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground ml-2">· {a.species}</span>
                  <CommandShortcut>Animal</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {(visits ?? []).length > 0 && (
            <CommandGroup heading="Посещения">
              {(visits ?? []).map((v) => (
                <CommandItem key={`visit-${v._id}`} value={`visit-${v._id}`} onSelect={() => onNavigate(`/visits/${v._id}`)}>
                  <span className="font-medium">{v.code ?? `#${String(v._id)}`}</span>
                  <span className="text-muted-foreground ml-2">· {fmtDateTimeBG(v.createdAt)}</span>
                  <CommandShortcut>Visit</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(invoices ?? []).length > 0 && (
            <CommandGroup heading="Фактури">
              {(invoices ?? []).map((inv) => (
                <CommandItem key={`inv-${inv._id}`} value={`inv-${inv._id}`} onSelect={() => onNavigate(`/invoices/${inv._id}`)}>
                  <span className="font-medium">{inv.code ?? `#${String(inv._id)}`}</span>
                  <span className="text-muted-foreground ml-2">· {fmtDateTimeBG(inv.createdAt)}</span>
                  <CommandShortcut>Invoice</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

export default GlobalSearch;


