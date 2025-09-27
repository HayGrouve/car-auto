'use client';

import Link from 'next/link';
import { brand } from '@/lib/brand';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8 grid gap-6 md:grid-cols-3">
        <div className="space-y-1">
          <div className="text-lg font-semibold">{brand.nameBg}</div>
          <div className="text-sm text-muted-foreground">© {year} {brand.nameBg}</div>
        </div>

        <nav aria-label="Навигация" className="flex flex-col gap-2 text-sm md:items-center">
          <Link className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs px-0.5" href="/owners" aria-label="Собственици">Собственици</Link>
          <Link className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs px-0.5" href="/animals" aria-label="Животни">Животни</Link>
          <Link className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs px-0.5" href="/visits" aria-label="Посещения">Посещения</Link>
        </nav>

        <div className="flex flex-col gap-2 text-sm md:items-end">
          <Link className="text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs px-0.5" href="/privacy" aria-label="Политика за поверителност">Политика за поверителност</Link>
        </div>
      </div>
    </footer>
  );
}


