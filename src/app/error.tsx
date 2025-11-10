"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Home, AlertCircle, RefreshCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Custom error page for unhandled errors (500, etc.)
 * This is a client component that handles errors at the route level
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console or error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Alert className="max-w-md" variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Възникна грешка</AlertTitle>
        <AlertDescription className="mt-2 space-y-4">
          <p>
            Нещо се обърка при зареждането на тази страница. Моля, опитайте
            отново.
          </p>
          {process.env.NODE_ENV === "development" && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium">
                Детайли за грешката (само в режим на разработка)
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                {error.message}
                {error.stack && (
                  <>
                    {"\n\n"}
                    {error.stack}
                  </>
                )}
                {error.digest && (
                  <>
                    {"\n\n"}
                    Digest: {error.digest}
                  </>
                )}
              </pre>
            </details>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Опитай отново
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Начало
              </Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}


