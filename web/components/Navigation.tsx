"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCheck, MapPin, BarChart3 } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/agent", label: "এজেন্ট", icon: UserCheck },
  { href: "/area", label: "এরিয়া", icon: MapPin },
  { href: "/evidence", label: "প্রমাণ", icon: BarChart3 },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Top Header Navigation */}
      <header className="sticky top-0 z-30 w-full bg-shell/80 backdrop-blur-md border-b border-slate-200/60">
        {/* Subtle teal atmosphere wash behind top header only */}
        <div className="absolute inset-0 bg-teal-wash pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xl tracking-tight text-slate-900">
              CashReady
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
              উপায় AI লিকুইডিটি
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1.5" aria-label="প্রধান নেভিগেশন">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href === "/agent" && pathname === "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-transform duration-100 active:scale-[0.98] ${
                    isActive
                      ? "bg-black text-white shadow-soft"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Floating Bottom Bar */}
      <nav
        className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md rounded-full px-3 py-1.5 shadow-soft-lg border border-slate-200/80 flex items-center gap-1"
        aria-label="মোবাইল নেভিগেশন"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/agent" && pathname === "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-full text-sm font-medium transition-transform duration-100 active:scale-[0.98] ${
                isActive
                  ? "bg-black text-white shadow-soft"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
