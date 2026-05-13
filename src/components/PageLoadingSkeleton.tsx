/** Server-safe pending UI for App Router `loading.tsx` segments. */
export default function PageLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 py-2" aria-hidden="true">
      <div className="bg-muted h-8 max-w-xs rounded-md" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-transparent py-3"
          >
            <div className="bg-muted h-4 flex-1 rounded sm:max-w-[50%]" />
            <div className="bg-muted h-4 w-24 shrink-0 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
