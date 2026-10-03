"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("CashReady runtime error:", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
      <div className="card-soft border border-rose-900/50">
        <h2 className="text-xl font-bold text-slate-100">
          কিছু সমস্যা হয়েছে / Something went wrong
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary"
          >
            আবার চেষ্টা করুন / Try again
          </button>
        </div>
      </div>
    </div>
  );
}
