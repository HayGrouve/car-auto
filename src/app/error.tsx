"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Възникна грешка</h1>
      <p className="text-muted-foreground text-sm">
        Нещо се обърка при зареждане на страницата. Можете да опитате отново
        или да се върнете към началния екран.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => reset()}>
          Опитай отново
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/">Към началото</Link>
        </Button>
      </div>
    </div>
  );
}
