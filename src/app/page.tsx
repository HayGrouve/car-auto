"use client";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function HomePage() {
  const tasks = useQuery(api.tasks.get);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
       {tasks?.map(({ _id, text }: { _id: string; text: string }) => <div key={_id}>{text}</div>)}
    </main>
  );
}
