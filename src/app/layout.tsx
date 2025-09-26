import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { brand } from "@/lib/brand";
import { Toaster } from "sonner";
import { AppNav } from "@/components/app-nav";

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
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <AppNav />
          <div className="pt-14">{children}</div>
          <Toaster richColors position="top-center" />
        </ConvexClientProvider>
      </body>
    </html>
  );
}