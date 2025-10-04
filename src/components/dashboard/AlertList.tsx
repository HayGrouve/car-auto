"use client";

type AlertListProps = {
  alerts: string[];
  title?: string;
};

export function AlertList({ alerts, title = "Известия" }: AlertListProps) {
  if (!alerts.length) return null;
  return (
    <section
      aria-live="polite"
      className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900"
    >
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        {alerts.map((alert, idx) => (
          <li key={idx}>{alert}</li>
        ))}
      </ul>
    </section>
  );
}
