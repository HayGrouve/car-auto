"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type Crumb = {
  id?: string;
  label: string;
  href?: string;
  current?: boolean;
};

type BreadcrumbContextValue = {
  items: Crumb[];
  setItems: (items: Crumb[]) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(
  undefined,
);

export function BreadcrumbProvider({
  initialItems = [],
  children,
}: {
  initialItems?: Crumb[];
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<Crumb[]>(() => initialItems);

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
