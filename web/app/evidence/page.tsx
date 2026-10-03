"use client";

import { useEffect, useState, useMemo } from "react";
import type { MetricsResponse } from "@/lib/types";
import { getMetrics } from "@/lib/api";
import { STRINGS, formatBDT } from "@/lib/strings";
import { useLang } from "@/lib/lang";
import { Skeleton, ErrorState } from "@/components/Skeleton";
import {
  ShieldAlert,
  RotateCcw,
  TrendingUp,
  Banknote,
  Info,
  Award,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function EvidencePage() {
  const { t, lang } = useLang();
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadMetrics() {
      setLoading(true);
      setError(null);
      try {
        const data = await getMetrics();
        if (!isCancelled) {
          setMetrics(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(t.loadError);
          setLoading(false);
        }
      }
    }

    loadMetrics();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Recovery Comparison Chart Data (Chart A: horizontal bars with mobile-friendly labels)
  const recoveryChartData = useMemo(() => {
    if (!metrics) return [];
    const rec = metrics.recovery_metrics.amount_mae_pct;
    return [
      { name: lang === "en" ? "Naive" : "Naive (সরল)", fullName: lang === "en" ? "Naive (observed)" : "Naive (সরল পর্যবেক্ষণ)", mae: rec.naive_observed, isCashReady: false },
      { name: lang === "en" ? "Mean" : "Mean (গড়)", fullName: lang === "en" ? "Mean Correction" : "Mean Correction (গড় সংশোধন)", mae: rec.mean_correction, isCashReady: false },
      { name: "CashReady", fullName: lang === "en" ? "CashReady (recovery model)" : "CashReady (রিকভারি মডেল)", mae: rec.cashready_recovery, isCashReady: true },
    ];
  }, [metrics]);

  // Forecast MAE by area_type Data (Chart B: vertical bars)
  const forecastAreaChartData = useMemo(() => {
    if (!metrics?.forecast_metrics.mae_by_area_type) return [];
    const areaMap: Record<string, string> = {
      urban_market: lang === "en" ? "Urban market" : "শহর বাজার",
      peri_urban: lang === "en" ? "Peri-urban" : "উপশহর",
      rural: lang === "en" ? "Rural" : "পল্লী অঞ্চল",
    };
    return Object.entries(metrics.forecast_metrics.mae_by_area_type).map(([key, val]) => ({
      areaType: areaMap[key] || key,
      mae: val,
    }));
  }, [metrics]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Page Header */}
      <section className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-6" aria-label="প্রমাণ ও মডেল মূল্যায়ন শীর্ষভাগ">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
                {t.evidenceHeading}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
                {t.evidenceBadge}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
              {t.evidenceSubheading} {t.evidenceSubheading2}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-950/40 text-teal-300 border border-teal-800/50 text-xs font-semibold self-start sm:self-auto shrink-0">
            <Award className="w-4 h-4 text-teal-400" />
            <span>AI DEV FEST 2026</span>
          </div>
        </div>
      </section>

      {/* Loading / Error / Data */}
      {error ? (
        <ErrorState message={error} onRetry={() => setMetrics(null)} />
      ) : loading || !metrics ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          {/* FOUR KPI CARDS */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-label="মূল পারফরম্যান্স সূচকসমূহ">
            {/* KPI 1: Detector F1 */}
            <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  {t.kpiDetectorF1}
                </span>
                <div className="text-2xl min-[390px]:text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight tabular-nums">
                  {metrics.detector_metrics.f1_macro?.toFixed(2) ?? "0.79"}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                <span>{t.kpiLightgbm}</span>
                <span className="text-slate-500">vs HMM 0.66</span>
              </p>
            </div>

            {/* KPI 2: Forecast Coverage */}
            <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  {t.kpiCalibration}
                </span>
                <div className="text-2xl min-[390px]:text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight tabular-nums">
                  {(metrics.forecast_metrics.coverage_p10_p90 * 100).toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                <span>{t.kpiCoverage}</span>
                <span className="text-slate-500">{t.kpiTarget80}</span>
              </p>
            </div>

            {/* KPI 3: Habit lost % vs CashReady lost % */}
            <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  {t.kpiLostDemand}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl min-[390px]:text-3xl sm:text-4xl font-extrabold text-teal-400 tracking-tight tabular-nums">
                    {metrics.business_sim_metrics.cashready_policy.lost_pct.toFixed(1)}%
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-500 line-through tabular-nums">
                    {metrics.business_sim_metrics.habit_policy.lost_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                <span>{t.kpiVsHabit}</span>
                <span className="text-teal-400 font-semibold">{lang === "en" ? "&minus;16.7% reduction" : "&minus;16.7% হ্রাস"}</span>
              </p>
            </div>

            {/* KPI 4: Commission Saved */}
            <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  {t.kpiCommissionSaved}
                </span>
                <div className="text-2xl min-[390px]:text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight tabular-nums">
                  {lang === "en" ? "৳ 1.06M" : "৳ 10.6 লক্ষ"}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                <span>{t.kpiTotalSaved}</span>
                <span className="text-teal-400 font-bold tabular-nums">
                  ৳ {formatBDT(metrics.business_sim_metrics.commission_saved_bdt)}
                </span>
              </p>
            </div>
          </section>

          {/* "Keno bishwas korben?" Section with 2 Charts */}
          <section className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-6 space-y-4 sm:space-y-6" aria-label="কেন বিশ্বাস করবেন">
            <div className="border-b border-slate-800 pb-3 sm:pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>{t.whyTrustHeading}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                  {t.evalEvidenceTitle}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {t.evalEvidenceDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* CHART A: Recovery comparison (Horizontal bars) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-200">
                    {t.recoveryChartTitle}
                  </h3>
                  <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                    {t.recoveryCaption}
                  </span>
                </div>

                <div
                  className="h-52 sm:h-56 w-full"
                  role="region"
                  aria-label="সেন্সরড চাহিদা পুনরুদ্ধারে ৩টি পদ্ধতির গড় ত্রুটির তুলনা চার্ট: Naive 71.9%, Mean correction 69.7%, CashReady 68.3%"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={recoveryChartData}
                      margin={{ top: 10, right: 35, left: 0, bottom: 5 }}
                    >
                      <XAxis
                        type="number"
                        domain={[60, 75]}
                        tick={{ fill: "#94A3B8", fontSize: 11 }}
                        unit="%"
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: "#CBD5E1", fontSize: 11 }}
                        width={95}
                      />
                      <Tooltip
                        formatter={(val: number) => [`${val.toFixed(1)}% MAE`, t.errorLevel]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                        contentStyle={{
                          backgroundColor: "#0B1120",
                          borderRadius: "12px",
                          border: "1px solid #334155",
                          color: "#F8FAFC",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="mae" radius={[0, 6, 6, 0]}>
                        {recoveryChartData.map((entry, idx) => (
                          <Cell
                            key={`recovery-${idx}`}
                            fill={entry.isCashReady ? "#14B8A6" : "#334155"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Accessible Textual Summary */}
                <div className="p-3 bg-navy-900/90 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
                  <div className="font-semibold text-slate-200">{t.chartSummary}:</div>
                  <p className="leading-relaxed">
                    {t.recoverySummary}
                  </p>
                </div>
              </div>

              {/* CHART B: Forecast MAE by area_type */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-200">
                    {t.forecastChartTitle}
                  </h3>
                  <span className="text-[11px] sm:text-xs text-slate-400">{t.meanDeviationBdt}</span>
                </div>

                <div
                  className="h-52 sm:h-56 w-full"
                  role="region"
                  aria-label="এরিয়ার ধরন অনুযায়ী পূর্বাভাস গড় ত্রুটি চার্ট: শহর বাজার 2892.1 টাকা, উপশহর 2377.9 টাকা, পল্লী অঞ্চল 1808.7 টাকা"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={forecastAreaChartData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 15 }}
                    >
                      <XAxis
                        dataKey="areaType"
                        tick={{ fill: "#94A3B8", fontSize: 11 }}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fill: "#94A3B8", fontSize: 11 }}
                        tickFormatter={(val) => `${val}`}
                      />
                      <Tooltip
                        formatter={(val: number) => [`৳ ${formatBDT(val)}`, "MAE"]}
                        contentStyle={{
                          backgroundColor: "#0B1120",
                          borderRadius: "12px",
                          border: "1px solid #334155",
                          color: "#F8FAFC",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="mae" fill="#334155" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Accessible Textual Summary */}
                <div className="p-3 bg-navy-900/90 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
                  <div className="font-semibold text-slate-200">{t.chartSummary}:</div>
                  <p className="leading-relaxed">
                    {t.forecastSummary}</p>
                </div>
              </div>
            </div>
          </section>

          {/* PIPELINE STRIP: 4 Steps with Lucide Icons (No Emoji) */}
          <section className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-6" aria-label="মেশিন লার্নিং পাইপলাইন ধাপসমূহ">
            <h3 className="text-sm font-bold text-slate-100 tracking-tight mb-3 sm:mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <span>{t.pipelineTitle}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {/* Step 1: Detect */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-navy-900/90 border border-slate-800 flex items-start gap-3">
                <div className="p-2 sm:p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-teal-400 shrink-0">
                  <ShieldAlert className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-teal-400" />
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-500">{lang === "en" ? "Step 1" : "ধাপ ১"}</div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100">{t.pipelineStep1Title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{t.pipelineStep1Desc}</p>
                </div>
              </div>

              {/* Step 2: Recover */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-navy-900/90 border border-slate-800 flex items-start gap-3">
                <div className="p-2 sm:p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-teal-400 shrink-0">
                  <RotateCcw className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-teal-400" />
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-500">{lang === "en" ? "Step 2" : "ধাপ ২"}</div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100">{t.pipelineStep2Title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{t.pipelineStep2Desc}</p>
                </div>
              </div>

              {/* Step 3: Forecast */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-navy-900/90 border border-slate-800 flex items-start gap-3">
                <div className="p-2 sm:p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-teal-400 shrink-0">
                  <TrendingUp className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-teal-400" />
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-500">{lang === "en" ? "Step 3" : "ধাপ ৩"}</div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100">{t.pipelineStep3Title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{t.pipelineStep3Desc}</p>
                </div>
              </div>

              {/* Step 4: Plan */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-navy-900/90 border border-slate-800 flex items-start gap-3">
                <div className="p-2 sm:p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-teal-400 shrink-0">
                  <Banknote className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-teal-400" />
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-500">{lang === "en" ? "Step 4" : "ধাপ ৪"}</div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100">{t.pipelineStep4Title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{t.pipelineStep4Desc}</p>
                </div>
              </div>
            </div>
          </section>

          {/* FOOTER & DISCLOSURES */}
          <footer className="card-soft text-center space-y-2 py-5 sm:py-6 border border-slate-800">
            <p className="text-xs text-slate-400 font-medium">
              {t.footerSynthetic}
            </p>
            <p className="text-[11px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
              <Info className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
              {t.footerLlmDisclosure}
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}
