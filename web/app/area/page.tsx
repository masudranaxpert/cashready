"use client";

import { useEffect, useState, useMemo } from "react";
import type {
  Area,
  AreaRiskResponse,
  AreaLostDemandResponse,
  AreaAgentRisk,
} from "@/lib/types";
import { getAreas, getAreaRisk, getAreaLostDemand } from "@/lib/api";
import {
  DEMO_DATE,
  DEMO_WEEK,
  MOCK_AREAS,
  getMockAreaRisk,
  getMockAreaLostDemand,
} from "@/lib/mock-data";
import { STRINGS, formatBDT } from "@/lib/strings";
import { useLang } from "@/lib/lang";
import { useTheme } from "@/lib/theme";
import { Skeleton, ErrorState } from "@/components/Skeleton";
import {
  Calendar,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  TrendingDown,
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

type SortField = "agent_id" | "stockout_prob_habit" | "risk_hour";
type SortDirection = "asc" | "desc";

function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const iso = `${year}-${month}-${day}`;
  return iso >= "2024-01-01" && iso <= "2030-12-31" ? iso : "2026-10-04";
}

export default function AreaPage() {
  const { t, lang } = useLang();
  const { theme } = useTheme();
  const [areas, setAreas] = useState<Area[]>(MOCK_AREAS);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("A01");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate);

  const [riskData, setRiskData] = useState<AreaRiskResponse | null>(() =>
    getMockAreaRisk("A01", DEMO_DATE)
  );
  const [lostDemandData, setLostDemandData] = useState<AreaLostDemandResponse | null>(() =>
    getMockAreaLostDemand(DEMO_WEEK)
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  // Sorting state: default by stockout_prob_habit descending
  const [sortField, setSortField] = useState<SortField>("stockout_prob_habit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Load areas list
  useEffect(() => {
    async function loadAreas() {
      try {
        const areaList = await getAreas();
        setAreas(areaList);
        if (areaList.length > 0) {
          setSelectedAreaId((prev) =>
            areaList.find((a) => a.area_id === prev) ? prev : areaList[0].area_id
          );
        }
      } catch (err: unknown) {
        console.error("Failed to load areas", err);
      }
    }
    loadAreas();
  }, []);

  // Load area risk & area lost demand
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      setError(false);

      try {
        const [riskRes, lostRes] = await Promise.all([
          getAreaRisk(selectedAreaId, selectedDate),
          getAreaLostDemand(DEMO_WEEK),
        ]);

        if (!isCancelled) {
          setRiskData(riskRes);
          setLostDemandData(lostRes);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    if (selectedAreaId) {
      loadData();
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedAreaId, selectedDate]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Sorted agents
  const sortedAgents = useMemo(() => {
    if (!riskData?.agents) return [];
    return [...riskData.agents].sort((a: AreaAgentRisk, b: AreaAgentRisk) => {
      let comparison = 0;
      if (sortField === "agent_id") {
        comparison = a.agent_id.localeCompare(b.agent_id);
      } else if (sortField === "stockout_prob_habit") {
        comparison = a.stockout_prob_habit - b.stockout_prob_habit;
      } else if (sortField === "risk_hour") {
        comparison = a.risk_hour - b.risk_hour;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [riskData, sortField, sortDirection]);

  // Chart data for area lost demand
  const chartData = useMemo(() => {
    if (!lostDemandData?.areas) return [];
    return Object.entries(lostDemandData.areas).map(([areaId, item]) => ({
      areaId,
      lostAmount: item.lost_amount,
      lostCount: item.lost_count,
      demandShift: item.demand_shift,
    }));
  }, [lostDemandData]);

  const selectedAreaLostInfo = lostDemandData?.areas[selectedAreaId];
  const hasDigitalShift = selectedAreaLostInfo?.demand_shift === 1;

  const currentArea = areas.find((a) => a.area_id === selectedAreaId);
  const highRiskCount = sortedAgents.filter((a) => a.stockout_prob_habit >= 0.3).length;

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <section className="card-soft" aria-label={t.areaViewBadge}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>{t.areaHeading}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {selectedAreaId}
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  {t.areaSubheading}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick KPI stats in header */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-navy-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>{sortedAgents.length} {lang === "en" ? "Agents" : "এজেন্ট"}</span>
              </span>

              {highRiskCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 text-xs font-bold animate-pulse-glow">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>{highRiskCount} {lang === "en" ? "High Risk" : "উচ্চ ঝুঁকিপূর্ণ"}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold">
                  <span>{lang === "en" ? "All Stable" : "স্থিতিশীল"}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-navy-900/90 rounded-full px-3.5 py-1.5 border border-slate-200 dark:border-white/[0.08] shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <label htmlFor="area-select" className="sr-only">
                {t.areaSelectorLabel}
              </label>
              <select
                id="area-select"
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-white border-none focus:outline-none cursor-pointer"
              >
                {areas.map((a) => (
                  <option key={a.area_id} value={a.area_id} className="bg-white dark:bg-navy-950 text-slate-900 dark:text-white">
                    {a.area_id} ({a.area_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-navy-900/90 rounded-full px-3.5 py-1.5 border border-slate-200 dark:border-white/[0.08] shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <label htmlFor="date-select" className="sr-only">
                {t.dateSelectorLabel}
              </label>
              <input
                id="date-select"
                type="date"
                value={selectedDate}
                min="2024-01-01"
                max="2030-12-31"
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-900 dark:text-white border-none focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <ErrorState onRetry={() => setSelectedAreaId(selectedAreaId)} />
      ) : loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="lg:col-span-1 space-y-3">
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
          {/* Left Table / Mobile Cards */}
          <div className="lg:col-span-2 card-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {t.agentShortfallList}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.areaAgentCount(selectedAreaId, sortedAgents.length)}
                </p>
              </div>

              <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm border-l-2 border-l-rose-500 bg-rose-500/20 inline-block" />
                <span>{t.redBorderLegend}</span>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="block sm:hidden space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
                <span className="text-[11px] font-semibold">{t.sortBy}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSort("stockout_prob_habit")}
                    className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      sortField === "stockout_prob_habit"
                        ? "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 shadow-sm"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-navy-900/80 dark:text-slate-400 dark:border-white/[0.06]"
                    }`}
                  >
                    {t.riskWord} {sortField === "stockout_prob_habit" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort("agent_id")}
                    className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      sortField === "agent_id"
                        ? "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 shadow-sm"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-navy-900/80 dark:text-slate-400 dark:border-white/[0.06]"
                    }`}
                  >
                    {t.agentIdCol} {sortField === "agent_id" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort("risk_hour")}
                    className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      sortField === "risk_hour"
                        ? "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 shadow-sm"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-navy-900/80 dark:text-slate-400 dark:border-white/[0.06]"
                    }`}
                  >
                    {t.riskHourCol} {sortField === "risk_hour" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </button>
                </div>
              </div>

              {sortedAgents.map((ag: AreaAgentRisk) => {
                const isHighRisk = ag.stockout_prob_habit >= 0.3;
                const percent = Math.round(ag.stockout_prob_habit * 100);

                return (
                  <div
                    key={ag.agent_id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isHighRisk
                        ? "border-l-4 border-l-rose-500 border-rose-200 dark:border-white/[0.08] bg-rose-50/70 dark:bg-rose-500/10 shadow-sm"
                        : "border-slate-200 dark:border-white/[0.06] bg-white dark:bg-navy-900/70 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{ag.agent_id}</span>
                        {isHighRisk && (
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30">
                            {t.riskWord}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                        {t.riskTime(ag.risk_hour)}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{t.shortfallProb}:</span>
                      {isHighRisk ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>{t.cashShortfall} ({percent}%)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/20">
                          {t.normal} ({percent}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-transparent shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-navy-900/90 border-b border-slate-200 dark:border-white/[0.06] text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort("agent_id")}
                        className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white transition-colors"
                        aria-label={`${t.sortBy} ${t.agentIdCol}`}
                      >
                        <span>{t.agentIdCol}</span>
                        {sortField === "agent_id" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </th>

                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort("stockout_prob_habit")}
                        className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white transition-colors"
                        aria-label={`${t.sortBy} ${t.riskProbCol}`}
                      >
                        <span>{t.riskProbCol}</span>
                        {sortField === "stockout_prob_habit" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </th>

                    <th className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort("risk_hour")}
                        className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white transition-colors ml-auto"
                        aria-label={`${t.sortBy} ${t.riskHourCol}`}
                      >
                        <span>{t.riskHourCol}</span>
                        {sortField === "risk_hour" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {sortedAgents.map((ag: AreaAgentRisk) => {
                    const isHighRisk = ag.stockout_prob_habit >= 0.3;
                    const percent = Math.round(ag.stockout_prob_habit * 100);

                    return (
                      <tr
                        key={ag.agent_id}
                        className={`transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/40 ${
                          isHighRisk ? "border-l-4 border-l-rose-500 bg-rose-50/50 dark:bg-rose-500/10" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{ag.agent_id}</span>
                            {isHighRisk && (
                              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30">
                                {t.riskWord}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {isHighRisk ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                              <span>{t.cashShortfallRisk} ({percent}%)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/20">
                              {t.normalState} ({percent}%)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                          {t.riskTime(ag.risk_hour)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Weekly Lost Demand Chart */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card-soft space-y-4">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {t.areaLostDemandHeading}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.week} {DEMO_WEEK}</p>
                </div>

                {hasDigitalShift && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                    <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.digitalShiftBadge}</span>
                  </span>
                )}
              </div>

              {selectedAreaLostInfo && (
                <div className="p-3.5 bg-slate-50 dark:bg-navy-950/80 rounded-xl space-y-2 text-xs border border-slate-200 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t.areaSelectorLabel}:</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{selectedAreaId} ({currentArea?.area_type})</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t.lostTransactionsLabel}:</span>
                    <strong className="text-slate-900 dark:text-white tabular-nums font-bold">
                      {t.lostCountUnit(Math.round(selectedAreaLostInfo.lost_count))}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t.lostAmountLabel}:</span>
                    <strong className="text-emerald-700 dark:text-emerald-400 tabular-nums font-extrabold text-sm">
                      ৳ {formatBDT(selectedAreaLostInfo.lost_amount)}
                    </strong>
                  </div>
                </div>
              )}

              <div
                className="h-60 sm:h-64 w-full pt-1"
                role="region"
                aria-label={lang === "en" ? "Weekly lost demand chart across areas" : "বিভিন্ন এরিয়ার সাপ্তাহিক হারানো চাহিদা চার্ট"}
              >
                <div className="text-[11px] font-bold text-slate-400 mb-1 text-right">
                  {t.demandBdt}
                </div>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="areaId"
                      tick={{ fill: theme === "light" ? "#475569" : "#94A3B8", fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: theme === "light" ? "#CBD5E1" : "#334155" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: theme === "light" ? "#475569" : "#94A3B8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: number) => [`৳ ${formatBDT(val)}`, t.lostAmountLabel]}
                      labelFormatter={(label) => `${t.areaSelectorLabel}: ${label}`}
                      contentStyle={{
                        backgroundColor: theme === "light" ? "#FFFFFF" : "#0A0F1D",
                        borderRadius: "14px",
                        border: theme === "light" ? "1px solid #E2E8F0" : "1px solid rgba(255, 255, 255, 0.12)",
                        color: theme === "light" ? "#0F172A" : "#F8FAFC",
                        fontSize: "12px",
                        boxShadow: theme === "light" ? "0 10px 25px -5px rgba(0,0,0,0.08)" : "0 10px 30px rgba(0,0,0,0.5)",
                      }}
                    />
                    <Bar dataKey="lostAmount" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.areaId}
                          fill={entry.areaId === selectedAreaId ? "#10B981" : theme === "light" ? "#CBD5E1" : "#1E293B"}
                          className="cursor-pointer transition-colors hover:opacity-80"
                          onClick={() => setSelectedAreaId(entry.areaId)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[11px] text-slate-500 text-center">
                {t.chartTapHint}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
