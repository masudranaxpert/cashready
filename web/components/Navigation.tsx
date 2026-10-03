"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCheck, MapPin, BarChart3 } from "lucide-react";
import { useLang, LangToggle } from "@/lib/lang";

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
      {/* Desktop Top Header Navigation */}
      <header className="sticky top-0 z-30 w-full bg-navy-900/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xl tracking-tight text-slate-100">
              CashReady
            </span>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Main navigation">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href === "/agent" && pathname === "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-transform duration-100 active:scale-[0.98] ${
                      isActive
                        ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-soft"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-teal-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <LangToggle />
          </div>
        </div>
      </header>

      {/* Mobile Floating Bottom Bar with Safe-Area Clearance */}
      <nav
        className="md:hidden fixed bottom-5 safe-nav-bottom left-1/2 -translate-x-1/2 z-40 bg-navy-850/95 backdrop-blur-md rounded-full px-2 py-1 shadow-soft-lg border border-slate-800 flex items-center gap-1 max-w-[calc(100vw-1.5rem)]"
        aria-label="Mobile navigation"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/agent" && pathname === "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 min-h-[44px] px-2.5 min-[380px]:px-3 py-1.5 rounded-full text-xs min-[390px]:text-sm font-medium transition-transform duration-100 active:scale-[0.98] ${
                isActive
                  ? "bg-slate-800 text-slate-100 border border-slate-700/80 shadow-soft"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-teal-400" : "text-slate-400"}`} />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
