"use client";

import { useEffect, useState, useMemo } from "react";
import type {
  Area,
  AreaRiskResponse,
  AreaLostDemandResponse,
  AreaAgentRisk,
  AreaImpactResponse,
  AreaImpactAgent,
} from "@/lib/types";
import { getAreas, getAreaRisk, getAreaLostDemand, getAreaImpact, ApiError } from "@/lib/api";
import { DEMO_DATE, DEMO_WEEK } from "@/lib/mock-data";
import { STRINGS, formatBDT } from "@/lib/strings";
import { useLang } from "@/lib/lang";
import { Skeleton, ErrorState } from "@/components/Skeleton";
import { MockDataBanner } from "@/components/MockDataBanner";
import {
  Calendar,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Lock,
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
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("A01");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [lockedAreaId, setLockedAreaId] = useState<string | null>(null);

  const [riskData, setRiskData] = useState<AreaRiskResponse | null>(null);
  const [lostDemandData, setLostDemandData] = useState<AreaLostDemandResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sorting state: default by stockout_prob_habit descending
  const [sortField, setSortField] = useState<SortField>("stockout_prob_habit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Business Impact states
  const [impactDays, setImpactDays] = useState<7 | 30>(30);
  const [impactData, setImpactData] = useState<AreaImpactResponse | null>(null);
  const [impactSortField, setImpactSortField] = useState<"agent_id" | "confirmed_stockout_hours" | "estimated_missed_amount" | "estimated_lost_commission">("estimated_missed_amount");
  const [impactSortDirection, setImpactSortDirection] = useState<SortDirection>("desc");

  // Check user session
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const s = await res.json();
          setUserRole(s.role);
          if (s.role === "manager" && s.id) {
            setLockedAreaId(s.id);
            setSelectedAreaId(s.id);
          }
        }
      } catch (err) {
        // ignore
      }
    }
    checkSession();
  }, []);

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
      setErrorMessage(null);

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
          if (err instanceof ApiError && err.isForbidden) {
            setErrorMessage("আপনার এই তথ্য দেখার অনুমতি নেই / You don't have access to this resource");
          }
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

  // Load area business impact from server
  useEffect(() => {
    async function loadImpact() {
      if (!selectedAreaId) return;
      try {
        const data = await getAreaImpact(selectedAreaId, impactDays);
        setImpactData(data);
      } catch (err) {
        console.warn("Failed to load area impact", err);
      }
    }
    loadImpact();
  }, [selectedAreaId, impactDays]);

  const handleImpactSort = (field: "agent_id" | "confirmed_stockout_hours" | "estimated_missed_amount" | "estimated_lost_commission") => {
    if (impactSortField === field) {
      setImpactSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setImpactSortField(field);
      setImpactSortDirection("desc");
    }
  };

  const sortedImpactAgents = useMemo(() => {
    if (!impactData?.agents) return [];
    return [...impactData.agents].sort((a, b) => {
      let cmp = 0;
      if (impactSortField === "agent_id") {
        cmp = a.agent_id.localeCompare(b.agent_id);
      } else if (impactSortField === "confirmed_stockout_hours") {
        cmp = a.confirmed_stockout_hours - b.confirmed_stockout_hours;
      } else if (impactSortField === "estimated_missed_amount") {
        cmp = a.estimated_missed_amount - b.estimated_missed_amount;
      } else if (impactSortField === "estimated_lost_commission") {
        cmp = a.estimated_lost_commission - b.estimated_lost_commission;
      }
      return impactSortDirection === "asc" ? cmp : -cmp;
    });
  }, [impactData, impactSortField, impactSortDirection]);


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

  if (userRole === "agent") {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <ErrorState
          message="আপনার এই তথ্য দেখার অনুমতি নেই / You don't have access to this resource"
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <MockDataBanner />

      <section className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5" aria-label={t.areaViewBadge}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                {t.areaHeading}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                {t.areaViewBadge}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {t.areaSubheading}
            </p>
          </div>

          <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-2.5">
            <div className={`flex items-center gap-2 bg-slate-900 rounded-full px-3.5 py-2 border border-slate-800 ${userRole === "manager" ? "opacity-90" : ""}`}>
              {userRole === "manager" ? (
                <Lock className="w-4 h-4 text-teal-400 shrink-0" />
              ) : (
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <label htmlFor="area-select" className="sr-only">
                {t.areaSelectorLabel}
              </label>
              <select
                id="area-select"
                disabled={userRole === "manager"}
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className={`bg-transparent text-xs sm:text-sm font-semibold text-slate-200 border-none focus:outline-none w-full ${userRole === "manager" ? "cursor-default" : "cursor-pointer"}`}
              >
                {areas.map((a) => (
                  <option key={a.area_id} value={a.area_id} className="bg-navy-900 text-slate-200">
                    {a.area_id} ({a.area_type}){userRole === "manager" ? " - Locked" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 rounded-full px-3.5 py-2 border border-slate-800">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
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
                className="bg-transparent text-xs sm:text-sm font-medium text-slate-200 border-none focus:outline-none cursor-pointer w-full [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <ErrorState
          message={errorMessage || undefined}
          onRetry={() => setSelectedAreaId(selectedAreaId)}
        />
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
        <>
          {/* Area Business Impact Section */}
          <section className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 space-y-4 animate-fade-in" aria-label={t.areaImpactHeading}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                    {t.areaImpactHeading}
                  </h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-950/60 text-teal-300 border border-teal-800/60">
                    {selectedAreaId}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t.areaImpactSubheading}
                </p>
              </div>

              {/* Period toggle */}
              <div className="flex items-center gap-1 bg-slate-900 rounded-full p-1 border border-slate-800 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setImpactDays(7)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    impactDays === 7
                      ? "bg-teal-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t.period7Days}
                </button>
                <button
                  type="button"
                  onClick={() => setImpactDays(30)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    impactDays === 30
                      ? "bg-teal-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t.period30Days}
                </button>
              </div>
            </div>

            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Total estimated lost cash-out BDT */}
              <div className="p-3.5 bg-navy-900/90 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{t.totalLostCashoutBdt}</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/50">
                    {t.badgeEstimated}
                  </span>
                </div>
                <div className="text-lg font-bold text-teal-400 tabular-nums">
                  ৳ {formatBDT(impactData?.total_lost_cashout_bdt ?? 0)}
                </div>
              </div>

              {/* Card 2: Total estimated lost commission */}
              <div className="p-3.5 bg-navy-900/90 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{t.totalLostCommissionBdt}</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/50">
                    {t.badgeEstimated}
                  </span>
                </div>
                <div className="text-lg font-bold text-amber-400 tabular-nums">
                  ৳ {formatBDT(impactData?.total_lost_commission_bdt ?? 0)}
                </div>
              </div>

              {/* Card 3: Confirmed stock-out hours */}
              <div className="p-3.5 bg-navy-900/90 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{t.areaConfirmedStockouts}</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-800/60">
                    {t.badgeConfirmed}
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-100 tabular-nums">
                  {impactData?.confirmed_stockout_hours ?? 0} {lang === "bn" ? "ঘণ্টা" : "hrs"}
                </div>
              </div>

              {/* Card 4: Agents reporting count */}
              <div className="p-3.5 bg-navy-900/90 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{t.agentsReportingCount}</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-800/60">
                    {t.badgeConfirmed}
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-100 tabular-nums">
                  {impactData?.agents_reporting ?? 0} {lang === "bn" ? "জন" : "agents"}
                </div>
              </div>
            </div>

            {/* Own-Area Agents Table */}
            <div className="space-y-2 pt-1">
              <h3 className="text-sm font-bold text-slate-200">
                {t.agentImpactTableTitle}
              </h3>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-navy-900/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleImpactSort("agent_id")}
                          className="flex items-center gap-1 font-semibold text-slate-300 hover:text-slate-100"
                        >
                          <span>{t.colAgentId}</span>
                          {impactSortField === "agent_id" ? (
                            impactSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleImpactSort("confirmed_stockout_hours")}
                          className="flex items-center gap-1 font-semibold text-slate-300 hover:text-slate-100"
                        >
                          <span>{t.colConfirmedStockoutHours}</span>
                          <span className="text-[9px] font-normal lowercase px-1 rounded bg-teal-950/60 text-teal-300 ml-1">
                            {t.badgeConfirmed}
                          </span>
                          {impactSortField === "confirmed_stockout_hours" ? (
                            impactSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleImpactSort("estimated_missed_amount")}
                          className="flex items-center gap-1 font-semibold text-slate-300 hover:text-slate-100"
                        >
                          <span>{t.colEstimatedMissedAmount}</span>
                          <span className="text-[9px] font-normal lowercase px-1 rounded bg-amber-950/40 text-amber-300 ml-1">
                            {t.badgeEstimated}
                          </span>
                          {impactSortField === "estimated_missed_amount" ? (
                            impactSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleImpactSort("estimated_lost_commission")}
                          className="flex items-center gap-1 font-semibold text-slate-300 hover:text-slate-100"
                        >
                          <span>{t.colEstimatedLostCommission}</span>
                          <span className="text-[9px] font-normal lowercase px-1 rounded bg-amber-950/40 text-amber-300 ml-1">
                            {t.badgeEstimated}
                          </span>
                          {impactSortField === "estimated_lost_commission" ? (
                            impactSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        <span>{t.colPlanAdoption}</span>
                        <span className="text-[9px] font-normal lowercase px-1 rounded bg-teal-950/60 text-teal-300 ml-1">
                          {t.badgeConfirmed}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sortedImpactAgents.map((ag) => (
                      <tr
                        key={ag.agent_id}
                        className={`transition-colors hover:bg-slate-800/40 ${
                          ag.needs_liquidity_support ? "border-l-2 border-l-red-500 bg-red-950/15" : ""
                        }`}
                      >
                        <td className="py-3 px-3 font-bold text-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{ag.agent_id}</span>
                            {ag.needs_liquidity_support && (
                              <span className="text-[10px] font-semibold text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/50">
                                {t.top5LiquidityNeedBadge}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 tabular-nums text-slate-300 whitespace-nowrap">
                          {ag.confirmed_stockout_hours} {lang === "bn" ? "ঘণ্টা" : "hrs"}
                        </td>
                        <td className="py-3 px-3 tabular-nums font-semibold text-teal-400 whitespace-nowrap">
                          ৳ {formatBDT(ag.estimated_missed_amount)}
                        </td>
                        <td className="py-3 px-3 tabular-nums font-medium text-amber-300 whitespace-nowrap">
                          ৳ {formatBDT(ag.estimated_lost_commission)}
                        </td>
                        <td className="py-3 px-3 tabular-nums text-right font-medium text-slate-300 whitespace-nowrap">
                          {ag.plan_adoption}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
          <div className="lg:col-span-2 bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div>
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  {t.agentShortfallList}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t.areaAgentCount(selectedAreaId, sortedAgents.length)}
                </p>
              </div>

              <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm border-l-2 border-l-red-500 bg-red-950/40 inline-block" />
                <span>{t.redBorderLegend}</span>
              </div>
            </div>

            <div className="block sm:hidden space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800/80">
                <span className="text-[11px]">{t.sortBy}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSort("stockout_prob_habit")}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      sortField === "stockout_prob_habit"
                        ? "bg-slate-800 text-teal-400 border-slate-700"
                        : "bg-slate-900/80 text-slate-400 border-slate-800"
                    }`}
                  >
                    {t.riskWord} {sortField === "stockout_prob_habit" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort("agent_id")}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      sortField === "agent_id"
                        ? "bg-slate-800 text-teal-400 border-slate-700"
                        : "bg-slate-900/80 text-slate-400 border-slate-800"
                    }`}
                  >
                    {t.agentIdCol} {sortField === "agent_id" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort("risk_hour")}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      sortField === "risk_hour"
                        ? "bg-slate-800 text-teal-400 border-slate-700"
                        : "bg-slate-900/80 text-slate-400 border-slate-800"
                    }`}
                  >
                    {t.riskHourCol} {sortField === "risk_hour" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </button>
                </div>
              </div>

              {/* Agent Cards for Mobile */}
              {sortedAgents.map((ag: AreaAgentRisk) => {
                const isHighRisk = ag.stockout_prob_habit >= 0.3;
                const percent = Math.round(ag.stockout_prob_habit * 100);

                return (
                  <div
                    key={ag.agent_id}
                    className={`p-3 rounded-xl border border-slate-800 bg-navy-900/90 transition-colors ${
                      isHighRisk ? "border-l-2 border-l-red-500 bg-red-950/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-100 text-sm">{ag.agent_id}</span>
                        {isHighRisk && (
                          <span className="text-[10px] font-semibold text-red-400 px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/50">
                            {t.riskWord}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {t.riskTime(ag.risk_hour)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <span className="text-xs text-slate-400">{t.shortfallProb}:</span>
                      {isHighRisk ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/50">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{t.cashShortfall} ({percent}%)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                          {t.normal} ({percent}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4">
                      <button
                        type="button"
                        onClick={() => handleSort("agent_id")}
                        className="flex items-center gap-1 font-semibold text-slate-300 hover:text-slate-100"
                        aria-label={`${t.sortBy} ${t.agentIdCol}`}
                      >
                        <span>{t.agentIdCol}</span>
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

                    <th className="pb-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort("stockout_prob_habit")}
                        className="flex items-center gap-1 font-semibold text-slate-300 hover:text-slate-100"
                        aria-label={`${t.sortBy} ${t.riskProbCol}`}
                      >
                        <span>{t.riskProbCol}</span>
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

                    <th className="pb-3 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort("risk_hour")}
                        className="flex items-center gap-1 font-semibold text-slate-300 hover:text-slate-100 ml-auto"
                        aria-label={`${t.sortBy} ${t.riskHourCol}`}
                      >
                        <span>{t.riskHourCol}</span>
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
                        <td className="py-3.5 pr-4 font-bold text-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{ag.agent_id}</span>
                            {isHighRisk && (
                              <span className="text-[11px] font-semibold text-red-400">
                                {t.riskWord}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isHighRisk ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/50">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{t.cashShortfallRisk} ({percent}%)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                              {t.normalState} ({percent}%)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 pl-4 text-right font-medium text-slate-300 tabular-nums whitespace-nowrap">
                          {t.riskTime(ag.risk_hour)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-100 tracking-tight">
                    {t.areaLostDemandHeading}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{t.week} {DEMO_WEEK}</p>
                </div>

                {hasDigitalShift && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/50 shrink-0">
                    <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.digitalShiftBadge}</span>
                  </span>
                )}
              </div>

              {selectedAreaLostInfo && (
                <div className="p-3.5 bg-navy-900/90 rounded-xl space-y-2 text-xs border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{t.areaSelectorLabel}:</span>
                    <strong className="text-slate-200 font-bold">{selectedAreaId} ({currentArea?.area_type})</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{t.lostTransactionsLabel}:</span>
                    <strong className="text-slate-100 tabular-nums font-bold">
                      {t.lostCountUnit(Math.round(selectedAreaLostInfo.lost_count))}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{t.lostAmountLabel}:</span>
                    <strong className="text-teal-400 tabular-nums font-bold text-sm">
                      ৳ {formatBDT(selectedAreaLostInfo.lost_amount)}
                    </strong>
                  </div>
                </div>
              )}

              <div
                className="h-60 sm:h-64 w-full pt-2"
                role="region"
                aria-label={lang === "en" ? "Weekly lost demand chart across areas" : "বিভিন্ন এরিয়ার সাপ্তাহিক হারানো চাহিদা চার্ট"}
              >
                <div className="text-[11px] font-semibold text-slate-400 mb-1 text-right">
                  {t.demandBdt}
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
                      formatter={(val: number) => [`৳ ${formatBDT(val)}`, t.lostAmountLabel]}
                      labelFormatter={(label) => `${t.areaSelectorLabel}: ${label}`}
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
                {t.chartTapHint}
              </p>
            </div>
          </div>
        </div>
      </>
    )}
    </div>
  );
}
