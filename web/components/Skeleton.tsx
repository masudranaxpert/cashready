"use client";

import { useLang } from "@/lib/lang";
import { AlertCircle, RotateCcw } from "lucide-react";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`bg-slate-800/40 dark:bg-slate-800/40 light:bg-slate-200/70 border border-white/[0.04] dark:border-white/[0.04] light:border-slate-200 rounded-2xl animate-pulse ${className ?? ""}`}
    />
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="card-soft text-center py-10 px-6 my-4 border border-rose-500/20 bg-rose-950/10 max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-3 shadow-sm">
        <AlertCircle className="w-6 h-6" />
      </div>
      <p className="text-slate-200 font-bold mb-4 text-base">{message || t.loadError}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-primary text-sm min-h-[44px] px-6 inline-flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t.retry}</span>
        </button>
      )}
    </div>
  );
}
