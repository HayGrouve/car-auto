"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  useDeferredValue,
} from "react";
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
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Search,
  Users,
  Car,
  CalendarCheck,
  FileText,
  Loader2,
  Eraser,
} from "lucide-react";
import { fmtDateTimeBG } from "@/lib/format";
import { highlightMatch } from "@/lib/search-utils";
import { Badge } from "@/components/ui/badge";
import { fmtNumberBG } from "@/lib/format";

const HISTORY_STORAGE_KEY = "alisa.searchHistory.v1";
const HISTORY_LIMIT = 8;
const MIN_QUERY_LENGTH = 2;

// Type definitions
interface Customer {
  _id: string;
  name: string;
  phone?: string;
}

interface Vehicle {
  _id: string;
  licensePlate: string;
  make: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
}

interface Visit {
  _id: string;
  code?: string;
  createdAt: number;
  status: string;
  customerId?: string;
  vehicleId?: string;
}

interface Invoice {
  _id: string;
  code?: string;
  createdAt: number;
  totalAmount: number;
  customerId?: string;
  visitId?: string;
}

// Parse query for prefix filters (c:, v:, p:, i:)
function parseQuery(rawQuery: string): {
  query: string;
  filters: {
    customers: boolean;
    vehicles: boolean;
    visits: boolean;
    invoices: boolean;
  };
} {
  const trimmed = rawQuery.trim();
  const filters = {
    customers: false,
    vehicles: false,
    visits: false,
    invoices: false,
  };

  let query = trimmed;
  const prefixRegex = /^([cvpi]):(.+)$/i;
  const prefixMatch = prefixRegex.exec(trimmed);
  if (prefixMatch?.[1] && prefixMatch?.[2]) {
    const prefix = prefixMatch[1].toLowerCase();
    query = prefixMatch[2].trim();
    switch (prefix) {
      case "c":
        filters.customers = true;
        break;
      case "v":
        filters.vehicles = true;
        break;
      case "p":
        filters.visits = true;
        break;
      case "i":
        filters.invoices = true;
        break;
    }
  }

  return { query, filters };
}

// Format currency
function formatCurrency(amount: number): string {
  return fmtNumberBG(amount, { style: "currency", currency: "BGN" });
}

// Get status badge variant
function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" {
  switch (status.toLowerCase()) {
    case "finalized":
      return "default";
    case "draft":
      return "secondary";
    default:
      return "default";
  }
}

type GlobalSearchProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showButton?: boolean;
};

