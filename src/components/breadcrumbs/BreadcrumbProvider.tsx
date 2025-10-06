"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type BreadcrumbItem = {
  id?: string;
  label: string;
  href?: string;
  current?: boolean;
};

type BreadcrumbContextValue = {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(
  undefined,
);

export function BreadcrumbProvider({
  initialItems = [],
  children,
}: {
  initialItems?: BreadcrumbItem[];
  children: ReactNode;
}) {
  const [items, setItems] = useState<BreadcrumbItem[]>(() => initialItems);
  const value = useMemo(() => ({ items, setItems }), [items]);

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useBreadcrumbs must be used within BreadcrumbProvider");
  }
  return ctx;
}

export function useSetBreadcrumbs() {
  const ctx = useBreadcrumbs();
  return ctx.setItems;
}
