"use client";
import { brand } from "@/lib/brand";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white space-y-4">
       <h1 className="text-3xl font-bold">{brand.nameBg}</h1>
    </main>
  );
}
