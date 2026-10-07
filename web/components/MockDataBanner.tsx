"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getIsUsingMockFallback } from "@/lib/api";
import { useLang } from "@/lib/lang";

export function MockDataBanner() {
  const { lang } = useLang();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setShow(getIsUsingMockFallback());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2.5 rounded-xl text-xs sm:text-sm mb-6 flex items-center gap-2.5 shadow-soft">
      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
      <div>
        <span className="font-semibold">
          {lang === "bn" ? "মক ডেটা প্রদর্শিত হচ্ছে" : "Using Mock Fallback Data"}
        </span>
        <span className="text-amber-300/80 ml-1.5">
          {lang === "bn"
            ? "(লাইভ API অফলাইন বা সংযোগ পাওয়া যায়নি; স্বয়ংক্রিয় ব্যাকআপ ডেটা লোড হয়েছে)"
            : "(Live API connection unavailable; fallback demonstration dataset active)"}
        </span>
      </div>
    </div>
  );
}
