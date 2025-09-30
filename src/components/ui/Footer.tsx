'use client';

import Link from 'next/link';
import { brand } from '@/lib/brand';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8 grid gap-6 md:grid-cols-3">
        <div className="space-y-1">
          <div className="text-lg font-semibold">{brand.nameBg}</div>
          <div className="text-sm text-muted-foreground">© {year} {brand.nameBg}</div>
        </div>

        <nav aria-label="Навигация" className="flex flex-col gap-2 text-sm">
          <Link className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs px-0.5" href="/owners" aria-label="Собственици">Собственици</Link>
          <Link className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs px-0.5" href="/animals" aria-label="Животни">Животни</Link>
          <Link className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs px-0.5" href="/visits" aria-label="Посещения">Посещения</Link>
        </nav>

        <div className="flex flex-col gap-2 text-sm">
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs px-0.5 cursor-pointer"
                aria-label="Клавишни комбинации"
              >
                Клавишни комбинации
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Клавишни комбинации</DialogTitle>
              </DialogHeader>
              <div className="text-sm space-y-2">
                <div><kbd className="px-1 py-0.5 border rounded">Ctrl/Cmd</kbd> + <kbd className="px-1 py-0.5 border rounded">Alt</kbd> + <kbd className="px-1 py-0.5 border rounded">I</kbd> — Нова фактура</div>
                <div><kbd className="px-1 py-0.5 border rounded">Ctrl/Cmd</kbd> + <kbd className="px-1 py-0.5 border rounded">Alt</kbd> + <kbd className="px-1 py-0.5 border rounded">V</kbd> — Посещения</div>
                <div><kbd className="px-1 py-0.5 border rounded">Ctrl/Cmd</kbd> + <kbd className="px-1 py-0.5 border rounded">Alt</kbd> + <kbd className="px-1 py-0.5 border rounded">O</kbd> — Собственици</div>
                <div><kbd className="px-1 py-0.5 border rounded">Ctrl/Cmd</kbd> + <kbd className="px-1 py-0.5 border rounded">Alt</kbd> + <kbd className="px-1 py-0.5 border rounded">A</kbd> — Животни</div>
                <div><kbd className="px-1 py-0.5 border rounded">Ctrl/Cmd</kbd> + <kbd className="px-1 py-0.5 border rounded">K</kbd> — Глобално търсене</div>
              </div>
            </DialogContent>
          </Dialog>
          <Link className="text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs px-0.5" href="/privacy" aria-label="Политика за поверителност">Политика за поверителност</Link>
        </div>
      </div>
    </footer>
  );
}


