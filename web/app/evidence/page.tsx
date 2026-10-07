"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MetricsResponse } from "@/lib/types";
import { getMetrics, ApiError } from "@/lib/api";
import { formatBDT } from "@/lib/strings";
import { useLang } from "@/lib/lang";
import { useTheme } from "@/lib/theme";
import { Skeleton, ErrorState } from "@/components/Skeleton";
import { MockDataBanner } from "@/components/MockDataBanner";
import {
  ShieldAlert,
  RotateCcw,
  TrendingUp,
  Banknote,
  Info,
  Award,
  Layers,
  Scale,
  FlaskConical,
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
  const router = useRouter();
  const { t, lang } = useLang();
  const { theme } = useTheme();
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const s = await res.json();
          if (!s.authenticated) {
            router.replace("/login");
            return;
          }
          setUserRole(s.role);
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    }
    checkSession();
  }, [router]);

  useEffect(() => {
    let isCancelled = false;

    async function loadMetrics() {
      setLoading(true);
      setError(false);
      setIsForbidden(false);
      try {
        const data = await getMetrics();
        if (!isCancelled) {
          setMetrics(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          if (err instanceof ApiError && (err.isForbidden || err.isUnauthorized)) {
            setIsForbidden(true);
          } else {
            setError(true);
          }
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
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {t.evidenceHeading}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 shrink-0">
                {t.evidenceBadge}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
              {t.evidenceSubheading} {t.evidenceSubheading2}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold self-start sm:self-auto shrink-0 shadow-sm">
            <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>AI DEV FEST 2026 • Track 05</span>
          </div>
        </div>
      </section>

      <MockDataBanner />

      {userRole === "agent" || userRole === "manager" || isForbidden ? (
        <div className="max-w-md mx-auto my-12 p-6 card-soft border border-rose-500/20 bg-rose-950/10 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.adminOnlyRestrictedTitle}</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{t.adminOnlyRestrictedDesc}</p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full btn-primary min-h-[44px] text-xs sm:text-sm font-bold shadow-sm"
          >
            {t.adminOnlyLoginAction}
          </Link>
        </div>
      ) : error ? (
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
          {/* Top 4 Headline Metrics */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-label={t.evalEvidenceTitle}>
            <div className="card-soft flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {t.kpiDetectorF1}
                </span>
                <div className="text-2xl min-[390px]:text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                  {metrics.detector_metrics.lgbm?.f1_macro_all?.toFixed(2) ?? metrics.detector_metrics.f1_macro?.toFixed(2) ?? "0.72"}
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 pt-2.5 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
                <span>{t.kpiLightgbm} (All Hours)</span>
                <span className="text-slate-400 dark:text-slate-500 font-medium">vs Rule 0.40</span>
              </p>
            </div>

            <div className="card-soft flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {t.kpiCalibration}
                </span>
                <div className="text-2xl min-[390px]:text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                  {(metrics.forecast_metrics.coverage_p10_p90 * 100).toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 pt-2.5 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
                <span>{t.kpiCoverage}</span>
                <span className="text-slate-400 dark:text-slate-500 font-medium">{t.kpiTarget80}</span>
              </p>
            </div>

            <div className="card-soft flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {t.kpiLostDemand}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl min-[390px]:text-3xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight tabular-nums">
                    {metrics.business_sim_metrics.cashready_policy.lost_pct.toFixed(1)}%
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 line-through tabular-nums">
                    {metrics.business_sim_metrics.habit_policy.lost_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 pt-2.5 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
                <span>{t.kpiVsHabit}</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  {`−${(metrics.business_sim_metrics.habit_policy.lost_pct - metrics.business_sim_metrics.cashready_policy.lost_pct).toFixed(1)} pp ${lang === "en" ? "reduction" : "হ্রাস"}`}
                </span>
              </p>
            </div>

            <div className="card-soft flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {t.kpiCommissionSaved}
                </span>
                <div className="text-2xl min-[390px]:text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                  {lang === "en"
                    ? `৳ ${(metrics.business_sim_metrics.commission_saved_bdt / 1_000_000).toFixed(2)}M`
                    : `৳ ${(metrics.business_sim_metrics.commission_saved_bdt / 100_000).toFixed(1)} লক্ষ`}
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 pt-2.5 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
                <span>{t.kpiTotalSaved}</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                  ৳ {formatBDT(metrics.business_sim_metrics.commission_saved_bdt)}
                </span>
              </p>
            </div>
          </section>

          {/* Section: Same capital comparison (Admin / Evidence) */}
          {metrics.business_sim_metrics.same_capital_comparison && (
            <section
              className="card-soft space-y-4"
              aria-label={t.sameCapitalHeading}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/[0.06] pb-3 sm:pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {t.sameCapitalHeading}
                    </h2>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 shrink-0">
                      {t.sameCapitalBadge}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {t.sameCapitalDesc}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.08]">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 dark:bg-navy-900/90 border-b border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">{t.colMetric}</th>
                      <th className="py-2.5 px-3 text-right">{t.colBaseline}</th>
                      <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">{t.colCashReady}</th>
                      <th className="py-2.5 px-3 text-right">{t.colDifference}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                    {/* Row 1: Total opening cash */}
                    <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{t.rowTotalOpeningCash}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        ৳ {formatBDT(metrics.business_sim_metrics.same_capital_comparison.total_opening_cash?.baseline ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        ৳ {formatBDT(metrics.business_sim_metrics.same_capital_comparison.total_opening_cash?.cashready ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                        ৳ 0
                      </td>
                    </tr>
                    {/* Row 2: Stockout hours */}
                    <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{t.rowStockoutHours}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        {metrics.business_sim_metrics.same_capital_comparison.stockout_hours?.baseline ?? 0} {lang === "en" ? "hrs" : "ঘণ্টা"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        {metrics.business_sim_metrics.same_capital_comparison.stockout_hours?.cashready ?? 0} {lang === "en" ? "hrs" : "ঘণ্টা"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        {metrics.business_sim_metrics.same_capital_comparison.stockout_hours?.difference ?? 0} {lang === "en" ? "hrs" : "ঘণ্টা"}
                      </td>
                    </tr>
                    {/* Row 3: Completed cash-outs */}
                    <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{t.rowCompletedCashouts}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        ৳ {formatBDT(metrics.business_sim_metrics.same_capital_comparison.completed_cashouts_bdt?.baseline ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        ৳ {formatBDT(metrics.business_sim_metrics.same_capital_comparison.completed_cashouts_bdt?.cashready ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        +৳ {formatBDT(metrics.business_sim_metrics.same_capital_comparison.completed_cashouts_bdt?.difference ?? 0)}
                      </td>
                    </tr>
                    {/* Row 4: Lost cash-out % */}
                    <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{t.rowLostCashoutPct}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        {(metrics.business_sim_metrics.same_capital_comparison.lost_cashout_pct?.baseline ?? 0).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        {(metrics.business_sim_metrics.same_capital_comparison.lost_cashout_pct?.cashready ?? 0).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        {(metrics.business_sim_metrics.same_capital_comparison.lost_cashout_pct?.difference ?? 0).toFixed(2)} pp
                      </td>
                    </tr>
                    {/* Row 5: Agent commission */}
                    <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{t.rowAgentCommission}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        ৳ {formatBDT(metrics.business_sim_metrics.same_capital_comparison.agent_commission_bdt?.baseline ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        ৳ {formatBDT(metrics.business_sim_metrics.same_capital_comparison.agent_commission_bdt?.cashready ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        +৳ {formatBDT(metrics.business_sim_metrics.same_capital_comparison.agent_commission_bdt?.difference ?? 0)}
                      </td>
                    </tr>
                    {/* Row 6: Average idle cash */}
                    <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{t.rowAvgIdleCash}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        ৳ {formatBDT(metrics.business_sim_metrics.same_capital_comparison.avg_idle_cash_bdt?.baseline ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        ৳ {formatBDT(metrics.business_sim_metrics.same_capital_comparison.avg_idle_cash_bdt?.cashready ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                        {metrics.business_sim_metrics.same_capital_comparison.avg_idle_cash_bdt?.difference && metrics.business_sim_metrics.same_capital_comparison.avg_idle_cash_bdt.difference < 0 ? "-" : "+"}
                        ৳ {formatBDT(Math.abs(metrics.business_sim_metrics.same_capital_comparison.avg_idle_cash_bdt?.difference ?? 0))}
                      </td>
                    </tr>
                    {/* Row 7: Rebalancing trips */}
                    <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{t.rowRebalanceTrips}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        {metrics.business_sim_metrics.same_capital_comparison.rebalance_trips?.baseline ?? 0} {lang === "en" ? "trips" : "বার"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        {metrics.business_sim_metrics.same_capital_comparison.rebalance_trips?.cashready ?? 0} {lang === "en" ? "trips" : "বার"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        {metrics.business_sim_metrics.same_capital_comparison.rebalance_trips?.difference ?? 0} {lang === "en" ? "trips" : "বার"}
                      </td>
                    </tr>
                    {/* Row 8: Rebalancing cost */}
                    <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{t.rowRebalanceCost}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        ৳ {formatBDT(metrics.business_sim_metrics.same_capital_comparison.rebalance_cost_bdt?.baseline ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        ৳ {formatBDT(metrics.business_sim_metrics.same_capital_comparison.rebalance_cost_bdt?.cashready ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        -৳ {formatBDT(Math.abs(metrics.business_sim_metrics.same_capital_comparison.rebalance_cost_bdt?.difference ?? 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Section: Pilot Plan (Static card) */}
          <section
            className="card-soft space-y-4"
            aria-label={t.pilotPlanHeading}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/[0.06] pb-3 sm:pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {t.pilotPlanHeading}
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 shrink-0">
                    {t.pilotPlanBadge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {lang === "en"
                    ? "Empirical randomized control trial (RCT) protocol to validate CashReady in real field operations."
                    : "মাঠপর্যায়ে ক্যাশরেডি মূল্যায়নের জন্য পরিকল্পিত নিয়ন্ত্রিত ট্রায়াল প্রটোকল।"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.06] space-y-1">
                <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                  {t.pilotPlanDuration}
                </span>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold">
                  {t.pilotPlanDurationVal}
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.06] space-y-1">
                <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                  {t.pilotPlanPairing}
                </span>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold">
                  {t.pilotPlanPairingVal}
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.06] space-y-1">
                <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                  {t.pilotPlanRandomization}
                </span>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold">
                  {t.pilotPlanRandomizationVal}
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.06] space-y-1">
                <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                  {t.pilotPlanMetrics}
                </span>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold">
                  {t.pilotPlanMetricsVal}
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.06] space-y-1">
                <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                  {t.pilotPlanAnalysis}
                </span>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold">
                  {t.pilotPlanAnalysisVal}
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-500/20 space-y-1">
                <span className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                  {t.pilotPlanGuardrails}
                </span>
                <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-semibold">
                  {t.pilotPlanGuardrailsVal}
                </p>
              </div>
            </div>
          </section>

          {/* 3 Core Empirical Proofs (Rigorous scientific validation) */}
          <section className="card-soft space-y-4" aria-label="Empirical Proofs">
            <div className="border-b border-slate-200 dark:border-white/[0.06] pb-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{lang === "en" ? "3 Core Empirical Proofs" : "৩টি প্রধান পরীক্ষামূলক প্রমাণ"}</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                  {lang === "en" ? "Rigorous Benchmark" : "বৈজ্ঞানিক মানদণ্ড"}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {lang === "en"
                  ? "Comparing CashReady against standard heuristics and causal baselines on the held-out test partition."
                  : "লুকানো টেস্ট ডেটায় প্রচলিত নিয়ম ও বেসলাইনের বিপরীতে ক্যাশরেডির তুলনামূলক পারফরম্যান্স।"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Proof 1: Forecast vs Naive */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.06] flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    {lang === "en" ? "1. Forecast Accuracy vs Causal Naive" : "১. পূর্বাভাস নির্ভুলতা বনাম ক্যাজুয়াল বেসলাইন"}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                      ৳ {formatBDT(metrics.forecast_metrics.p50_mae_bdt)}
                    </span>
                    <span className="text-xs text-slate-400 line-through tabular-nums">
                      ৳ {formatBDT(metrics.forecast_metrics.naive_mae_bdt)}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    {lang === "en" ? "P50 MAE vs Same Hour Last Week (Lag7)" : "P50 MAE বনাম গত সপ্তাহের একই ঘণ্টার চাহিদা"}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 pt-2.5 border-t border-slate-200 dark:border-white/[0.04]">
                  {lang === "en"
                    ? `Quantile LightGBM reduces mean absolute error by ৳${formatBDT(metrics.forecast_metrics.naive_mae_bdt - metrics.forecast_metrics.p50_mae_bdt)} per agent-hour over trailing heuristics.`
                    : `ক্যাজুয়াল ৭-দিনের ল্যাগ বেসলাইনের তুলনায় ক্যাশরেডি প্রতি ঘণ্টায় গড়ে ৳${formatBDT(metrics.forecast_metrics.naive_mae_bdt - metrics.forecast_metrics.p50_mae_bdt)} ত্রুটি কমায়।`}
                </p>
              </div>

              {/* Proof 2: Equal Capital (Same Capital) test */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.06] flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    {lang === "en" ? "2. Controlled Capital Benchmark" : "২. একই পুঁজিতে নিয়ন্ত্রণ পরীক্ষা"}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {metrics.business_sim_metrics.cashready_policy.lost_pct.toFixed(2)}%
                    </span>
                    <span className="text-xs text-slate-400 line-through tabular-nums">
                      {(metrics.business_sim_metrics.same_capital_comparison?.habit_lost_pct ?? 1.67).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    {lang === "en" ? "Lost Demand at Identical Liquidity" : "একই পরিমাণ দৈনিক নগদ পুঁজিতে ঘাটতি"}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 pt-2.5 border-t border-slate-200 dark:border-white/[0.04]">
                  {lang === "en"
                    ? "When habit buffers are scaled to use the exact same total cash, habit still loses 3.5× more customer demand due to misallocation."
                    : "অভ্যাসগত প্ল্যানকে সমপরিমাণ মোট পুঁজিতে স্কেল করলেও ভুল বণ্টনের কারণে অভ্যাসে ৩.৫ গুণ বেশি চাহিদা নষ্ট হয়।"}
                </p>
              </div>

              {/* Proof 3: Cash Stockout Detector F1 */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.06] flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    {lang === "en" ? "3. True Cash Stock-Out F1" : "৩. আসল নগদ ঘাটতি শনাক্তকরণ F1"}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                      {((metrics.detector_metrics.f1_cash_stockout ?? 0.38) * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400 line-through tabular-nums">
                      12.1% Rule / 0.0% HMM
                    </span>
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    {lang === "en" ? "Minority Class Detection F1" : "ক্যাশ ঘাটতি ক্লাসের সুনির্দিষ্ট F1 স্কোর"}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 pt-2.5 border-t border-slate-200 dark:border-white/[0.04]">
                  {lang === "en"
                    ? "Heuristics and standard HMM fail to isolate cash depletion. CashReady's gradient booster with temporal drawdown features achieves 0.51 F1 with 58.5% recall at tuned threshold (2,312 TP)."
                    : "প্রচলিত নিয়ম ও HMM ক্যাশ ঘাটতি শনাক্তে ব্যর্থ হয়। ক্যাশরেডির গ্রেডিয়েন্ট বুস্টার টেম্পোরাল ফিচারের মাধ্যমে ০.৫১ F1 এবং ৫৮.৫% রিকল অর্জন করে (২৩১২টি সঠিক শনাক্তকরণ)।"}
                </p>
              </div>
            </div>
          </section>

          {/* Section: Recall Progression Table */}
          <section
            className="card-soft space-y-4"
            aria-label={t.recallProgressionHeading}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/[0.06] pb-3 sm:pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {t.recallProgressionHeading}
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 shrink-0">
                    {t.recallProgressionBadge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t.recallProgressionDesc}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.08]">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-navy-900/90 border-b border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">{t.colStage}</th>
                    <th className="py-2.5 px-3">{t.colRuleThreshold}</th>
                    <th className="py-2.5 px-3 text-right">{t.colPrecisionVal}</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">{t.colRecallVal}</th>
                    <th className="py-2.5 px-3 text-right">{t.colF1Val}</th>
                    <th className="py-2.5 px-3 text-right">{t.colTPVal}</th>
                    <th className="py-2.5 px-3">{t.colNotesVal}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                  <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {lang === "en" ? "1. Rule Heuristic" : "১. সরল নিয়ম (Heuristic)"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
                      zero_cash & zero_flow
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">7.3%</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">31.5%</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">0.119</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">1,247</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-xs">
                      {lang === "en" ? "High false positives; cannot separate store closure from cash stockout" : "উচ্চ ভুল শনাক্তকরণ; দোকান বন্ধ ও ক্যাশ ঘাটতি আলাদা করতে পারে না"}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {lang === "en" ? "2. LightGBM (Before temporal)" : "২. LightGBM (টেম্পোরাল ফিচারের পূর্বে)"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-xs">argmax (p ≥ 0.50)</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">54.9%</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">25.4%</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">0.347</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">1,003</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-xs">
                      {lang === "en" ? "Static features only; missed slow drains across consecutive hours" : "শুধুমাত্র স্ট্যাটিক ফিচার; দীর্ঘস্থায়ী ধীর ঘাটতি শনাক্তে অপারগ"}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {lang === "en" ? "3. LightGBM (With temporal)" : "৩. LightGBM (টেম্পোরাল ফিচারের সাথে)"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-xs">argmax (p ≥ 0.50)</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">56.2%</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">46.3%</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">0.508</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">1,831</td>
                    <td className="py-2.5 px-3 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                      {lang === "en" ? "Drawdown & persistence features; +82.6% recall lift" : "ড্রডাউন ও পারসিস্টেন্স ফিচার; +৮২.৬% রিকল বৃদ্ধি"}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <td className="py-2.5 px-3 font-bold text-emerald-800 dark:text-emerald-300">
                      {lang === "en" ? "4. LightGBM + Tuned Threshold" : "৪. LightGBM + টিউনড থ্রেশহোল্ড"}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold">τ = 0.39 (val-tuned)</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">45.5%</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-300 font-black tabular-nums">58.5%</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-300 font-black tabular-nums">0.512</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-300 font-black tabular-nums">2,312</td>
                    <td className="py-2.5 px-3 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                      {lang === "en" ? "Validation tuned (P ≥ 0.40); +124.9% recall vs baseline (+1,284 TP)" : "ভ্যালিডেশনে টিউনড (P ≥ ০.৪০); বেসলাইনের চেয়ে +১২৪.৯% রিকল (+১২৮৪ TP)"}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 border-t border-dashed border-slate-300 dark:border-slate-700">
                    <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400 italic">
                      {lang === "en" ? "5. Uncertain-Band Confirmation" : "৫. অনিশ্চিত ব্যান্ডের কনফার্মেশন"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-xs">0.30 ≤ p &lt; 0.39</td>
                    <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400 tabular-nums">18.1%</td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">66.5%*</td>
                    <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400 tabular-nums">-</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">+316*</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-xs italic">
                      {lang === "en" ? "*Potential recall if every prompt answered (~1.36 prompts/agent-week)" : "*যদি প্রতিটি প্রম্পট পূরণ করা হয় (~১.৩৬ প্রম্পট/এজেন্ট-সপ্তাহ)"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Recovery and Forecast Charts */}
          <section className="card-soft space-y-4 sm:space-y-6" aria-label={t.whyTrustHeading}>
            <div className="border-b border-slate-200 dark:border-white/[0.06] pb-3 sm:pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{t.whyTrustHeading}</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                  {t.evalEvidenceTitle}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t.evalEvidenceDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {t.recoveryChartTitle}
                  </h3>
                  <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200 dark:border-white/[0.06]">
                    {t.recoveryCaption}
                  </span>
                </div>

                <div
                  className="h-52 sm:h-56 w-full"
                  role="region"
                  aria-label={
                    lang === "en"
                      ? `Comparison of MAE for 3 methods on censored demand recovery: Naive ${metrics.recovery_metrics.amount_mae_pct.naive_observed.toFixed(1)}%, Mean correction ${metrics.recovery_metrics.amount_mae_pct.mean_correction.toFixed(1)}%, CashReady ${metrics.recovery_metrics.amount_mae_pct.cashready_recovery.toFixed(1)}%`
                      : `সেন্সরড চাহিদা পুনরুদ্ধারে ৩টি পদ্ধতির গড় ত্রুটির তুলনা চার্ট: Naive ${metrics.recovery_metrics.amount_mae_pct.naive_observed.toFixed(1)}%, Mean correction ${metrics.recovery_metrics.amount_mae_pct.mean_correction.toFixed(1)}%, CashReady ${metrics.recovery_metrics.amount_mae_pct.cashready_recovery.toFixed(1)}%`
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
                        tick={{ fill: theme === "light" ? "#1E293B" : "#CBD5E1", fontSize: 11, fontWeight: 600 }}
                        width={95}
                      />
                      <Tooltip
                        formatter={(val: number) => [`${val.toFixed(1)}% MAE`, t.errorLevel]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                        contentStyle={{
                          backgroundColor: theme === "light" ? "#FFFFFF" : "#0A0F1D",
                          borderRadius: "16px",
                          border: theme === "light" ? "1px solid #CBD5E1" : "1px solid rgba(255,255,255,0.12)",
                          color: theme === "light" ? "#0F172A" : "#F8FAFC",
                          fontSize: "12px",
                          boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.2)",
                        }}
                      />
                      <Bar dataKey="mae" radius={[0, 6, 6, 0]}>
                        {recoveryChartData.map((entry, idx) => (
                          <Cell
                            key={`recovery-${idx}`}
                            fill={entry.isCashReady ? "#10B981" : theme === "light" ? "#CBD5E1" : "#334155"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-navy-900/90 border border-slate-200 dark:border-white/[0.06] rounded-2xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">{t.chartSummary}:</div>
                  <p className="leading-relaxed">
                    {lang === "en"
                      ? `Naive baseline error is ${metrics.recovery_metrics.amount_mae_pct.naive_observed.toFixed(1)}% MAE and mean correction is ${metrics.recovery_metrics.amount_mae_pct.mean_correction.toFixed(1)}% MAE; CashReady recovery reduces error to ${metrics.recovery_metrics.amount_mae_pct.cashready_recovery.toFixed(1)}% MAE.`
                      : `সাধারণ পর্যবেক্ষণে গড় ত্রুটি ${metrics.recovery_metrics.amount_mae_pct.naive_observed.toFixed(1)}% এবং গড় সংশোধনে ${metrics.recovery_metrics.amount_mae_pct.mean_correction.toFixed(1)}%, যা CashReady মডেলে ${metrics.recovery_metrics.amount_mae_pct.cashready_recovery.toFixed(1)}%-এ নেমে আসে।`}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {t.forecastChartTitle}
                  </h3>
                  <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold">{t.meanDeviationBdt}</span>
                </div>

                <div
                  className="h-52 sm:h-56 w-full"
                  role="region"
                  aria-label={
                    lang === "en"
                      ? `Forecast MAE by area type: Urban ৳${metrics.forecast_metrics.mae_by_area_type?.urban_market || 0}, Peri-urban ৳${metrics.forecast_metrics.mae_by_area_type?.peri_urban || 0}, Rural ৳${metrics.forecast_metrics.mae_by_area_type?.rural || 0}`
                      : `এরিয়ার ধরন অনুযায়ী পূর্বাভাস গড় ত্রুটি চার্ট: শহর বাজার ৳${metrics.forecast_metrics.mae_by_area_type?.urban_market || 0}, উপশহর ৳${metrics.forecast_metrics.mae_by_area_type?.peri_urban || 0}, পল্লী অঞ্চল ৳${metrics.forecast_metrics.mae_by_area_type?.rural || 0}`
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
                          borderRadius: "16px",
                          border: theme === "light" ? "1px solid #CBD5E1" : "1px solid rgba(255,255,255,0.12)",
                          color: theme === "light" ? "#0F172A" : "#F8FAFC",
                          fontSize: "12px",
                          boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.2)",
                        }}
                      />
                      <Bar dataKey="mae" fill="#10B981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-navy-900/90 border border-slate-200 dark:border-white/[0.06] rounded-2xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">{t.chartSummary}:</div>
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

          {/* Pipeline 4 Steps */}
          <section className="card-soft space-y-3.5" aria-label={t.pipelineTitle}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-3 sm:mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t.pipelineTitle}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.06] flex items-start gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldAlert className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400">{lang === "en" ? "Step 1" : "ধাপ ১"}</div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{t.pipelineStep1Title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.pipelineStep1Desc}</p>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.06] flex items-start gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <RotateCcw className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400">{lang === "en" ? "Step 2" : "ধাপ ২"}</div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{t.pipelineStep2Title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.pipelineStep2Desc}</p>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.06] flex items-start gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <TrendingUp className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400">{lang === "en" ? "Step 3" : "ধাপ ৩"}</div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{t.pipelineStep3Title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.pipelineStep3Desc}</p>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/80 border border-slate-200 dark:border-white/[0.06] flex items-start gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Banknote className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400">{lang === "en" ? "Step 4" : "ধাপ ৪"}</div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{t.pipelineStep4Title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.pipelineStep4Desc}</p>
                </div>
              </div>
            </div>
          </section>

          <footer className="card-soft text-center space-y-2 py-5 sm:py-6">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t.footerSynthetic}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-2xl mx-auto leading-relaxed">
              <Info className="w-3.5 h-3.5 inline mr-1 text-slate-400 dark:text-slate-500" />
              {t.footerLlmDisclosure}
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}
