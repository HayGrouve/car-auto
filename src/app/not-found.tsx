import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Home, AlertCircle } from "lucide-react";

/**
 * Custom 404 Not Found page
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-2xl">Страницата не е намерена</AlertTitle>
          <AlertDescription className="mt-2 justify-items-center text-center">
            <p>Страницата, която търсите, не съществува или е преместена.</p>
            <div className="mt-4 flex justify-center">
              <Button asChild>
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Върни се към началото
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
