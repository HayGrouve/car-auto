"use client";

/**
 * Component to display connection error message
 */
export function ConvexConnectionError({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="text-destructive">
          <h2 className="text-lg font-semibold">
            Проблем с връзката към сървъра
          </h2>
          <p className="mt-2 text-sm">
            Не можем да се свържем с базата данни. Моля, проверете вашата
            интернет връзка и опитайте отново.
          </p>
        </div>
        <button
          onClick={onRetry}
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Опитай отново
        </button>
      </div>
    </div>
  );
}

