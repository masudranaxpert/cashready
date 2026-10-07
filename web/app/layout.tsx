import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { WelcomeIntro } from "@/components/WelcomeIntro";
import { LangProvider } from "@/lib/lang";
import { ThemeProvider } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "CashReady: AI Liquidity Planner (upay)",
    template: "%s | CashReady",
  },
  description:
    "Smart cash & e-float liquidity planner for mobile-money (MFS) agents for AI DEV FEST 2026, Track 05.",
  openGraph: {
    title: "CashReady: AI Liquidity Planner (upay)",
    description: "Automated Liquidity Management & Decision Support for MFS Agents",
    type: "website",
  },
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
    <html lang="bn" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-navy-950 text-slate-100 flex flex-col antialiased selection:bg-teal-500/20 selection:text-teal-300 overflow-x-hidden transition-colors duration-200">
        <ThemeProvider>
          <LangProvider>
            <WelcomeIntro />
            <Navigation />
            <main className="flex-1 safe-page-pad pb-36 sm:pb-32 md:pb-12 pt-3 sm:pt-4 px-3 sm:px-6 w-full max-w-full overflow-x-hidden">
              {children}
              <div className="h-6 md:hidden w-full pointer-events-none" aria-hidden="true" />
            </main>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
