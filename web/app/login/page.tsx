"use client";

import { useState } from "react";
import { ShieldCheck, UserCheck, MapPin, ArrowRight, Loader2, Lock } from "lucide-react";
import { useLang } from "@/lib/lang";

export default function LoginPage() {
  const { lang } = useLang();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const handleLogin = async (role: "admin" | "manager" | "agent") => {
    if (loadingRole) return;
    setLoadingRole(role);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        window.location.href = role === "manager" ? "/area" : "/agent";
      }
    } catch (err) {
      console.error("Login failed:", err);
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg card-soft p-6 sm:p-8 shadow-soft-xl border border-slate-200 dark:border-white/[0.08]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 mb-4 shadow-soft">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {lang === "bn" ? "ভূমিকা নির্বাচন করুন (লগইন)" : "Select Demo Role (Sign In)"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
            {lang === "bn"
              ? "CashReady রোল-বেসড অ্যাক্সেস কন্ট্রোল সমর্থন করে। বিচারক বা নির্দিষ্ট ব্যবহারকারী হিসেবে এক ক্লিকে প্রবেশ করুন।"
              : "CashReady enforces role-scoped security. Sign in with one click as an evaluator, territory manager, or retail agent."}
          </p>
        </div>

        <div className="space-y-4">
          {/* 1. Judge / Admin button - First & Largest */}
          <button
            onClick={() => handleLogin("admin")}
            disabled={loadingRole !== null}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white rounded-xl p-5 text-left transition-all duration-150 shadow-soft-lg border border-teal-400/30 active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm text-white">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">
                      {lang === "bn" ? "অ্যাডমিন" : "Admin"}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white/20 text-white uppercase tracking-wider">
                      {lang === "bn" ? "প্রস্তাবিত" : "Full Access"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-teal-100/90 mt-0.5">
                    {lang === "bn"
                      ? "সকল এজেন্ট, এরিয়া এবং গ্লোবাল মডেল মেট্রিক্স দেখার পূর্ণ ক্ষমতা"
                      : "Unrestricted access across all agents, areas, and model evidence metrics"}
                  </p>
                </div>
              </div>
              <div>
                {loadingRole === "admin" ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
                )}
              </div>
            </div>
          </button>

          {/* 2. Area Manager A01 */}
          <button
            onClick={() => handleLogin("manager")}
            disabled={loadingRole !== null}
            className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-navy-900/80 dark:hover:bg-navy-900 border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] text-slate-800 dark:text-slate-200 rounded-xl p-4 text-left transition-all duration-150 shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-semibold text-base text-slate-900 dark:text-slate-100">
                    {lang === "bn" ? "এরিয়া ম্যানেজার (Area Manager - A01)" : "Area Manager (A01 - Urban)"}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {lang === "bn"
                      ? "শুধুমাত্র A01 এরিয়ার ক্লাস্টার রিস্ক ও নিজস্ব এজেন্ট তালিকা দেখার অনুমতি"
                      : "Scoped strictly to Area A01 agents and cluster shortfall risk"}
                  </p>
                </div>
              </div>
              <div>
                {loadingRole === "manager" ? (
                  <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
          </button>

          {/* 3. MFS Agent T0039 */}
          <button
            onClick={() => handleLogin("agent")}
            disabled={loadingRole !== null}
            className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-navy-900/80 dark:hover:bg-navy-900 border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] text-slate-800 dark:text-slate-200 rounded-xl p-4 text-left transition-all duration-150 shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-semibold text-base text-slate-900 dark:text-slate-100">
                    {lang === "bn" ? "MFS এজেন্ট (Agent - T0039)" : "MFS Agent (T0039)"}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {lang === "bn"
                      ? "শুধুমাত্র নিজস্ব সকালের ক্যাশ প্ল্যান ও SHAP ব্যাখ্যা দেখার অনুমতি"
                      : "Scoped strictly to Agent T0039 liquidity plan and feedback"}
                  </p>
                </div>
              </div>
              <div>
                {loadingRole === "agent" ? (
                  <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
