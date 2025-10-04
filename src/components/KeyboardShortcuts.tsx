"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target instanceof HTMLElement ? target : null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  // contenteditable elements
  if (el.isContentEditable) return true;
  return false;
}

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || !e.altKey) return; // Use Ctrl/Cmd+Alt to avoid conflicts
      const k = e.key.toLowerCase();
      if (k === "i") {
        e.preventDefault();
        router.push("/invoices/new");
      } else if (k === "v") {
        e.preventDefault();
        router.push("/visits");
      } else if (k === "o") {
        e.preventDefault();
        router.push("/owners");
      } else if (k === "a") {
        e.preventDefault();
        router.push("/animals");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}

export default KeyboardShortcuts;
