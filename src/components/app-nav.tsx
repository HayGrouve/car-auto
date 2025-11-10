"use client";
import Link from "next/link";
import Image from "next/image";
import logoJpg from "@/../public/logo.jpg";
import { usePathname } from "next/navigation";
import { brand } from "@/lib/brand";
import {
  Menu,
  Search,
  PawPrint,
  User,
  CalendarCheck,
  FileText,
  Calendar,
} from "lucide-react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const GlobalSearch = dynamic(() => import("@/components/GlobalSearch"), {
  ssr: false,
});

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Handle keyboard shortcut for global search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCtrlSpace = (e.ctrlKey || e.metaKey) && e.key === " ";
      if (isCtrlSpace) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const links = [
    { href: "/owners", label: "Собственици", icon: User },
    { href: "/animals", label: "Животни", icon: PawPrint },
    { href: "/visits", label: "Посещения", icon: CalendarCheck },
    { href: "/schedule", label: "График", icon: Calendar },
    { href: "/invoices", label: "Фактури", icon: FileText },
  ];

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={onClick}
          className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-3 py-2 ${pathname === l.href ? "bg-accent" : "hover:bg-accent"}`}
        >
          {l.icon ? <l.icon className="size-4" /> : null}
          {l.label}
        </Link>
      ))}
    </>
  );

  return (
    <div className="bg-background/70 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-2 font-semibold hover:underline"
          >
            <Image
              src={logoJpg}
              alt="Лого"
              width={24}
              height={24}
              className="h-auto w-6 rounded-sm"
              priority
            />
            {brand.nameBg}
          </Link>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <NavLinks />
          <Button
            type="button"
            variant="outline"
            className="items-center gap-2"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4" />
            Търсене...
            <span className="text-muted-foreground ml-2 hidden text-xs lg:inline">
              Ctrl/⌘ Space
            </span>
          </Button>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <div className="relative max-w-[200px] flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Търсене..."
              className="h-9 pr-3 pl-9 text-sm"
              onClick={() => setSearchOpen(true)}
              onFocus={() => setSearchOpen(true)}
              readOnly
            />
          </div>
          <button
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center p-2"
            aria-label="Меню"
            onClick={() => setOpen((o) => !o)}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>
      {open && (
        <div className="bg-background border-t md:hidden">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 p-3">
            <NavLinks onClick={() => setOpen(false)} />
          </div>
        </div>
      )}
      {/* Render GlobalSearch once - dialog only, buttons are rendered separately */}
      <GlobalSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        showButton={false}
      />
    </div>
  );
}
