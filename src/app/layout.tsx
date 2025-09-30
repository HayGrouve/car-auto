import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { brand } from "@/lib/brand";
import { Toaster } from "sonner";
import { AppNav } from "@/components/app-nav";
import { Footer } from "@/components/ui/Footer";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
          <a href="#main" className="sr-only focus:not-sr-only fixed top-2 left-2 z-50 bg-background border px-3 py-1 rounded">Към съдържание</a>
          <AppNav />
          <div className="pt-14 min-h-screen flex flex-col">
            <main id="main" className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster richColors position="top-center" />
          <KeyboardShortcuts />
        </ConvexClientProvider>
      </body>
    </html>
  );
}