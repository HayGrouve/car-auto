"use client";

import Link from "next/link";
import { brand } from "@/lib/brand";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-background w-full border-t">
      <div className="container mx-auto grid gap-6 px-4 py-6 md:grid-cols-3 md:py-8">
        <div className="space-y-1">
          <div className="text-lg font-semibold">{brand.nameBg}</div>
          <div className="text-muted-foreground text-sm">
            © {year} {brand.nameBg}
          </div>
        </div>

        <nav aria-label="Навигация" className="flex flex-col gap-2 text-sm">
          <Link
            className="focus-visible:ring-ring rounded-xs px-0.5 hover:underline focus-visible:ring-2 focus-visible:outline-none cursor-pointer"
            href="/owners"
            aria-label="Собственици"
          >
            Собственици
          </Link>
          <Link
            className="focus-visible:ring-ring rounded-xs px-0.5 hover:underline focus-visible:ring-2 focus-visible:outline-none cursor-pointer"
            href="/animals"
            aria-label="Животни"
          >
            Животни
          </Link>
          <Link
            className="focus-visible:ring-ring rounded-xs px-0.5 hover:underline focus-visible:ring-2 focus-visible:outline-none cursor-pointer"
            href="/visits"
            aria-label="Посещения"
          >
            Посещения
          </Link>
          <Link
            className="focus-visible:ring-ring rounded-xs px-0.5 hover:underline focus-visible:ring-2 focus-visible:outline-none cursor-pointer"
            href="/schedule"
            aria-label="График"
          >
            График
          </Link>
        </nav>

        <div className="flex flex-col gap-2 text-sm">
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1 rounded-xs px-0.5 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                aria-label="Клавишни комбинации"
              >
                Клавишни комбинации
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Клавишни комбинации</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div>
                  <kbd className="rounded border px-1 py-0.5">Ctrl/Cmd</kbd> +{" "}
                  <kbd className="rounded border px-1 py-0.5">Alt</kbd> +{" "}
                  <kbd className="rounded border px-1 py-0.5">I</kbd> — Нова
                  фактура
                </div>
                <div>
                  <kbd className="rounded border px-1 py-0.5">Ctrl/Cmd</kbd> +{" "}
                  <kbd className="rounded border px-1 py-0.5">Alt</kbd> +{" "}
                  <kbd className="rounded border px-1 py-0.5">V</kbd> —
                  Посещения
                </div>
                <div>
                  <kbd className="rounded border px-1 py-0.5">Ctrl/Cmd</kbd> +{" "}
                  <kbd className="rounded border px-1 py-0.5">Alt</kbd> +{" "}
                  <kbd className="rounded border px-1 py-0.5">O</kbd> —
                  Собственици
                </div>
                <div>
                  <kbd className="rounded border px-1 py-0.5">Ctrl/Cmd</kbd> +{" "}
                  <kbd className="rounded border px-1 py-0.5">Alt</kbd> +{" "}
                  <kbd className="rounded border px-1 py-0.5">A</kbd> — Животни
                </div>
                <div>
                  <kbd className="rounded border px-1 py-0.5">Ctrl/Cmd</kbd> +{" "}
                  <kbd className="rounded border px-1 py-0.5">Space</kbd> — Глобално
                  търсене
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Link
            className="text-muted-foreground focus-visible:ring-ring rounded-xs px-0.5 hover:underline focus-visible:ring-2 focus-visible:outline-none cursor-pointer"
            href="/privacy"
            aria-label="Политика за поверителност"
          >
            Политика за поверителност
          </Link>
        </div>
      </div>
    </footer>
  );
}
