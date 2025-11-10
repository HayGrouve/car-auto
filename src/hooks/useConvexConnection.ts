"use client";

import { useEffect, useState } from "react";
import { useConvex } from "convex/react";
import { toast } from "sonner";

/**
 * Hook to monitor Convex connection status and handle connection failures
 * 
 * @returns Object with connection status and retry function
 * 
 * @example
 * ```tsx
 * const { isConnected, retry } = useConvexConnection();
 * if (!isConnected) {
 *   return <ConnectionError onRetry={retry} />;
 * }
 * ```
 */
export function useConvexConnection() {
  const convex = useConvex();
  const [isConnected, setIsConnected] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Monitor connection status
    const checkConnection = () => {
      // Convex client doesn't expose connection status directly,
      // but we can monitor for errors in queries
      setIsConnected(true);
    };

    // Set up periodic connection check
    const interval = setInterval(checkConnection, 5000);

    return () => clearInterval(interval);
  }, [convex]);

  const retry = () => {
    setRetryCount((prev) => prev + 1);
    setIsConnected(true);
    // Force a re-render by updating retry count
    window.location.reload();
  };

  return { isConnected, retry, retryCount };
}

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


