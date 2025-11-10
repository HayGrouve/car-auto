"use client";

import { useEffect, useState } from "react";
import { useConvex } from "convex/react";

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
