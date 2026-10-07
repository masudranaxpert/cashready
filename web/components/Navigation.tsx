"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserCheck, MapPin, BarChart3, BookOpen, LogOut, LogIn, ShieldCheck } from "lucide-react";
import { useLang, LangToggle } from "@/lib/lang";
import { ThemeToggle } from "@/lib/theme";

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
      try { window.sessionStorage.removeItem("cashready_welcome_shown"); } catch {}
      window.location.href = "/login";
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
    if (session.role === "admin") return lang === "bn" ? "অ্যাডমিন" : "Admin";
    if (session.role === "manager") return `Manager (${session.id || "A01"})`;
    if (session.role === "agent") return `Agent (${session.id || "T0039"})`;
    return session.role;
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-navy-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] transition-colors">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/agent"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("cashready:replay-intro"));
              }}
              className="group flex items-center gap-2.5 transition-transform duration-150 active:scale-[0.98]"
              aria-label="CashReady home"
              title={lang === "bn" ? "স্বাগতম বার্তা দেখতে ক্লিক করুন" : "Click to view Welcome Intro"}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-glow-emerald/40 shadow-sm border border-emerald-300/40 group-hover:scale-105 transition-transform">
                ৳
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight flex items-center gap-1.5">
                  CashReady

                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-tight hidden sm:block">
                  upay × DIU CPC Hackathon
                </span>
              </div>
            </Link>

            {/* Docs link */}
            <a
              href="/docs/"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
              <span>Docs</span>
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 dark:bg-navy-900/70 p-1 rounded-full border border-slate-200 dark:border-white/[0.08]" aria-label="Main navigation">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href === "/agent" && pathname === "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.97] ${
                      isActive
                        ? "bg-emerald-600 text-white dark:bg-emerald-500/15 dark:text-emerald-300 dark:border dark:border-emerald-500/30 shadow-sm shadow-emerald-600/10"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <ThemeToggle />
            <LangToggle />

            {/* Session / Role Badge & Action */}
            {session.authenticated ? (
              <div className="flex items-center gap-1.5 pl-1">
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>{getRoleLabel()}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-full text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{lang === "bn" ? "লগআউট" : "Logout"}</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{lang === "bn" ? "লগইন" : "Login"}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <nav
        className="md:hidden fixed bottom-5 safe-nav-bottom left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-navy-950/85 backdrop-blur-2xl rounded-full p-1.5 shadow-2xl border border-slate-200 dark:border-white/[0.12] flex items-center gap-1 max-w-[calc(100vw-1.5rem)]"
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
                  ? "bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/35 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`} />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
        <a
          href="/docs/"
          className="flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-teal-400 shrink-0" />
          <span className="whitespace-nowrap">Docs</span>
        </a>
      </nav>
    </>
  );
}
