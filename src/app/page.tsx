"use client";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { brand } from "@/lib/brand";

export default function HomePage() {
  const tasks = useQuery(api.tasks.get);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
       <h1 className="text-3xl font-bold mb-4">{brand.nameBg}</h1>
       <div className="space-x-4">
         <a href="/owners" className="underline">Собственици</a>
         <a href="/animals" className="underline">Животни</a>
       </div>
       <div className="mt-4">
         {tasks?.map(({ _id, text }: { _id: string; text: string }) => <div key={_id}>{text}</div>)}
       </div>
    </main>
  );
}
