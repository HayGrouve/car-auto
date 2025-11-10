import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { brand } from "@/lib/brand";
import { Toaster } from "sonner";
import { AppNav } from "@/components/app-nav";
import { Footer } from "@/components/ui/Footer";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { BreadcrumbProvider, Breadcrumbs } from "@/components/breadcrumbs";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: brand.name,
    template: `%s • ${brand.name}`,
  },
  description: `${brand.name} veterinary clinic CRM`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <ErrorBoundary>
            <a
              href="#main"
              className="bg-background sr-only fixed top-2 left-2 z-50 rounded border px-3 py-1 focus:not-sr-only"
            >
              Към съдържание
            </a>
            <BreadcrumbProvider>
              <AppNav />
              <div className="flex min-h-screen flex-col pt-14">
                <main id="main" className="flex-1">
                  <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
                    <Breadcrumbs />
                    {children}
                  </div>
                </main>
                <Footer />
              </div>
            </BreadcrumbProvider>
            <Toaster richColors position="top-center" />
            <KeyboardShortcuts />
          </ErrorBoundary>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
