"use client";

import { useLang } from "@/lib/lang";

export function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-slate-800/60 rounded-xl animate-pulse ${className ?? ""}`} />;
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
    <div className="card-soft text-center py-8 px-4 my-4">
      <p className="text-slate-300 font-medium mb-4 text-base">{message || t.loadError}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary text-sm min-h-[40px] px-4"
        >
          {t.retry}
        </button>
      )}
    </div>
  );
}
