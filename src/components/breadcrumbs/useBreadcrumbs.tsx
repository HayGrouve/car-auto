"use client";

import { useEffect, useMemo, useRef } from "react";
import { useBreadcrumbs } from "./BreadcrumbProvider";
import type { BreadcrumbItem } from "./BreadcrumbProvider";

export function useBreadcrumb(items: BreadcrumbItem[]) {
  const { setItems } = useBreadcrumbs();
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const signature = useMemo(() => JSON.stringify(items), [items]);
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastSignatureRef.current === signature) {
      return;
    }
    lastSignatureRef.current = signature;
    setItems(itemsRef.current);
  }, [signature, setItems]);

  useEffect(() => {
    return () => {
      lastSignatureRef.current = null;
      setItems([]);
    };
  }, [setItems]);
}
