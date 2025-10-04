"use client";

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3">
          <div className="bg-muted h-4 w-1/2 rounded" />
          <div className="bg-muted h-4 w-24 rounded" />
        </div>
      ))}
    </div>
  );
}
