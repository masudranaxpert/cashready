"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  Area,
  AreaRiskResponse,
  AreaLostDemandResponse,
  AreaAgentRisk,
  AreaImpactResponse,
} from "@/lib/types";
import { getAreas, getAreaRisk, getAreaLostDemand, getAreaImpact, ApiError } from "@/lib/api";
import { DEMO_WEEK } from "@/lib/mock-data";
import { formatBDT } from "@/lib/strings";
import { useLang } from "@/lib/lang";
import { useTheme } from "@/lib/theme";
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
  Lock,
  TrendingUp,
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
  const router = useRouter();
  const { t, lang } = useLang();
  const { theme } = useTheme();
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
          if (!s.authenticated) {
            router.replace("/login");
            return;
          }
          setUserRole(s.role);
          if (s.role === "manager" && s.id) {
            setLockedAreaId(s.id);
            setSelectedAreaId(s.id);
          }
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    }
    checkSession();
  }, [router]);

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

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

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
  const highRiskCount = sortedAgents.filter((a) => a.stockout_prob_habit >= 0.3).length;

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

      <section className="card-soft" aria-label={t.areaViewBadge}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>{t.areaHeading}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                    {selectedAreaId}
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>{highRiskCount} {lang === "en" ? "High Risk" : "উচ্চ ঝুঁকিপূর্ণ"}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold">
                  <span>{lang === "en" ? "All Stable" : "স্থিতিশীল"}</span>
                </span>
              )}
            </div>

            <div className={`flex items-center gap-2 bg-slate-100 dark:bg-navy-900/90 rounded-full px-3.5 py-1.5 border border-slate-200 dark:border-white/[0.08] shadow-sm ${userRole === "manager" ? "opacity-90" : ""}`}>
              {userRole === "manager" ? (
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              <label htmlFor="area-select" className="sr-only">
                {t.areaSelectorLabel}
              </label>
              <select
                id="area-select"
                disabled={userRole === "manager"}
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className={`bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-white border-none focus:outline-none ${userRole === "manager" ? "cursor-default" : "cursor-pointer"}`}
              >
                {areas.map((a) => (
                  <option key={a.area_id} value={a.area_id} className="bg-white dark:bg-navy-950 text-slate-900 dark:text-white">
                    {a.area_id} ({a.area_type}){userRole === "manager" ? " - Locked" : ""}
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
        <ErrorState
          message={errorMessage || undefined}
          onRetry={() => setSelectedAreaId(selectedAreaId)}
        />
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-3">
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-1 space-y-3">
              <Skeleton className="h-80 w-full" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Area Business Impact Section ("এলাকার Business Impact") */}
          <section className="card-soft space-y-4 animate-fade-in" aria-label={t.areaImpactHeading}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.06] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {t.areaImpactHeading}
                  </h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                    {selectedAreaId}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.areaImpactSubheading}
                </p>
              </div>

              {/* Period toggle */}
              <div className="inline-flex items-center bg-slate-100 dark:bg-navy-900/90 rounded-full p-1 border border-slate-200 dark:border-white/[0.08] self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setImpactDays(7)}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                    impactDays === 7
                      ? "bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {t.period7Days}
                </button>
                <button
                  type="button"
                  onClick={() => setImpactDays(30)}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                    impactDays === 30
                      ? "bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {t.period30Days}
                </button>
              </div>
            </div>

            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Total estimated lost cash-out BDT */}
              <div className="p-3.5 bg-slate-50 dark:bg-navy-900/80 rounded-xl border border-slate-200 dark:border-white/[0.06] space-y-1.5">
                <div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 min-w-0">{t.totalLostCashoutBdt}</span>
                </div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                  ৳ {formatBDT(impactData?.total_lost_cashout_bdt ?? 0)}
                </div>
              </div>

              {/* Card 2: Total estimated lost commission */}
              <div className="p-3.5 bg-slate-50 dark:bg-navy-900/80 rounded-xl border border-slate-200 dark:border-white/[0.06] space-y-1.5">
                <div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 min-w-0">{t.totalLostCommissionBdt}</span>
                </div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  ৳ {formatBDT(impactData?.total_lost_commission_bdt ?? 0)}
                </div>
              </div>

              {/* Card 3: Confirmed stock-out hours */}
              <div className="p-3.5 bg-slate-50 dark:bg-navy-900/80 rounded-xl border border-slate-200 dark:border-white/[0.06] space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 min-w-0">{t.areaConfirmedStockouts}</span>
                  <span className="shrink-0 whitespace-nowrap text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                    {t.badgeConfirmed}
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                  {impactData?.confirmed_stockout_hours ?? 0} {lang === "bn" ? "ঘণ্টা" : "hrs"}
                </div>
              </div>

              {/* Card 4: Agents reporting count */}
              <div className="p-3.5 bg-slate-50 dark:bg-navy-900/80 rounded-xl border border-slate-200 dark:border-white/[0.06] space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 min-w-0">{t.agentsReportingCount}</span>
                  <span className="shrink-0 whitespace-nowrap text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                    {t.badgeConfirmed}
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                  {impactData?.agents_reporting ?? 0} {lang === "bn" ? "জন" : "agents"}
                </div>
              </div>
            </div>

            {/* Own-Area Agents Table */}
            <div className="space-y-2 pt-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.agentImpactTableTitle}
              </h3>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.08]">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100/90 dark:bg-navy-900/90 border-b border-slate-200 dark:border-white/[0.08] text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleImpactSort("agent_id")}
                          className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        >
                          <span>{t.colAgentId}</span>
                          {impactSortField === "agent_id" ? (
                            impactSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleImpactSort("confirmed_stockout_hours")}
                          className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        >
                          <span>{t.colConfirmedStockoutHours}</span>
                          <span className="shrink-0 whitespace-nowrap text-[9px] font-normal lowercase px-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 ml-1">
                            {t.badgeConfirmed}
                          </span>
                          {impactSortField === "confirmed_stockout_hours" ? (
                            impactSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleImpactSort("estimated_missed_amount")}
                          className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        >
                          <span>{t.colEstimatedMissedAmount}</span>
                          {impactSortField === "estimated_missed_amount" ? (
                            impactSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleImpactSort("estimated_lost_commission")}
                          className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        >
                          <span>{t.colEstimatedLostCommission}</span>
                          {impactSortField === "estimated_lost_commission" ? (
                            impactSortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        <span>{t.colPlanAdoption}</span>
                        <span className="shrink-0 whitespace-nowrap text-[9px] font-normal lowercase px-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 ml-1">
                          {t.badgeConfirmed}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                    {sortedImpactAgents.map((ag) => (
                      <tr
                        key={ag.agent_id}
                        className={`transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/40 ${
                          ag.needs_liquidity_support ? "border-l-2 border-l-rose-500 bg-rose-500/5 dark:bg-rose-950/15" : ""
                        }`}
                      >
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{ag.agent_id}</span>
                            {ag.needs_liquidity_support && (
                              <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50 px-1.5 py-0.5 rounded">
                                {t.top5LiquidityNeedBadge}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {ag.confirmed_stockout_hours} {lang === "bn" ? "ঘণ্টা" : "hrs"}
                        </td>
                        <td className="py-3 px-3 tabular-nums font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          ৳ {formatBDT(ag.estimated_missed_amount)}
                        </td>
                        <td className="py-3 px-3 tabular-nums font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          ৳ {formatBDT(ag.estimated_lost_commission)}
                        </td>
                        <td className="py-3 px-3 tabular-nums text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {ag.plan_adoption}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Daily Operations: Shortfall list and Lost Demand chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
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
                      className={`p-3.5 rounded-2xl border transition-all duration-200 ${
                        isHighRisk
                          ? "border-l-4 border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/20 border-slate-200 dark:border-white/[0.06]"
                          : "bg-slate-50 dark:bg-navy-900/60 border-slate-200 dark:border-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">{ag.agent_id}</span>
                          {isHighRisk && (
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/30">
                              {t.riskWord}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                          {t.riskTime(ag.risk_hour)}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/[0.04]">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{t.shortfallProb}:</span>
                        {isHighRisk ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>{t.cashShortfall} ({percent}%)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.06]">
                            {t.normal} ({percent}%)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pr-4">
                        <button
                          type="button"
                          onClick={() => handleSort("agent_id")}
                          className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          aria-label={`${t.sortBy} ${t.agentIdCol}`}
                        >
                          <span>{t.agentIdCol}</span>
                          {sortField === "agent_id" ? (
                            sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </th>

                      <th className="pb-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleSort("stockout_prob_habit")}
                          className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          aria-label={`${t.sortBy} ${t.riskProbCol}`}
                        >
                          <span>{t.riskProbCol}</span>
                          {sortField === "stockout_prob_habit" ? (
                            sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </th>

                      <th className="pb-3 pl-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleSort("risk_hour")}
                          className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white ml-auto"
                          aria-label={`${t.sortBy} ${t.riskHourCol}`}
                        >
                          <span>{t.riskHourCol}</span>
                          {sortField === "risk_hour" ? (
                            sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                    {sortedAgents.map((ag: AreaAgentRisk) => {
                      const isHighRisk = ag.stockout_prob_habit >= 0.3;
                      const percent = Math.round(ag.stockout_prob_habit * 100);

                      return (
                        <tr
                          key={ag.agent_id}
                          className={`transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/40 ${
                            isHighRisk ? "border-l-4 border-l-rose-500 bg-rose-50/40 dark:bg-rose-950/20" : ""
                          }`}
                        >
                          <td className="py-3.5 pr-4 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{ag.agent_id}</span>
                              {isHighRisk && (
                                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/30">
                                  {t.riskWord}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isHighRisk ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>{t.cashShortfallRisk} ({percent}%)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-white/[0.06]">
                                {t.normalState} ({percent}%)
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 pl-4 text-right font-semibold text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                            {t.riskTime(ag.risk_hour)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Area Lost Demand & Chart */}
            <div className="lg:col-span-1 space-y-4">
              <div className="card-soft space-y-4">
                <div className="flex items-start justify-between gap-2 pb-1 border-b border-slate-200 dark:border-white/[0.06]">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      {t.areaLostDemandHeading}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.week} {DEMO_WEEK}</p>
                  </div>

                  {hasDigitalShift && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 shrink-0">
                      <TrendingDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{t.digitalShiftBadge}</span>
                    </span>
                  )}
                </div>

                {selectedAreaLostInfo && (
                  <div className="p-3.5 bg-slate-50 dark:bg-navy-900/90 rounded-2xl space-y-2 text-xs border border-slate-200 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">{t.areaSelectorLabel}:</span>
                      <strong className="text-slate-900 dark:text-white font-bold">{selectedAreaId} ({currentArea?.area_type})</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">{t.lostTransactionsLabel}:</span>
                      <strong className="text-slate-900 dark:text-white tabular-nums font-bold">
                        {t.lostCountUnit(Math.round(selectedAreaLostInfo.lost_count))}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">{t.lostAmountLabel}:</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 tabular-nums font-black text-sm">
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
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 text-right">
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
                          borderRadius: "16px",
                          border: theme === "light" ? "1px solid #CBD5E1" : "1px solid rgba(255,255,255,0.12)",
                          color: theme === "light" ? "#0F172A" : "#F8FAFC",
                          fontSize: "12px",
                          boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.2)",
                        }}
                      />
                      <Bar dataKey="lostAmount" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry) => (
                          <Cell
                            key={entry.areaId}
                            fill={entry.areaId === selectedAreaId ? "#10B981" : theme === "light" ? "#CBD5E1" : "#334155"}
                            className="cursor-pointer transition-colors"
                            onClick={() => setSelectedAreaId(entry.areaId)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-medium">
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
