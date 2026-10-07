"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserCheck, MapPin, BarChart3, BookOpen, LogOut, LogIn, ShieldCheck } from "lucide-react";
import { useLang, LangToggle } from "@/lib/lang";

interface SessionInfo {
  authenticated: boolean;
  role: string | null;
  id: string | null;
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, lang } = useLang();
  const [session, setSession] = useState<SessionInfo>({
    authenticated: false,
    role: null,
    id: null,
  });

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch (err) {
        // Fallback gracefully on local error
      }
    }
    checkSession();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSession({ authenticated: false, role: null, id: null });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navItems = [
    { href: "/agent", label: t.navAgent, icon: UserCheck },
    { href: "/area", label: t.navArea, icon: MapPin },
    { href: "/evidence", label: t.navEvidence, icon: BarChart3 },
  ];

  const getRoleLabel = () => {
    if (!session.authenticated) return null;
    if (session.role === "admin") return lang === "bn" ? "বিচারক / অ্যাডমিন" : "Judge/Admin";
    if (session.role === "manager") return `Manager (${session.id || "A01"})`;
    if (session.role === "agent") return `Agent (${session.id || "T0039"})`;
    return session.role;
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-navy-900/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/agent"
              className="font-bold text-xl tracking-tight text-slate-100 hover:text-teal-300 transition-colors"
              aria-label="CashReady home"
            >
              CashReady
            </Link>

            {/* Docs link */}
            <a
              href="/docs/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-teal-300 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-teal-400" />
              <span>Docs</span>
            </a>
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

            {/* Session / Role Badge & Action */}
            {session.authenticated ? (
              <div className="flex items-center gap-1.5 pl-1">
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-300">
                  <ShieldCheck className="w-3 h-3 text-teal-400" />
                  <span>{getRoleLabel()}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-full text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{lang === "bn" ? "লগআউট" : "Logout"}</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-teal-600/90 hover:bg-teal-500 text-white transition-colors shadow-soft"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{lang === "bn" ? "লগইন" : "Login"}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
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
        <a
          href="/docs/"
          className="flex items-center gap-1.5 min-h-[44px] px-2.5 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-slate-200"
        >
          <BookOpen className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="whitespace-nowrap">Docs</span>
        </a>
      </nav>
    </>
  );
}
