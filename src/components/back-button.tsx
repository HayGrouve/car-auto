"use client";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackButton({ label = "Назад" }: { label?: string }) {
  const router = useRouter();
  return (
    <Button variant="outline" className="gap-2" onClick={() => router.back()}>
      <ArrowLeft className="size-4" />
      <span>{label}</span>
    </Button>
  );
}
