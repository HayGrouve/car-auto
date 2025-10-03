"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string | number;
  href: string;
  icon?: React.ReactNode;
  className?: string;
  description?: React.ReactNode;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
};

const trendStyles: Record<NonNullable<MetricCardProps["trend"]>["direction"], string> = {
  up: "text-emerald-600",
  down: "text-red-600",
  neutral: "text-muted-foreground",
};

export function MetricCard({
  label,
  value,
  href,
  icon,
  className,
  description,
  trend,
}: MetricCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg border bg-card text-card-foreground p-4 transition-colors shadow-sm hover:bg-accent",
        className
      )}
      aria-label={label}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
            {icon}
            <span>{label}</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">{value}</div>
          {trend ? (
            <div className={cn("text-xs font-medium", trendStyles[trend.direction])}>
              {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "•"} {trend.value}
            </div>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground underline underline-offset-2">Виж</span>
      </div>
      {description ? <div className="mt-2 text-xs text-muted-foreground">{description}</div> : null}
    </Link>
  );
}