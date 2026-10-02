"use client";

import { useEffect, useState, useMemo } from "react";
import type {
  Area,
  AreaRiskResponse,
  AreaLostDemandResponse,
  AreaAgentRisk,
} from "@/lib/types";
import { getAreas, getAreaRisk, getAreaLostDemand } from "@/lib/api";
import { DEMO_DATE, DEMO_WEEK } from "@/lib/mock-data";
import { STRINGS, formatBDT } from "@/lib/strings";
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

export default function AreaPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("A01");
  const [selectedDate, setSelectedDate] = useState<string>(DEMO_DATE);

  const [riskData, setRiskData] = useState<AreaRiskResponse | null>(null);
  const [lostDemandData, setLostDemandData] = useState<AreaLostDemandResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);

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
          setError(STRINGS.loadError);
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header Card */}
      <section className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-5" aria-label="এরিয়া নির্বাচন ও সময়">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                {STRINGS.areaHeading}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                এরিয়া ম্যানেজার ভিউ
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              আগামীকালের জন্য সম্ভাব্য ক্যাশ ঘাটতি এবং এরিয়াভিত্তিক চাহিদা শিফট বিশ্লেষণ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Area Selector */}
            <div className="flex items-center gap-2 bg-slate-900 rounded-full px-4 py-2 border border-slate-800">
              <MapPin className="w-4 h-4 text-slate-400" />
              <label htmlFor="area-select" className="sr-only">
                এরিয়া নির্বাচন
              </label>
              <select
                id="area-select"
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-200 border-none focus:outline-none cursor-pointer"
              >
                {areas.map((a) => (
                  <option key={a.area_id} value={a.area_id} className="bg-navy-900 text-slate-200">
                    {a.area_id} ({a.area_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-slate-900 rounded-full px-4 py-2 border border-slate-800">
              <Calendar className="w-4 h-4 text-slate-400" />
              <label htmlFor="date-select" className="sr-only">
                তারিখ
              </label>
              <input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-200 border-none focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: 2 Columns for Risk Table, 1 Column for Lost Demand Bar Chart */}
      {error ? (
        <ErrorState message={error} onRetry={() => setSelectedAreaId(selectedAreaId)} />
      ) : loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="lg:col-span-1 space-y-3">
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Column 1 & 2: Risk Table */}
          <div className="lg:col-span-2 bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  এজেন্ট ঘাটতি ঝুঁকির তালিকা
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  এরিয়া {selectedAreaId} • মোট {sortedAgents.length} জন এজেন্ট
                </p>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm border-l-2 border-l-red-500 bg-red-950/40 inline-block" />
                <span>লাল সীমানা = উচ্চ ঝুঁকি (&ge; ৩০%)</span>
              </div>
            </div>

            {/* Accessible Table with Responsive Strategy */}
            <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {/* Agent ID Column */}
                    <th className="pb-3 pr-4">
                      <button
                        type="button"
                        onClick={() => handleSort("agent_id")}
                        className="flex items-center gap-1 font-semibold text-slate-300 hover:text-slate-100"
                        aria-label="এজেন্ট আইডি অনুযায়ী সাজান"
                      >
                        <span>{STRINGS.agentIdCol}</span>
                        {sortField === "agent_id" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-teal-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-teal-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                        )}
                      </button>
                    </th>

                    {/* Risk Pill Column */}
                    <th className="pb-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort("stockout_prob_habit")}
                        className="flex items-center gap-1 font-semibold text-slate-300 hover:text-slate-100"
                        aria-label="ঝুঁকির মাত্রা অনুযায়ী সাজান"
                      >
                        <span>{STRINGS.riskProbCol}</span>
                        {sortField === "stockout_prob_habit" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-teal-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-teal-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                        )}
                      </button>
                    </th>

                    {/* Risk Hour Column */}
                    <th className="pb-3 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort("risk_hour")}
                        className="flex items-center gap-1 font-semibold text-slate-300 hover:text-slate-100 ml-auto"
                        aria-label="ঝুঁকির সময় অনুযায়ী সাজান"
                      >
                        <span>{STRINGS.riskHourCol}</span>
                        {sortField === "risk_hour" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-teal-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-teal-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80">
                  {sortedAgents.map((ag: AreaAgentRisk) => {
                    const isHighRisk = ag.stockout_prob_habit >= 0.3;
                    const percent = Math.round(ag.stockout_prob_habit * 100);

                    return (
                      <tr
                        key={ag.agent_id}
                        className={`transition-colors hover:bg-slate-800/40 ${
                          isHighRisk ? "border-l-2 border-l-red-500 bg-red-950/20" : ""
                        }`}
                      >
                        {/* Agent ID */}
                        <td className="py-3.5 pr-4 font-bold text-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{ag.agent_id}</span>
                            {isHighRisk && (
                              <span className="text-[11px] font-semibold text-red-400">
                                {STRINGS.riskWord}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status / Risk Pill */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isHighRisk ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/50">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>নগদ ঘাটতি ঝুঁকি ({percent}%)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                              স্বাভাবিক অবস্থা ({percent}%)
                            </span>
                          )}
                        </td>

                        {/* Risk Hour */}
                        <td className="py-3.5 pl-4 text-right font-medium text-slate-300 tabular-nums whitespace-nowrap">
                          বিকেল {ag.risk_hour}:00
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column 3: Lost Demand Side Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-100 tracking-tight">
                    {STRINGS.areaLostDemandHeading}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">সপ্তাহ {DEMO_WEEK}</p>
                </div>

                {/* Digital shift badge if present in selected area */}
                {hasDigitalShift && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/50 shrink-0">
                    <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                    <span>{STRINGS.digitalShiftBadge}</span>
                  </span>
                )}
              </div>

              {/* Selected Area Summary Metrics */}
              {selectedAreaLostInfo && (
                <div className="p-3.5 bg-navy-900/90 rounded-xl space-y-2 text-xs border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">নির্বাচিত এরিয়া:</span>
                    <strong className="text-slate-200 font-bold">{selectedAreaId} ({currentArea?.area_type})</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">হারানো লেনদেন সংখ্যা:</span>
                    <strong className="text-slate-100 tabular-nums font-bold">
                      {Math.round(selectedAreaLostInfo.lost_count)} বার
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">হারানো চাহিদা পরিমাণ:</span>
                    <strong className="text-teal-400 tabular-nums font-bold text-sm">
                      ৳ {formatBDT(selectedAreaLostInfo.lost_amount)}
                    </strong>
                  </div>
                </div>
              )}

              {/* Bar Chart: All bars slate-700 except selected area bar teal */}
              <div
                className="h-64 w-full pt-2"
                role="region"
                aria-label="বিভিন্ন এরিয়ার সাপ্তাহিক হারানো চাহিদা চার্ট"
              >
                <div className="text-[11px] font-semibold text-slate-400 mb-1 text-right">
                  চাহিদা (BDT)
                </div>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="areaId"
                      tick={{ fill: "#94A3B8", fontSize: 12 }}
                      axisLine={{ stroke: "#334155" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94A3B8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: number) => [`৳ ${formatBDT(val)}`, "হারানো চাহিদা"]}
                      labelFormatter={(label) => `এরিয়া: ${label}`}
                      contentStyle={{
                        backgroundColor: "#0B1120",
                        borderRadius: "12px",
                        border: "1px solid #334155",
                        color: "#F8FAFC",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="lostAmount" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.areaId}
                          fill={entry.areaId === selectedAreaId ? "#14B8A6" : "#334155"}
                          className="cursor-pointer transition-colors"
                          onClick={() => setSelectedAreaId(entry.areaId)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[11px] text-slate-500 text-center">
                চার্টের বারে ক্লিক করে নির্দিষ্ট এরিয়া নির্বাচন করা যাবে।
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