export function GlobalSearch({
  open: externalOpen,
  onOpenChange,
  showButton = true,
}: GlobalSearchProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const router = useRouter();

  // Use external state if provided, otherwise use internal state
  const open = externalOpen ?? internalOpen;
  const setOpen = useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      } else {
        setInternalOpen(value);
      }
    },
    [onOpenChange],
  );

  // Parse query and filters
  const { query, filters } = useMemo(() => parseQuery(rawQuery), [rawQuery]);

  // Debounce query for API calls
  const deferredQuery = useDeferredValue(query);

  // Only search if query meets minimum length
  const searchQuery =
    deferredQuery.length >= MIN_QUERY_LENGTH ? deferredQuery : "";

  // Skip queries when no search query (unless showing history)
  const shouldFetch = searchQuery.length > 0;

  useEffect(() => {
    // Only register keyboard shortcut if not externally controlled
    if (onOpenChange) return;

    const onKey = (e: KeyboardEvent) => {
      const isCtrlSpace = (e.ctrlKey || e.metaKey) && e.key === " ";
      if (isCtrlSpace) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen, onOpenChange]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const sanitized = parsed.filter(
          (item): item is string => typeof item === "string",
        );
        setHistory(sanitized);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const persistHistory = useCallback((term: string) => {
    const normalized = term.trim();
    if (!normalized) return;
    setHistory((prev) => {
      const next = [
        normalized,
        ...prev.filter((item) => item !== normalized),
      ].slice(0, HISTORY_LIMIT);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const clearQuery = useCallback(() => {
    setRawQuery("");
  }, []);

  // Determine which types to search
  const hasAnyFilter =
    filters.customers || filters.vehicles || filters.visits || filters.invoices;
  const shouldSearchCustomers = !hasAnyFilter || filters.customers;
  const shouldSearchVehicles = !hasAnyFilter || filters.vehicles;
  const shouldSearchVisits = !hasAnyFilter || filters.visits;
  const shouldSearchInvoices = !hasAnyFilter || filters.invoices;

  // Queries with loading and error states
  const customersQuery = useQuery(
    api.customers.list,
    shouldFetch && shouldSearchCustomers
      ? {
          search: searchQuery,
          limit: 10,
        }
      : "skip",
  );

  const vehiclesQuery = useQuery(
    api.vehicles.list,
    shouldFetch && shouldSearchVehicles
      ? {
          search: searchQuery,
          limit: 10,
        }
      : "skip",
  );

  const visitsQuery = useQuery(
    api.visits.list,
    shouldFetch && shouldSearchVisits
      ? {
          search: searchQuery,
          limit: 10,
        }
      : "skip",
  );

  const invoicesQuery = useQuery(
    api.invoices.list,
    shouldFetch && shouldSearchInvoices
      ? {
          search: searchQuery,
          limit: 10,
          unpaidOnly: false,
        }
      : "skip",
  );

  // Type-safe results
  const customersResult = customersQuery as
    | { items: Customer[]; total: number; hasMore: boolean }
    | undefined;
  const vehiclesResult = vehiclesQuery as
    | { items: Vehicle[]; total: number; hasMore: boolean }
    | undefined;
  const visitsResult = visitsQuery as
    | { items: Visit[]; total: number; hasMore: boolean }
    | undefined;
  const invoicesResult = invoicesQuery as
    | { items: Invoice[]; total: number; hasMore: boolean }
    | undefined;

  const customers = customersResult?.items;
  const vehicles = vehiclesResult?.items;
  const visits = visitsResult?.items;
  const invoices = invoicesResult?.items;

  // Check loading states - only check queries that are actually being fetched (not skipped)
  const isLoading =
    shouldFetch &&
    ((shouldSearchCustomers && customersQuery === undefined) ||
      (shouldSearchVehicles && vehiclesQuery === undefined) ||
      (shouldSearchVisits && visitsQuery === undefined) ||
      (shouldSearchInvoices && invoicesQuery === undefined));

  // Check for errors (if query returns null when it shouldn't)
  const hasError = false; // Convex handles errors internally

  // Build customer map for vehicle display
  const customerMap = useMemo(() => {
    const map: Record<string, { name: string; phone?: string }> = {};
    (customers ?? []).forEach((o) => {
      map[o._id] = { name: o.name, phone: o.phone };
    });
    return map;
  }, [customers]);

  const listRef = useRef<HTMLDivElement | null>(null);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape" && !rawQuery) {
        setOpen(false);
        return;
      }
      const list = listRef.current;
      if (!list) return;
      const items = Array.from(
        list.querySelectorAll<HTMLElement>("[cmdk-item]"),
      ).filter((item) => !item.hasAttribute("aria-disabled"));
      if (items.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        items[0]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        items[items.length - 1]?.focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        items[0]?.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        items[items.length - 1]?.focus();
      }
    },
    [rawQuery, setOpen],
  );

  const onNavigate = useCallback(
    (href: string, shouldPersist = true) => {
      if (shouldPersist && query.trim()) {
        persistHistory(query);
      }
      setOpen(false);
      setRawQuery("");
      router.push(href);
    },
    [router, query, persistHistory, setOpen],
  );

  // Filter results based on prefix filters
  const filteredCustomers = useMemo(() => {
    if (!shouldSearchCustomers) return [];
    return customers ?? [];
  }, [customers, shouldSearchCustomers]);

  const filteredVehicles = useMemo(() => {
    if (!shouldSearchVehicles) return [];
    return vehicles ?? [];
  }, [vehicles, shouldSearchVehicles]);

  const filteredVisits = useMemo(() => {
    if (!shouldSearchVisits) return [];
    return visits ?? [];
  }, [visits, shouldSearchVisits]);

  const filteredInvoices = useMemo(() => {
    if (!shouldSearchInvoices) return [];
    return invoices ?? [];
  }, [invoices, shouldSearchInvoices]);

  const hasResults =
    filteredCustomers.length > 0 ||
    filteredVehicles.length > 0 ||
    filteredVisits.length > 0 ||
    filteredInvoices.length > 0;

  const showHistory = history.length > 0 && !searchQuery;

  const getPlaceholder = () => {
    if (filters.customers) return "Търси клиенти...";
    if (filters.vehicles) return "Търси автомобили...";
    if (filters.visits) return "Търси посещения...";
    if (filters.invoices) return "Търси фактури...";
    return "Търси по име, код... (c:, v:, p:, i: за филтри)";
  };

  return (
    <>
      {showButton && (
        <Button
          type="button"
          variant="outline"
          className="hidden items-center gap-2 md:inline-flex"
          onClick={() => setOpen(true)}
        >
          <Search className="size-4" />
          Търсене...
          <span className="text-muted-foreground ml-2 hidden text-xs lg:inline">
            Ctrl/⌘ Space
          </span>
        </Button>
      )}
      <CommandDialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setRawQuery("");
          }
        }}
        title="Търсене"
        description="Намери клиенти, автомобили, посещения, фактури"
      >
        <div className="relative">
          <CommandInput
            autoFocus
            placeholder={getPlaceholder()}
            onValueChange={setRawQuery}
            value={rawQuery}
            onKeyDown={handleInputKeyDown}
            aria-label="Търсене"
            icon={
              rawQuery ? (
                <Eraser className="size-4 shrink-0 opacity-70" />
              ) : (
                <Search className="size-4 shrink-0 opacity-50" />
              )
            }
            onIconClick={rawQuery ? clearQuery : undefined}
          />
        </div>
        <CommandList ref={listRef}>
          {isLoading && searchQuery ? (
            <div className="text-muted-foreground flex items-center justify-center py-6 text-sm">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Търсене...
            </div>
          ) : hasError ? (
            <CommandEmpty>Възникна грешка при търсенето</CommandEmpty>
          ) : !hasResults && searchQuery ? (
            <CommandEmpty>
              <div className="py-6">
                <p className="mb-2">Няма резултати</p>
                {query.length < MIN_QUERY_LENGTH && (
                  <p className="text-muted-foreground text-xs">
                    Въведете поне {MIN_QUERY_LENGTH} символа
                  </p>
                )}
              </div>
            </CommandEmpty>
          ) : null}

          {showHistory && (
            <CommandGroup heading="Скорошни заявки">
              {history.map((term) => (
                <CommandItem
                  key={`history-${term}`}
                  value={`history-${term}`}
                  onSelect={() => setRawQuery(term)}
                >
                  <Search className="mr-2 size-4" aria-hidden />
                  <span>{term}</span>
                </CommandItem>
              ))}
              <CommandItem value="history-clear" onSelect={clearHistory}>
                <span className="text-muted-foreground">Изчисти историята</span>
              </CommandItem>
            </CommandGroup>
          )}

          {filteredCustomers.length > 0 && (
            <CommandGroup
              heading={
                <div className="flex items-center justify-between">
                  <span>Клиенти</span>
                  <Badge variant="secondary" className="ml-2">
                    {filteredCustomers.length}
                  </Badge>
                </div>
              }
            >
              {filteredCustomers.map((o) => {
                const nameParts = highlightMatch(o.name, query);
                return (
                  <CommandItem
                    key={`customer-${o._id}`}
                    value={`customer-${o._id}`}
                    onSelect={() => onNavigate(`/customers/${o._id}`)}
                  >
                    <Users className="mr-2 size-4" aria-hidden />
                    <span className="font-medium">
                      {nameParts.map((part, i) =>
                        part.highlight ? (
                          <mark
                            key={i}
                            className="bg-blue-200 dark:bg-blue-900"
                          >
                            {part.text}
                          </mark>
                        ) : (
                          part.text
                        ),
                      )}
                    </span>
                    {o.phone ? (
                      <span className="text-muted-foreground ml-2">
                        · {o.phone}
                      </span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {filteredVehicles.length > 0 && (
            <CommandGroup
              heading={
                <div className="flex items-center justify-between">
                  <span>Автомобили</span>
                  <Badge variant="secondary" className="ml-2">
                    {filteredVehicles.length}
                  </Badge>
                </div>
              }
            >
              {filteredVehicles.map((a) => {
                const customerDisplay =
                  a.customerName ??
                  (a.customerId ? customerMap[String(a.customerId)]?.name : undefined);
                const nameParts = highlightMatch(a.licensePlate, query);
                return (
                  <CommandItem
                    key={`vehicle-${a._id}`}
                    value={`vehicle-${a._id}`}
                    onSelect={() => onNavigate(`/vehicles/${a._id}`)}
                  >
                    <Car className="mr-2 size-4" aria-hidden />
                    <span className="font-medium">
                      {nameParts.map((part, i) =>
                        part.highlight ? (
                          <mark
                            key={i}
                            className="bg-blue-200 dark:bg-blue-900"
                          >
                            {part.text}
                          </mark>
                        ) : (
                          part.text
                        ),
                      )}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      · {a.make}
                    </span>
                    {customerDisplay ? (
                      <span className="text-muted-foreground ml-2">
                        · {customerDisplay}
                      </span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {filteredVisits.length > 0 && (
            <CommandGroup
              heading={
                <div className="flex items-center justify-between">
                  <span>Посещения</span>
                  <Badge variant="secondary" className="ml-2">
                    {filteredVisits.length}
                  </Badge>
                </div>
              }
            >
              {filteredVisits.map((v) => {
                const code = v.code ?? `#${String(v._id)}`;
                const codeParts = highlightMatch(code, query);
                return (
                  <CommandItem
                    key={`visit-${v._id}`}
                    value={`visit-${v._id}`}
                    onSelect={() => onNavigate(`/visits/${v._id}`)}
                  >
                    <CalendarCheck className="mr-2 size-4" aria-hidden />
                    <span className="font-medium">
                      {codeParts.map((part, i) =>
                        part.highlight ? (
                          <mark
                            key={i}
                            className="bg-blue-200 dark:bg-blue-900"
                          >
                            {part.text}
                          </mark>
                        ) : (
                          part.text
                        ),
                      )}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      · {fmtDateTimeBG(v.createdAt)}
                    </span>
                    <Badge
                      variant={getStatusVariant(v.status)}
                      className="ml-2"
                    >
                      {v.status === "finalized" ? "Завършено" : "Чернова"}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {filteredInvoices.length > 0 && (
            <CommandGroup
              heading={
                <div className="flex items-center justify-between">
                  <span>Фактури</span>
                  <Badge variant="secondary" className="ml-2">
                    {filteredInvoices.length}
                  </Badge>
                </div>
              }
            >
              {filteredInvoices.map((inv) => {
                const code = inv.code ?? `#${String(inv._id)}`;
                const codeParts = highlightMatch(code, query);
                return (
                  <CommandItem
                    key={`inv-${inv._id}`}
                    value={`inv-${inv._id}`}
                    onSelect={() => onNavigate(`/invoices/${inv._id}`)}
                  >
                    <FileText className="mr-2 size-4" aria-hidden />
                    <span className="font-medium">
                      {codeParts.map((part, i) =>
                        part.highlight ? (
                          <mark
                            key={i}
                            className="bg-blue-200 dark:bg-blue-900"
                          >
                            {part.text}
                          </mark>
                        ) : (
                          part.text
                        ),
                      )}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      · {fmtDateTimeBG(inv.createdAt)}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      · {formatCurrency(inv.totalAmount)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {!showHistory && !hasResults && !searchQuery && (
            <div className="text-muted-foreground py-6 text-center text-sm">
              <p className="mb-2">Въведете заявка за търсене</p>
              <div className="mt-4 px-3 text-xs">
              Използвайте префикси за филтриране:{" "}
                <div className="mt-1">
                  <span className="font-bold">c:</span> клиенти,
                </div>
                <div className="mt-1">
                  <span className="font-bold">v:</span> автомобили,
                </div>
                <div className="mt-1">
                  <span className="font-bold">p:</span> посещения,
                </div>
                <div className="mt-1">
                  <span className="font-bold">i:</span> фактури
                </div>
              </div>
            </div>
          )}

          {showHistory && searchQuery && history.length > 0 && (
            <CommandGroup heading="Скорошни заявки">
              {history.slice(0, 3).map((term) => (
                <CommandItem
                  key={`history-${term}`}
                  value={`history-${term}`}
                  onSelect={() => setRawQuery(term)}
                >
                  <Search className="mr-2 size-4" aria-hidden />
                  <span>{term}</span>
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