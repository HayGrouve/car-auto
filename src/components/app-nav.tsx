"use client";
import Link from "next/link";
import Image from "next/image";
import logoJpg from "@/../public/logo.jpg";
import { usePathname } from "next/navigation";
import { brand } from "@/lib/brand";
import { Menu, PawPrint, User, CalendarCheck, FileText, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const GlobalSearch = dynamic(() => import("@/components/GlobalSearch"), {
  ssr: false,
});

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
          className={`inline-flex items-center gap-2 rounded-md px-3 py-1 cursor-pointer ${pathname === l.href ? "bg-accent" : "hover:bg-accent"}`}
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
            className="inline-flex items-center gap-2 font-semibold hover:underline cursor-pointer"
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
          <GlobalSearch />
        </div>
        <button
          className="p-2 md:hidden cursor-pointer"
          aria-label="Меню"
          onClick={() => setOpen((o) => !o)}
        >
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="bg-background border-t md:hidden">
          <div className="mx-auto flex max-w-5xl flex-col gap-1 p-2">
            <NavLinks onClick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
