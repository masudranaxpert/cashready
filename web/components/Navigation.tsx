"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCheck, MapPin, BarChart3, Sparkles } from "lucide-react";
import { useLang, LangToggle } from "@/lib/lang";
import { ThemeToggle } from "@/lib/theme";

export function Navigation() {
  const pathname = usePathname();
  const { t } = useLang();

  const navItems = [
    { href: "/agent", label: t.navAgent, icon: UserCheck },
    { href: "/area", label: t.navArea, icon: MapPin },
    { href: "/evidence", label: t.navEvidence, icon: BarChart3 },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-navy-950/85 backdrop-blur-xl border-b border-white/[0.08] transition-colors">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/agent"
              className="group flex items-center gap-2.5 transition-transform duration-150 active:scale-[0.98]"
              aria-label="CashReady home"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-glow-emerald/40 shadow-sm border border-emerald-300/40 group-hover:scale-105 transition-transform">
                ৳
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  CashReady
                  <span className="hidden min-[400px]:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="w-2.5 h-2.5" />
                    AI MFS
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-tight -mt-0.5 hidden sm:block">
                  upay × DIU CPC Hackathon
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <nav className="hidden md:flex items-center gap-1 bg-navy-900/70 p-1 rounded-full border border-white/[0.08]" aria-label="Main navigation">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href === "/agent" && pathname === "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.97] ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <ThemeToggle />
            <LangToggle />
          </div>
        </div>
      </header>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <nav
        className="md:hidden fixed bottom-5 safe-nav-bottom left-1/2 -translate-x-1/2 z-40 bg-navy-950/85 backdrop-blur-2xl rounded-full p-1.5 shadow-2xl border border-white/[0.12] flex items-center gap-1 max-w-[calc(100vw-1.5rem)]"
        aria-label="Mobile navigation"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/agent" && pathname === "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.95] ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
