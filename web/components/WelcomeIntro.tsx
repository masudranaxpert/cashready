"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLang } from "@/lib/lang";
import { useTheme } from "@/lib/theme";
import { Sparkles, ArrowRight } from "lucide-react";

const STORAGE_KEY = "cashready_welcome_shown";

export function WelcomeIntro() {
  const { lang } = useLang();
  const { theme } = useTheme();

  // 0: Brand
  // 1: Personal Welcome
  // 2: Product Message (Part 1 & 2)
  // 3: Value Proposition
  // 4: Final Transition
  // 5: Complete (Fading out)
  const [stage, setStage] = useState<number>(0);
  const [messagePart2Visible, setMessagePart2Visible] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);

  const dismissIntro = useCallback(() => {
    clearAllTimers();
    setIsFadingOut(true);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // sessionStorage might be restricted in some privacy modes
    }
    const t = setTimeout(() => {
      setIsVisible(false);
    }, 450);
    timerRef.current.push(t);
  }, [clearAllTimers]);

  useEffect(() => {
    // Check if previously shown in this session
    try {
      const alreadyShown = window.sessionStorage.getItem(STORAGE_KEY);
      if (alreadyShown === "1") {
        return;
      }
    } catch {
      // Ignore storage errors
    }

    // Check reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    setIsVisible(true);

    const reduced = mediaQuery.matches;

    // Orchestrate smooth stages:
    // Stage 0: 0.0s - 0.8s
    // Stage 1: 0.8s - 1.8s
    // Stage 2: 1.8s - 3.4s (Line 1 at 1.8s, Line 2 at 2.6s)
    // Stage 3: 3.4s - 4.4s
    // Stage 4: 4.4s - 5.0s
    // Dismiss: 5.0s
    const t1 = setTimeout(() => {
      setStage(1);
    }, reduced ? 400 : 850);

    const t2 = setTimeout(() => {
      setStage(2);
    }, reduced ? 900 : 1850);

    const t2Sub = setTimeout(() => {
      setMessagePart2Visible(true);
    }, reduced ? 1100 : 2550);

    const t3 = setTimeout(() => {
      setStage(3);
    }, reduced ? 1500 : 3450);

    const t4 = setTimeout(() => {
      setStage(4);
    }, reduced ? 1900 : 4450);

    const tDismiss = setTimeout(() => {
      dismissIntro();
    }, reduced ? 2300 : 5150);

    timerRef.current = [t1, t2, t2Sub, t3, t4, tDismiss];

    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers, dismissIntro]);

  if (!isVisible) {
    return null;
  }

  const isBn = lang === "bn";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isBn ? "CashReady স্বাগতম বার্তা" : "CashReady Welcome Introduction"}
      onClick={dismissIntro}
      className={`fixed inset-0 z-50 flex items-center justify-center select-none cursor-pointer overflow-hidden transition-all duration-500 ease-out ${
        isFadingOut
          ? "opacity-0 scale-[1.02] pointer-events-none"
          : "opacity-100 scale-100"
      } ${
        theme === "light"
          ? "bg-slate-50/95 text-slate-900"
          : "bg-navy-950/98 text-white"
      }`}
    >
      {/* Subtle ambient fintech glow backdrop */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] sm:w-[680px] h-[480px] sm:h-[680px] rounded-full bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-transparent blur-3xl pointer-events-none transition-all duration-700"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none"
        aria-hidden="true"
      />

      {/* Top action: subtle Skip button */}
      <div className="absolute top-5 right-5 sm:top-7 sm:right-8 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismissIntro();
          }}
          className={`group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all duration-150 active:scale-95 ${
            theme === "light"
              ? "bg-white/80 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white shadow-sm"
              : "bg-navy-900/80 border-white/[0.08] text-slate-400 hover:text-white hover:bg-navy-850 shadow-sm"
          }`}
          aria-label={isBn ? "স্বাগতম বার্তা এড়িয়ে যান" : "Skip welcome intro"}
        >
          <span>{isBn ? "এড়িয়ে যান" : "Skip"}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Main Content Area */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 max-w-lg w-full px-6 sm:px-8 text-center flex flex-col items-center justify-center min-h-[260px]"
      >
        {/* ================= SCREEN 1: BRAND ================= */}
        {stage === 0 && (
          <div
            className={`flex flex-col items-center gap-4 ${
              isReducedMotion
                ? "transition-opacity duration-150"
                : "animate-fade-in"
            }`}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 flex items-center justify-center text-slate-950 font-black text-3xl sm:text-4xl shadow-glow-emerald/50 shadow-xl border border-emerald-300/40">
              ৳
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 dark:from-emerald-300 dark:via-teal-200 dark:to-emerald-400">
                CashReady
              </h1>
              <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                {isBn ? "এআই লিকুইডিটি প্ল্যানার" : "AI Liquidity Planner"}
              </p>
            </div>
          </div>
        )}

        {/* ================= SCREEN 2: PERSONAL WELCOME ================= */}
        {stage === 1 && (
          <div
            className={`space-y-3 ${
              isReducedMotion
                ? "transition-opacity duration-150"
                : "animate-fade-in"
            }`}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 mb-2">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>upay AI Planner</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              {isBn ? "স্বাগতম 👋" : "Welcome back 👋"}
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              {isBn
                ? "আপনার ব্যবসা আজ প্রস্তুত।"
                : "Your business is ready for today."}
            </p>
          </div>
        )}

        {/* ================= SCREEN 3: PRODUCT MESSAGE ================= */}
        {stage === 2 && (
          <div
            className={`space-y-4 ${
              isReducedMotion
                ? "transition-opacity duration-150"
                : "animate-fade-in"
            }`}
          >
            <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              {isBn ? "আপনার গ্রাহকরা আজ প্রস্তুত।" : "Your customers are ready."}
            </div>
            <div
              className={`text-lg sm:text-xl md:text-2xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight transition-all duration-500 ${
                messagePart2Visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              {isBn
                ? "আপনার ক্যাশও প্রস্তুত থাকুক।"
                : "Let's make sure your cash is ready too."}
            </div>
          </div>
        )}

        {/* ================= SCREEN 4: VALUE PROPOSITION ================= */}
        {stage === 3 && (
          <div
            className={`space-y-3.5 ${
              isReducedMotion
                ? "transition-opacity duration-150"
                : "animate-fade-in"
            }`}
          >
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {isBn ? "সঠিক পরিকল্পনা।" : "Plan smarter."}
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-300 dark:via-teal-300 dark:to-emerald-400 tracking-tight">
                {isBn ? "স্মার্ট লিকুইডিটি।" : "Stay liquid."}
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto pt-1">
              {isBn
                ? "ক্যাশরেডি আপনাকে সঠিক সময়ে সঠিক নগদ প্রস্তুত রাখতে সাহায্য করে।"
                : "CashReady helps you prepare the right amount of cash at the right time."}
            </p>
          </div>
        )}

        {/* ================= SCREEN 5: FINAL TRANSITION ================= */}
        {stage === 4 && (
          <div
            className={`space-y-2.5 ${
              isReducedMotion
                ? "transition-opacity duration-150"
                : "animate-fade-in"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-glow-emerald/40 shadow-md border border-emerald-300/40 mx-auto mb-2">
              ৳
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              CashReady
            </h2>
            <p className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 tracking-wide">
              {isBn
                ? "আপনার ক্যাশ পরিকল্পনা, আরও স্মার্টভাবে।"
                : "Your liquidity, planned."}
            </p>
          </div>
        )}

        {/* Bottom subtle progress indicator */}
        <div
          className="flex items-center gap-1.5 mt-8"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={stage + 1}
          aria-label={isBn ? `ধাপ ${stage + 1} / ৫` : `Step ${stage + 1} of 5`}
        >
          {[0, 1, 2, 3, 4].map((stepIdx) => (
            <span
              key={stepIdx}
              className={`h-1 rounded-full transition-all duration-300 ${
                stage === stepIdx
                  ? "w-6 bg-emerald-500"
                  : stage > stepIdx
                  ? "w-2 bg-emerald-500/40"
                  : "w-2 bg-slate-300 dark:bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* Tap anywhere hint */}
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-3 select-none">
          {isBn ? "ড্যাশবোর্ডে প্রবেশ করতে চাপুন" : "Tap anywhere to enter dashboard"}
        </p>
      </div>
    </div>
  );
}
