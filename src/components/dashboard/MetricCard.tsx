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

const trendStyles: Record<
  NonNullable<MetricCardProps["trend"]>["direction"],
  string
> = {
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
        "bg-card text-card-foreground hover:bg-accent rounded-lg border p-4 shadow-sm transition-colors",
        className,
      )}
      aria-label={label}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            {icon}
            <span>{label}</span>
          </div>
          <div className="mt-2 text-2xl font-semibold">{value}</div>
          {trend ? (
            <div
              className={cn(
                "text-xs font-medium",
                trendStyles[trend.direction],
              )}
            >
              {trend.direction === "up"
                ? "↑"
                : trend.direction === "down"
                  ? "↓"
                  : "•"}{" "}
              {trend.value}
            </div>
          ) : null}
        </div>
        <span className="text-muted-foreground text-xs underline underline-offset-2">
          Виж
        </span>
      </div>
      {description ? (
        <div className="text-muted-foreground mt-2 text-xs">{description}</div>
      ) : null}
    </Link>
  );
}
