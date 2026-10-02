import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "CashReady — AI লিকুইডিটি প্ল্যানার (upay)",
  description: "মোবাইল মানি (MFS) এজেন্টদের জন্য স্মার্ট ক্যাশ ও ই-ফ্লোট লিকুইডিটি প্ল্যানার",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-shell text-slate-900 flex flex-col antialiased">
        <Navigation />
        <main className="flex-1 pb-24 md:pb-12 pt-4 px-4 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
