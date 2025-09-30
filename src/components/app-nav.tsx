"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand } from "@/lib/brand";
import { Menu, PawPrint, User, CalendarCheck } from "lucide-react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const GlobalSearch = dynamic(() => import("@/components/GlobalSearch"), { ssr: false });

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = [
    { href: "/owners", label: "Собственици", icon: User },
    { href: "/animals", label: "Животни", icon: PawPrint },
    { href: "/visits", label: "Посещения", icon: CalendarCheck },
  ];

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={onClick}
          className={`px-3 py-1 rounded-md inline-flex items-center gap-2 ${pathname === l.href ? "bg-accent" : "hover:bg-accent"}`}
        >
          {l.icon ? <l.icon className="size-4" /> : null}
          {l.label}
        </Link>
      ))}
    </>
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur border-b">
      <div className="mx-auto max-w-5xl p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-semibold hover:underline">
            {brand.nameBg}
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <NavLinks />
          <GlobalSearch />
        </div>
        <button className="md:hidden p-2" aria-label="Меню" onClick={() => setOpen((o) => !o)}>
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t bg-background">
          <div className="mx-auto max-w-5xl p-2 flex flex-col gap-1">
            <NavLinks onClick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}


