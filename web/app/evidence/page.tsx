"use client";

import { useEffect, useState, useMemo } from "react";
import type { MetricsResponse } from "@/lib/types";
import { getMetrics } from "@/lib/api";
import { MOCK_METRICS } from "@/lib/mock-data";
import { STRINGS, formatBDT } from "@/lib/strings";
import { useLang } from "@/lib/lang";
import { useTheme } from "@/lib/theme";
import { Skeleton, ErrorState } from "@/components/Skeleton";
import {
  ShieldAlert,
  RotateCcw,
  TrendingUp,
  Banknote,
  Info,
  Award,
  Layers,
  BarChart3,
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
  const { theme } = useTheme();
  const [metrics, setMetrics] = useState<MetricsResponse | null>(MOCK_METRICS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadMetrics() {
      setLoading(true);
      setError(false);
      try {
        const data = await getMetrics();
        if (!isCancelled) {
          setMetrics(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(true);
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
  }, [metrics, lang]);

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
  }, [metrics, lang]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <section className="card-soft" aria-label={t.evidenceHeading}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                {t.evidenceHeading}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                {t.evidenceBadge}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
              {t.evidenceSubheading} {t.evidenceSubheading2}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold self-start sm:self-auto shrink-0 shadow-sm">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>AI DEV FEST 2026 • Track 05</span>
          </div>
        </div>
      </section>

      {error ? (
        <ErrorState onRetry={() => setMetrics(null)} />
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
          {/* 4 Top Executive KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-label={t.evalEvidenceTitle}>
            <div className="card-soft flex flex-col justify-between hover:border-emerald-500/30 transition-all">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  {t.kpiDetectorF1}
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums">
                  {metrics.detector_metrics.f1_macro?.toFixed(2) ?? "0.79"}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                <span>{t.kpiLightgbm}</span>
                <span className="text-emerald-400 font-bold">vs HMM 0.66</span>
              </p>
            </div>

            <div className="card-soft flex flex-col justify-between hover:border-emerald-500/30 transition-all">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  {t.kpiCalibration}
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums">
                  {(metrics.forecast_metrics.coverage_p10_p90 * 100).toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                <span>{t.kpiCoverage}</span>
                <span className="text-emerald-400 font-bold">{t.kpiTarget80}</span>
              </p>
            </div>

            <div className="card-soft flex flex-col justify-between border-emerald-500/25 bg-gradient-to-b from-navy-850/90 to-emerald-950/20 hover:border-emerald-500/40 transition-all">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  {t.kpiLostDemand}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight tabular-nums">
                    {metrics.business_sim_metrics.cashready_policy.lost_pct.toFixed(1)}%
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-500 line-through tabular-nums">
                    {metrics.business_sim_metrics.habit_policy.lost_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                <span>{t.kpiVsHabit}</span>
                <span className="text-emerald-400 font-black">
                  {`−${(metrics.business_sim_metrics.habit_policy.lost_pct - metrics.business_sim_metrics.cashready_policy.lost_pct).toFixed(1)} pp ${lang === "en" ? "reduction" : "হ্রাস"}`}
                </span>
              </p>
            </div>

            <div className="card-soft flex flex-col justify-between hover:border-emerald-500/30 transition-all">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  {t.kpiCommissionSaved}
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums">
                  {lang === "en"
                    ? `৳ ${(metrics.business_sim_metrics.commission_saved_bdt / 1_000_000).toFixed(2)}M`
                    : `৳ ${(metrics.business_sim_metrics.commission_saved_bdt / 100_000).toFixed(1)} লক্ষ`}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                <span>{t.kpiTotalSaved}</span>
                <span className="text-emerald-400 font-bold tabular-nums">
                  ৳ {formatBDT(metrics.business_sim_metrics.commission_saved_bdt)}
                </span>
              </p>
            </div>
          </section>

          {/* 3 Core Empirical Proofs (Rigorous scientific validation) */}
          <section className="card-soft space-y-4" aria-label="Empirical Proofs">
            <div className="border-b border-white/[0.06] pb-3">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{lang === "en" ? "3 Core Empirical Proofs" : "৩টি প্রধান পরীক্ষামূলক প্রমাণ"}</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {lang === "en" ? "Rigorous Benchmark" : "বৈজ্ঞানিক মানদণ্ড"}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {lang === "en"
                  ? "Comparing CashReady against standard heuristics and causal baselines on the held-out test partition."
                  : "লুকানো টেস্ট ডেটায় প্রচলিত নিয়ম ও বেসলাইনের বিপরীতে ক্যাশরেডির তুলনামূলক পারফরম্যান্স।"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Proof 1: Forecast vs Naive */}
              <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/[0.06] flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-xs font-bold text-emerald-400 mb-1">
                    {lang === "en" ? "1. Forecast Accuracy vs Causal Naive" : "১. পূর্বাভাস নির্ভুলতা বনাম ক্যাজুয়াল বেসলাইন"}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-white tabular-nums">
                      ৳ {formatBDT(metrics.forecast_metrics.p50_mae_bdt)}
                    </span>
                    <span className="text-xs text-slate-500 line-through tabular-nums">
                      ৳ {formatBDT(metrics.forecast_metrics.naive_mae_bdt)}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold mt-1">
                    {lang === "en" ? "P50 MAE vs Same Hour Last Week (Lag7)" : "P50 MAE বনাম গত সপ্তাহের একই ঘণ্টার চাহিদা"}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-white/[0.06] leading-relaxed">
                  {lang === "en"
                    ? `Quantile LightGBM reduces mean absolute error by ৳${formatBDT(metrics.forecast_metrics.naive_mae_bdt - metrics.forecast_metrics.p50_mae_bdt)} per agent-hour over trailing heuristics.`
                    : `ক্যাজুয়াল ৭-দিনের ল্যাগ বেসলাইনের তুলনায় ক্যাশরেডি প্রতি ঘণ্টায় গড়ে ৳${formatBDT(metrics.forecast_metrics.naive_mae_bdt - metrics.forecast_metrics.p50_mae_bdt)} ত্রুটি কমায়।`}
                </p>
              </div>

              {/* Proof 2: Equal Capital (Same Capital) test */}
              <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/[0.06] flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-xs font-bold text-emerald-400 mb-1">
                    {lang === "en" ? "2. Controlled Capital Benchmark" : "২. একই পুঁজিতে নিয়ন্ত্রণ পরীক্ষা"}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-emerald-400 tabular-nums">
                      {metrics.business_sim_metrics.cashready_policy.lost_pct.toFixed(2)}%
                    </span>
                    <span className="text-xs text-slate-500 line-through tabular-nums">
                      {(metrics.business_sim_metrics.same_capital_comparison?.habit_lost_pct ?? 1.67).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold mt-1">
                    {lang === "en" ? "Lost Demand at Identical Liquidity" : "একই পরিমাণ দৈনিক নগদ পুঁজিতে ঘাটতি"}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-white/[0.06] leading-relaxed">
                  {lang === "en"
                    ? "When habit buffers are scaled to use the exact same total cash, habit still loses 3.5× more customer demand due to misallocation."
                    : "অভ্যাসগত প্ল্যানকে সমপরিমাণ মোট পুঁজিতে স্কেল করলেও ভুল বণ্টনের কারণে অভ্যাসে ৩.৫ গুণ বেশি চাহিদা নষ্ট হয়।"}
                </p>
              </div>

              {/* Proof 3: Cash Stockout Detector F1 */}
              <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/[0.06] flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-xs font-bold text-emerald-400 mb-1">
                    {lang === "en" ? "3. True Cash Stock-Out F1" : "৩. আসল নগদ ঘাটতি শনাক্তকরণ F1"}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-white tabular-nums">
                      {((metrics.detector_metrics.f1_cash_stockout ?? 0.38) * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-500 line-through tabular-nums">
                      12.1% Rule / 0.0% HMM
                    </span>
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold mt-1">
                    {lang === "en" ? "Minority Class Detection F1" : "ক্যাশ ঘাটতি ক্লাসের সুনির্দিষ্ট F1 স্কোর"}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-white/[0.06] leading-relaxed">
                  {lang === "en"
                    ? "Heuristics and standard HMM fail to isolate cash depletion from digital shifts. CashReady's supervised gradient booster achieves 0.38 F1 on this rare state."
                    : "প্রচলিত নিয়ম ও HMM ক্যাশ ঘাটতি শনাক্তে ব্যর্থ হয়। ক্যাশরেডি বিরল ক্যাশ ঘাটতি ক্লাসে সর্বোচ্চ ৩ গুণ বেশি F1 অর্জন করে।"}
                </p>
              </div>
            </div>
          </section>

          {/* Charts Section */}
          <section className="card-soft space-y-4 sm:space-y-6" aria-label={t.whyTrustHeading}>
            <div className="border-b border-white/[0.06] pb-3 sm:pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>{t.whyTrustHeading}</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-navy-900 text-slate-300 border border-white/[0.08]">
                  {t.evalEvidenceTitle}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {t.evalEvidenceDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Chart A: Recovery comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    {t.recoveryChartTitle}
                  </h3>
                  <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-navy-900 text-emerald-400 border border-emerald-500/20">
                    {t.recoveryCaption}
                  </span>
                </div>

                <div
                  className="h-52 sm:h-56 w-full"
                  role="region"
                  aria-label={
                    lang === "en"
                      ? `Comparison of MAE for 3 methods on censored demand recovery: Naive ${metrics.recovery_metrics.amount_mae_pct.naive_observed.toFixed(1)}%, Mean correction ${metrics.recovery_metrics.amount_mae_pct.mean_correction.toFixed(1)}%, CashReady ${metrics.recovery_metrics.amount_mae_pct.cashready_recovery.toFixed(1)}%`
                      : `সেন্সরড চাহিদা পুনরুদ্ধারে ৩টি পদ্ধতির গড় ত্রুটির তুলনা চার্ট`
                  }
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={recoveryChartData}
                      margin={{ top: 10, right: 35, left: 0, bottom: 5 }}
                    >
                      <XAxis
                        type="number"
                        domain={[0, (dataMax: number) => Math.max(80, Math.ceil(dataMax * 1.1))]}
                        tick={{ fill: theme === "light" ? "#475569" : "#94A3B8", fontSize: 11 }}
                        unit="%"
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: theme === "light" ? "#334155" : "#CBD5E1", fontSize: 11, fontWeight: 600 }}
                        width={95}
                      />
                      <Tooltip
                        formatter={(val: number) => [`${val.toFixed(1)}% MAE`, t.errorLevel]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                        contentStyle={{
                          backgroundColor: theme === "light" ? "#FFFFFF" : "#0A0F1D",
                          borderRadius: "14px",
                          border: theme === "light" ? "1px solid #E2E8F0" : "1px solid rgba(255, 255, 255, 0.12)",
                          color: theme === "light" ? "#0F172A" : "#F8FAFC",
                          fontSize: "12px",
                          boxShadow: theme === "light" ? "0 10px 25px -5px rgba(0,0,0,0.08)" : "0 10px 30px rgba(0,0,0,0.5)",
                        }}
                      />
                      <Bar dataKey="mae" radius={[0, 6, 6, 0]}>
                        {recoveryChartData.map((entry, idx) => (
                          <Cell
                            key={`recovery-${idx}`}
                            fill={entry.isCashReady ? "#10B981" : theme === "light" ? "#CBD5E1" : "#1E293B"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-3 bg-navy-950/80 border border-white/[0.06] rounded-xl text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-white">{t.chartSummary}:</div>
                  <p className="leading-relaxed">
                    {lang === "en"
                      ? `Naive baseline error is ${metrics.recovery_metrics.amount_mae_pct.naive_observed.toFixed(1)}% MAE and mean correction is ${metrics.recovery_metrics.amount_mae_pct.mean_correction.toFixed(1)}% MAE; CashReady recovery reduces error to ${metrics.recovery_metrics.amount_mae_pct.cashready_recovery.toFixed(1)}% MAE.`
                      : `সাধারণ পর্যবেক্ষণে গড় ত্রুটি ${metrics.recovery_metrics.amount_mae_pct.naive_observed.toFixed(1)}% এবং গড় সংশোধনে ${metrics.recovery_metrics.amount_mae_pct.mean_correction.toFixed(1)}%, যা CashReady মডেলে ${metrics.recovery_metrics.amount_mae_pct.cashready_recovery.toFixed(1)}%-এ নেমে আসে।`}
                  </p>
                </div>
              </div>

              {/* Chart B: Forecast MAE by area type */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    {t.forecastChartTitle}
                  </h3>
                  <span className="text-[11px] sm:text-xs text-slate-400 font-semibold">{t.meanDeviationBdt}</span>
                </div>

                <div
                  className="h-52 sm:h-56 w-full"
                  role="region"
                  aria-label={
                    lang === "en"
                      ? `Forecast MAE by area type: Urban ৳${metrics.forecast_metrics.mae_by_area_type?.urban_market || 0}, Peri-urban ৳${metrics.forecast_metrics.mae_by_area_type?.peri_urban || 0}, Rural ৳${metrics.forecast_metrics.mae_by_area_type?.rural || 0}`
                      : `এরিয়ার ধরন অনুযায়ী পূর্বাভাস গড় ত্রুটি চার্ট`
                  }
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={forecastAreaChartData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 15 }}
                    >
                      <XAxis
                        dataKey="areaType"
                        tick={{ fill: theme === "light" ? "#475569" : "#94A3B8", fontSize: 11, fontWeight: 600 }}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fill: theme === "light" ? "#475569" : "#94A3B8", fontSize: 11 }}
                        tickFormatter={(val) => `${val}`}
                      />
                      <Tooltip
                        formatter={(val: number) => [`৳ ${formatBDT(val)}`, "MAE"]}
                        labelFormatter={(label) => String(label)}
                        contentStyle={{
                          backgroundColor: theme === "light" ? "#FFFFFF" : "#0A0F1D",
                          borderRadius: "14px",
                          border: theme === "light" ? "1px solid #E2E8F0" : "1px solid rgba(255, 255, 255, 0.12)",
                          color: theme === "light" ? "#0F172A" : "#F8FAFC",
                          fontSize: "12px",
                          boxShadow: theme === "light" ? "0 10px 25px -5px rgba(0,0,0,0.08)" : "0 10px 30px rgba(0,0,0,0.5)",
                        }}
                      />
                      <Bar dataKey="mae" fill="#1E293B" radius={[6, 6, 0, 0]}>
                        {forecastAreaChartData.map((_, idx) => (
                          <Cell
                            key={`forecast-${idx}`}
                            fill={idx === 0 ? "#10B981" : theme === "light" ? "#CBD5E1" : "#1E293B"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-3 bg-navy-950/80 border border-white/[0.06] rounded-xl text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-white">{t.chartSummary}:</div>
                  <p className="leading-relaxed">
                    {metrics.forecast_metrics.mae_by_area_type ? (
                      lang === "en"
                        ? `Forecast MAE is ৳${formatBDT(metrics.forecast_metrics.mae_by_area_type.urban_market || 0)} in urban markets, ৳${formatBDT(metrics.forecast_metrics.mae_by_area_type.peri_urban || 0)} in peri-urban areas, and ৳${formatBDT(metrics.forecast_metrics.mae_by_area_type.rural || 0)} in rural areas.`
                        : `শহর বাজারে পূর্বাভাসের গড় ত্রুটি (MAE) ৳${formatBDT(metrics.forecast_metrics.mae_by_area_type.urban_market || 0)}, উপশহরে ৳${formatBDT(metrics.forecast_metrics.mae_by_area_type.peri_urban || 0)} এবং পল্লী অঞ্চলে ৳${formatBDT(metrics.forecast_metrics.mae_by_area_type.rural || 0)}।`
                    ) : (
                      t.forecastSummary
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* End-to-End Pipeline Architecture */}
          <section className="card-soft space-y-4" aria-label={t.pipelineTitle}>
            <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {t.pipelineTitle}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/[0.06] flex items-start gap-3.5 hover:border-emerald-500/30 transition-all">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <ShieldAlert className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">{lang === "en" ? "Step 01" : "ধাপ ০১"}</div>
                  <h4 className="text-sm font-extrabold text-white">{t.pipelineStep1Title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{t.pipelineStep1Desc}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/[0.06] flex items-start gap-3.5 hover:border-emerald-500/30 transition-all">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <RotateCcw className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">{lang === "en" ? "Step 02" : "ধাপ ০২"}</div>
                  <h4 className="text-sm font-extrabold text-white">{t.pipelineStep2Title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{t.pipelineStep2Desc}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/[0.06] flex items-start gap-3.5 hover:border-emerald-500/30 transition-all">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">{lang === "en" ? "Step 03" : "ধাপ ০৩"}</div>
                  <h4 className="text-sm font-extrabold text-white">{t.pipelineStep3Title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{t.pipelineStep3Desc}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-950/80 border border-white/[0.06] flex items-start gap-3.5 hover:border-emerald-500/30 transition-all">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <Banknote className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">{lang === "en" ? "Step 04" : "ধাপ ০৪"}</div>
                  <h4 className="text-sm font-extrabold text-white">{t.pipelineStep4Title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{t.pipelineStep4Desc}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer with Algorithmic Disclosures */}
          <footer className="card-soft text-center space-y-2 py-5 sm:py-6 border border-white/[0.06]">
            <p className="text-xs text-slate-300 font-semibold">
              {t.footerSynthetic}
            </p>
            <p className="text-[11px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
              <Info className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
              {t.footerLlmDisclosure}
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}
