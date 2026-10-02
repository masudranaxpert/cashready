import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "CashReady — AI লিকুইডিটি প্ল্যানার (upay)",
  description: "মোবাইল মানি (MFS) এজেন্টদের জন্য স্মার্ট ক্যাশ ও ই-ফ্লোট লিকুইডিটি প্ল্যানার",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0B1120",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <body className="min-h-screen bg-navy-900 text-slate-100 flex flex-col antialiased selection:bg-teal-500/20 selection:text-teal-300 overflow-x-hidden">
        <Navigation />
        <main className="flex-1 safe-page-pad pb-36 sm:pb-32 md:pb-12 pt-3 sm:pt-4 px-3 sm:px-6 w-full max-w-full overflow-x-hidden">
          {children}
          {/* Dedicated mobile clearance spacer */}
          <div className="h-6 md:hidden w-full pointer-events-none" aria-hidden="true" />
        </main>
      </body>
    </html>
  );
}
