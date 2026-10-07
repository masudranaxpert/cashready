"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  Agent,
  AgentPlan,
  AgentLostDemand,
  RiskLevel,
  Reason,
  StockoutConfirmation,
  StockoutConfirmationPayload,
} from "@/lib/types";
import {
  getAgents,
  getAgentPlan,
  getAgentLostDemand,
  submitStockoutConfirmation,
  getAgentConfirmations,
  ApiError,
} from "@/lib/api";
import { DEMO_DATE, DEMO_WEEK } from "@/lib/mock-data";
import { formatBDT } from "@/lib/strings";
import { useLang } from "@/lib/lang";
import { Skeleton, ErrorState } from "@/components/Skeleton";
import { MockDataBanner } from "@/components/MockDataBanner";
import {
  Search,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  TrendingDown,
  Quote,
  Activity,
  Layers,
  Lock,
  TrendingUp,
} from "lucide-react";

function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const iso = `${year}-${month}-${day}`;
  return iso >= "2024-01-01" && iso <= "2030-12-31" ? iso : "2026-10-04";
}

export default function AgentPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("T0039");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("0.9");

  const [userRole, setUserRole] = useState<string | null>(null);
  const [lockedAgentId, setLockedAgentId] = useState<string | null>(null);

  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [lostDemand, setLostDemand] = useState<AgentLostDemand | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search filter for agent dropdown
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Structured Confirmation states
  const [cashRanOut, setCashRanOut] = useState<boolean>(false);
  const [keptRecommended, setKeptRecommended] = useState<"yes" | "partly" | "no">("yes");
  const [confSubmitting, setConfSubmitting] = useState<boolean>(false);
  const [confSubmitted, setConfSubmitted] = useState<boolean>(false);
  const [confError, setConfError] = useState<string | null>(null);
  const [agentConfirmations, setAgentConfirmations] = useState<StockoutConfirmation[]>([]);
  const [impactDays, setImpactDays] = useState<7 | 30>(30);

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
          if (s.role === "agent" && s.id) {
            setLockedAgentId(s.id);
            setSelectedAgentId(s.id);
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

  // Fetch agents list once
  useEffect(() => {
    async function loadAgents() {
      try {
        const list = await getAgents();
        setAgents(list);
        if (list.length > 0) {
          setSelectedAgentId((prev) =>
            list.find((a) => a.agent_id === prev) ? prev : list[0].agent_id
          );
        }
      } catch (err: unknown) {
        console.error("Failed to load agents", err);
      }
    }
    loadAgents();
  }, []);

  // Fetch plan & lost demand whenever selectedAgentId, selectedDate, or riskLevel changes
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      setError(false);
      setErrorMessage(null);

      try {
        const [planRes, lostRes] = await Promise.all([
          getAgentPlan(selectedAgentId, selectedDate, riskLevel),
          getAgentLostDemand(selectedAgentId, DEMO_WEEK),
        ]);

        if (!isCancelled) {
          setPlan(planRes);
          setLostDemand(lostRes);
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

    if (selectedAgentId) {
      loadData();
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedAgentId, selectedDate, riskLevel]);

  const filteredAgents = useMemo(() => {
    if (!searchQuery) return agents;
    const q = searchQuery.toLowerCase();
    return agents.filter(
      (a) =>
        a.agent_id.toLowerCase().includes(q) ||
        a.area_id.toLowerCase().includes(q) ||
        a.area_type.toLowerCase().includes(q)
    );
  }, [agents, searchQuery]);

  const currentAgent = agents.find((a) => a.agent_id === selectedAgentId) || agents[0];

  useEffect(() => {
    async function loadConfirmations() {
      if (!selectedAgentId) return;
      try {
        const confs = await getAgentConfirmations(selectedAgentId, impactDays);
        setAgentConfirmations(confs);
      } catch {
        // ignore
      }
    }
    loadConfirmations();
  }, [selectedAgentId, impactDays]);

  const handleConfirmationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confSubmitting) return;
    setConfSubmitting(true);
    setConfError(null);

    const payload: StockoutConfirmationPayload = {
      date: selectedDate,
      cash_ran_out: cashRanOut,
      from_hour: null,
      to_hour: null,
      customers_turned_away: null,
      kept_recommended_cash: keptRecommended,
      opening_cash_kept: null,
    };

    try {
      const res = await submitStockoutConfirmation(selectedAgentId, payload);
      setAgentConfirmations((prev) => [res, ...prev]);
      setConfSubmitted(true);
    } catch {
      setConfError(lang === "en" ? "Failed to save confirmation" : "রিপোর্ট সংরক্ষণ করা যায়নি");
    } finally {
      setConfSubmitting(false);
    }
  };

  const handleRiskChange = (newRisk: RiskLevel) => {
    setRiskLevel(newRisk);
  };

  // Computed values for Agent Business Impact Card ("আমার ব্যবসার অবস্থা")
  const periodConfirmations = useMemo(() => {
    const cutoff = Date.now() - impactDays * 24 * 60 * 60 * 1000;
    return agentConfirmations.filter((c) => {
      try {
        const t = new Date(c.timestamp).getTime();
        return t >= cutoff;
      } catch {
        return true;
      }
    });
  }, [agentConfirmations, impactDays]);

  const confirmedStockoutHours = useMemo(() => {
    return periodConfirmations.reduce((sum, c) => {
      if (!c.cash_ran_out) return sum;
      if (c.from_hour != null && c.to_hour != null) {
        return sum + Math.max(1, c.to_hour - c.from_hour);
      }
      return sum + 1;
    }, 0);
  }, [periodConfirmations]);

  const daysPlanFollowed = useMemo(() => {
    return periodConfirmations.filter((c) => c.kept_recommended_cash === "yes").length;
  }, [periodConfirmations]);

  const scale = impactDays === 30 ? 30 / 7 : 1.0;
  const estimatedMissedCount = (lostDemand?.lost_count ?? 0) * scale;
  const estimatedMissedBdt = (lostDemand?.lost_amount ?? 0) * scale;
  const estimatedLostCommissionBdt = (lostDemand?.lost_commission ?? 0) * scale;
  const estimatedStockoutHours = lostDemand?.lost_count
    ? Math.max(1, Math.round((lostDemand.lost_count * scale) / 3.0))
    : 0;

  return (
    <div className="max-w-6xl mx-auto w-full space-y-4">
      <MockDataBanner />

      {/* Mobile & Desktop Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Sidebar / Top on Mobile (col-span-5) */}
        <div className="lg:col-span-5 lg:order-2 space-y-4">
          {/* Agent & Date Selector */}
          <section className="card-soft space-y-3.5" aria-label={t.agentSelectorLabel}>
            <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-slate-200 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight block">
                    {t.agentViewBadge}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {currentAgent ? `${currentAgent.area_id} • ${currentAgent.area_type}` : "MFS Terminal"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-navy-900/90 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] shadow-sm shrink-0">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  min="2024-01-01"
                  max="2030-12-31"
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-[11px] sm:text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  aria-label={t.dateSelectorLabel}
                />
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="agent-search" className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {userRole === "agent"
                    ? (lang === "bn" ? "আপনার এজেন্ট আইডি (নির্ধারিত)" : "Your Agent ID (Locked)")
                    : t.agentSelectCount(agents.length)}
                </label>
                {userRole === "agent" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Lock className="w-3 h-3" />
                    <span>{lang === "bn" ? "লকড" : "Locked"}</span>
                  </span>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  id="agent-search"
                  disabled={userRole === "agent"}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full min-h-[44px] px-3.5 py-2 text-left bg-slate-100/90 hover:bg-slate-100 dark:bg-navy-900/90 dark:hover:bg-navy-900 rounded-xl border border-slate-200 dark:border-white/[0.1] hover:border-emerald-500/40 flex items-center justify-between text-sm transition-all text-slate-800 dark:text-slate-200 shadow-sm ${
                    userRole === "agent" ? "cursor-default opacity-90" : ""
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    <span className="font-extrabold text-slate-900 dark:text-white shrink-0 tracking-wide">
                      {currentAgent?.agent_id ?? selectedAgentId}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                      {currentAgent ? `• ${currentAgent.area_id} (${currentAgent.area_type})` : ""}
                    </span>
                  </div>
                  {userRole === "agent" ? (
                    <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                  ) : (
                    <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  )}
                </button>

                {isDropdownOpen && userRole !== "agent" && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-navy-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.12] z-[100] p-2.5 max-h-72 overflow-y-auto">
                    <div className="p-1 mb-2">
                      <input
                        type="text"
                        placeholder={t.agentSelectorPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        autoFocus
                      />
                    </div>
                    <ul role="listbox" className="space-y-1">
                      {filteredAgents.map((ag) => (
                        <li key={ag.agent_id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAgentId(ag.agent_id);
                              setIsDropdownOpen(false);
                              setSearchQuery("");
                            }}
                            className={`w-full min-h-[44px] px-3 py-2 text-left text-xs rounded-xl flex items-center justify-between transition-colors ${
                              ag.agent_id === selectedAgentId
                                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/30"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                            }`}
                            role="option"
                            aria-selected={ag.agent_id === selectedAgentId}
                          >
                            <span className="font-bold text-slate-900 dark:text-white">{ag.agent_id}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                              {ag.area_id} • {ag.area_type}
                            </span>
                          </button>
                        </li>
                      ))}
                      {filteredAgents.length === 0 && (
                        <li className="px-3 py-2 text-xs text-slate-500 text-center">{t.noAgentMatch}</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Structured Confirmation Form Card */}
          <section className="card-soft space-y-3.5" aria-label={t.confirmationFormTitle}>
            <div className="flex items-start sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-200 dark:border-white/[0.06]">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{t.confirmationFormTitle}</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {t.confirmationFormDesc}
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                {t.badgeConfirmed}
              </span>
            </div>

            {confSubmitted ? (
              <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl space-y-2 text-slate-900 dark:text-white">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{t.confirmationSuccess}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {lang === "en"
                    ? `Recorded: Cash ran out: ${cashRanOut ? "Yes" : "No"}, Kept plan: ${keptRecommended}.`
                    : `সংরক্ষিত তথ্য: নগদ ফুরিয়েছিল: ${cashRanOut ? "হ্যাঁ" : "না"}, প্ল্যান অনুসরণ: ${keptRecommended === "yes" ? "হ্যাঁ" : keptRecommended === "partly" ? "আংশিক" : "না"}।`}
                </p>
                <button
                  type="button"
                  onClick={() => setConfSubmitted(false)}
                  className="text-xs text-emerald-700 dark:text-emerald-400 underline font-semibold pt-1"
                >
                  {lang === "en" ? "Update report" : "পুনরায় রিপোর্ট সংশোধন করুন"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmationSubmit} className="space-y-3 text-xs">
                {/* Q1: Cash ran out? */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-200 block">
                    {t.qCashRanOut}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCashRanOut(false)}
                      className={`min-h-[40px] px-3 py-2 rounded-xl font-bold border transition-all ${
                        !cashRanOut
                          ? "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 shadow-sm"
                          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-navy-900/80 dark:text-slate-400 dark:border-white/[0.08]"
                      }`}
                    >
                      {t.qRanOutNo}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashRanOut(true)}
                      className={`min-h-[40px] px-3 py-2 rounded-xl font-bold border transition-all ${
                        cashRanOut
                          ? "bg-rose-600 text-white border-rose-600 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 shadow-sm"
                          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-navy-900/80 dark:text-slate-400 dark:border-white/[0.08]"
                      }`}
                    >
                      {t.qRanOutYes}
                    </button>
                  </div>
                </div>

                {/* Q2: Kept recommended cash? */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-200 block">
                    {t.qKeptRecommended}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setKeptRecommended("yes")}
                      className={`min-h-[38px] px-2 py-1.5 rounded-xl font-semibold border text-center transition-all ${
                        keptRecommended === "yes"
                          ? "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 shadow-sm"
                          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-navy-900/80 dark:text-slate-400 dark:border-white/[0.08]"
                      }`}
                    >
                      {t.optKeptYes}
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeptRecommended("partly")}
                      className={`min-h-[38px] px-2 py-1.5 rounded-xl font-semibold border text-center transition-all ${
                        keptRecommended === "partly"
                          ? "bg-amber-600 text-white border-amber-600 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 shadow-sm"
                          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-navy-900/80 dark:text-slate-400 dark:border-white/[0.08]"
                      }`}
                    >
                      {t.optKeptPartly}
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeptRecommended("no")}
                      className={`min-h-[38px] px-2 py-1.5 rounded-xl font-semibold border text-center transition-all ${
                        keptRecommended === "no"
                          ? "bg-rose-600 text-white border-rose-600 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 shadow-sm"
                          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-navy-900/80 dark:text-slate-400 dark:border-white/[0.08]"
                      }`}
                    >
                      {t.optKeptNo}
                    </button>
                  </div>
                </div>

                {confError && (
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs">
                    {confError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={confSubmitting}
                  className="w-full btn-primary min-h-[44px] text-xs sm:text-sm font-bold shadow-sm"
                >
                  {confSubmitting ? t.loading : t.btnSubmitConfirmation}
                </button>
              </form>
            )}
          </section>

          {/* Key Drivers (SHAP Explanations) */}
          {plan && !loading && (
            <section className="card-soft space-y-3.5" aria-label={t.reasonsHeading}>
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    {t.reasonsHeading}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/[0.06]">
                  {t.shapCaption}
                </span>
              </div>

              {plan.reasons && plan.reasons.length > 0 ? (
                <div className="space-y-2.5 pt-0.5">
                  {(() => {
                    const topReasons = plan.reasons.slice(0, 3);
                    const maxImpact = Math.max(
                      0.35,
                      ...topReasons.map((r) => Math.abs(r.impact || 0))
                    );

                    return topReasons.map((r: Reason, idx: number) => {
                      const impact = r.impact ?? 0;
                      const isPositive = impact > 0;
                      const isNegative = impact < 0;
                      const isZero = impact === 0;
                      const pct = isZero
                        ? 0
                        : Math.min(100, Math.round((Math.abs(impact) / maxImpact) * 100));
                      const reasonLabel = (lang === "en" && r.label_en) ? r.label_en : (r.label_bn || "");

                      return (
                        <div key={r.key || idx} className="space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200/80 dark:border-white/[0.04]">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0">
                              {reasonLabel}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                {isPositive ? t.impactUp : isNegative ? t.impactDown : t.impactNeutral}
                              </span>
                              <span
                                className={`font-bold tabular-nums text-xs px-1.5 py-0.5 rounded-md ${
                                  isPositive
                                    ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"
                                    : isNegative
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                {isPositive ? `+${impact.toFixed(2)}` : impact.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div
                            className="h-2.5 w-full bg-slate-200 dark:bg-navy-950 rounded-full flex items-center relative border border-slate-300 dark:border-white/[0.06] overflow-hidden"
                            role="meter"
                            aria-label={`${reasonLabel}: ${isPositive ? t.impactUp : isNegative ? t.impactDown : t.impactNeutral} ${impact.toFixed(2)}`}
                            aria-valuenow={Number(impact.toFixed(2))}
                            aria-valuemin={-1}
                            aria-valuemax={1}
                          >
                            <div className="w-1/2 h-full flex justify-end">
                              {isNegative && (
                                <div
                                  className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-l-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              )}
                            </div>

                            <div className="w-[2px] h-full bg-slate-400 dark:bg-slate-500 shrink-0 z-10" />

                            <div className="w-1/2 h-full flex justify-start">
                              {isPositive && (
                                <div
                                  className="h-full bg-amber-500 dark:bg-amber-400 rounded-r-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-2">{t.reasonsEmpty}</p>
              )}
            </section>
          )}
        </div>

        {/* Main Column: Hero Plan & Business Impact & Lost Demand (col-span-7) */}
        <div className="lg:col-span-7 lg:order-1 space-y-4">
          {error ? (
            <ErrorState
              message={errorMessage || undefined}
              onRetry={() => setSelectedAgentId(selectedAgentId)}
            />
          ) : loading || !plan ? (
            <div className="space-y-4">
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Primary Hero Liquidity Recommendation Card */}
              <section className="card-hero text-center space-y-4 relative overflow-hidden" aria-label={t.heroPlanHeading}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-emerald-500/10 to-transparent blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between relative z-10 pb-1 border-b border-slate-200 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-300 tracking-tight text-left">
                      {t.heroPlanHeading}
                    </h2>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                    {riskLevel === "0.8" ? t.planBadgeSafe : riskLevel === "0.9" ? t.planBadgeBalanced : t.planBadgeCautious}
                  </span>
                </div>

                <div className="py-2 sm:py-3 relative z-10">
                  <div className="text-4xl min-[390px]:text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 dark:from-emerald-300 dark:via-teal-200 dark:to-emerald-400 tracking-tight tabular-nums drop-shadow-sm">
                    ৳ {formatBDT(plan.opening_cash)}
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mt-2 flex items-center justify-center gap-1.5">
                    <span>{t.openingCashLabel}</span>
                    <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      {t.riskLevelSet} ({riskLevel === "0.8" ? "80%" : riskLevel === "0.9" ? "90%" : "95%"})
                    </span>
                  </p>
                </div>

                {/* Natural Quoted Advisory Message Box */}
                <div className="p-4 sm:p-4.5 bg-emerald-50/70 dark:bg-navy-950/80 rounded-2xl text-left border border-emerald-200/80 dark:border-white/[0.08] relative z-10 shadow-sm">
                  <div className="flex gap-2.5 items-start">
                    <Quote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1 opacity-90" />
                    <p className="text-[15px] sm:text-[16px] text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                      {(() => {
                        const raw = lang === "en" && plan.message_en ? plan.message_en : plan.message_bn;
                        const formatted = formatBDT(plan.opening_cash);
                        if (lang === "en") {
                          return raw.replace(/(Keep\s+)([\d,]+)(\s+BDT)/, `$1${formatted}$3`);
                        }
                        return raw.replace(/(আজ সকালে\s+)([\d,০-৯]+)(\s+টাকা)/, `$1${formatted}$3`);
                      })()}
                    </p>
                  </div>
                </div>

                {/* Risk Controller Segmented Pill */}
                <div className="pt-1 relative z-10">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between px-1">
                    <span>{t.riskLevelSet}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {riskLevel === "0.8" ? t.riskSafe80 : riskLevel === "0.9" ? t.riskBalanced90 : t.riskCautious95}
                    </span>
                  </div>

                  <div
                    className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 dark:bg-navy-950/90 border border-slate-200 dark:border-white/[0.08] rounded-2xl w-full shadow-inner"
                    role="radiogroup"
                    aria-label={t.riskLevelSet}
                  >
                    {(
                      [
                        { key: "0.8", label: t.riskTiers.safe },
                        { key: "0.9", label: t.riskTiers.balanced },
                        { key: "0.95", label: t.riskTiers.cautious },
                      ] as const
                    ).map((tier) => {
                      const isSelected = riskLevel === tier.key;
                      return (
                        <button
                          key={tier.key}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => handleRiskChange(tier.key)}
                          className={`min-h-[44px] py-2 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 active:scale-[0.96] text-center truncate ${
                            isSelected
                              ? "bg-emerald-600 dark:bg-emerald-500/20 text-white dark:text-emerald-300 border border-emerald-600 dark:border-emerald-500/40 shadow-sm"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          {tier.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Shortfall Comparison Meter */}
                  <div className="mt-3 p-3 bg-slate-100/70 dark:bg-navy-950/60 rounded-xl border border-slate-200/80 dark:border-white/[0.04] flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                      <span>{t.planShortfall}</span>
                      <strong className="text-emerald-700 dark:text-emerald-300 font-bold tabular-nums">
                        {(() => {
                          const prob = Math.round((
                            (typeof plan.stockout_prob_plan === "object" && plan.stockout_prob_plan !== null
                              ? (plan.stockout_prob_plan[riskLevel] ?? Object.values(plan.stockout_prob_plan)[0])
                              : plan.stockout_prob_plan) ?? 0.1
                          ) * 100);
                          return prob === 0
                            ? (lang === "en" ? "0/14 days in past 14d" : "গত ১৪ দিনে ০/১৪ দিন")
                            : `${prob}%`;
                        })()}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>{t.habitBefore}</span>
                      <strong className="text-slate-500 dark:text-slate-400 font-semibold tabular-nums line-through">
                        {Math.round((
                          (typeof plan.stockout_prob_habit === "object" && plan.stockout_prob_habit !== null
                            ? (plan.stockout_prob_habit[riskLevel] ?? Object.values(plan.stockout_prob_habit)[0])
                            : plan.stockout_prob_habit) ?? 0.28
                        ) * 100)}%
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* Agent Business Impact Card ("আমার ব্যবসার অবস্থা") */}
              <section className="card-soft space-y-4" aria-label={t.agentImpactHeading}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/[0.06] pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{t.agentImpactHeading}</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.agentImpactSubheading}
                    </p>
                  </div>

                  {/* Period Selector: 7 / 30 days */}
                  <div className="inline-flex items-center bg-slate-100 dark:bg-navy-900/90 rounded-full p-1 border border-slate-200 dark:border-white/[0.08] shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => setImpactDays(7)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
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
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        impactDays === 30
                          ? "bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {t.period30Days}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Confirmed stock-out hours */}
                  <div className="p-3.5 bg-slate-50 dark:bg-navy-900/80 rounded-xl border border-slate-200 dark:border-white/[0.06] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t.confirmedStockoutHours}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                          {t.badgeConfirmed}
                        </span>
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                        {periodConfirmations.length > 0 ? (
                          `${confirmedStockoutHours} ${lang === "en" ? "hrs" : "ঘণ্টা"}`
                        ) : (
                          <span className="text-xs font-medium text-slate-500">{t.noConfirmationsYet}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-white/[0.04]">
                      {lang === "en"
                        ? `${periodConfirmations.length} report${periodConfirmations.length === 1 ? "" : "s"} submitted`
                        : `${periodConfirmations.length}টি রিপোর্ট জমা হয়েছে`}
                    </div>
                  </div>

                  {/* Model-estimated stock-out hours */}
                  <div className="p-3.5 bg-slate-50 dark:bg-navy-900/80 rounded-xl border border-slate-200 dark:border-white/[0.06] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t.estimatedStockoutHours}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                          {t.badgeEstimated}
                        </span>
                      </div>
                      <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {`${estimatedStockoutHours} ${lang === "en" ? "hrs" : "ঘণ্টা"}`}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-white/[0.04]">
                      {lang === "en" ? "Based on historical drawdown risk" : "ঐতিহাসিক ঘাটতি ঝুঁকির ভিত্তিতে"}
                    </div>
                  </div>

                  {/* Estimated missed cash-outs */}
                  <div className="p-3.5 bg-slate-50 dark:bg-navy-900/80 rounded-xl border border-slate-200 dark:border-white/[0.06] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t.estimatedMissedCashouts}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                          {t.badgeEstimated}
                        </span>
                      </div>
                      <div className="text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                        ৳ {formatBDT(estimatedMissedBdt)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {lang === "en"
                          ? `~${Math.round(estimatedMissedCount)} customers turned away`
                          : `~${Math.round(estimatedMissedCount)} জন গ্রাহক ফিরে গেছেন`}
                      </div>
                    </div>
                  </div>

                  {/* Estimated lost commission */}
                  <div className="p-3.5 bg-slate-50 dark:bg-navy-900/80 rounded-xl border border-slate-200 dark:border-white/[0.06] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t.estimatedLostCommission}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                          {t.badgeEstimated}
                        </span>
                      </div>
                      <div className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                        ৳ {formatBDT(estimatedLostCommissionBdt)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {lang === "en" ? "Assumed 1.8% commission rate" : "ধরে নেওয়া ১.৮% কমিশন হার"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Days the plan was followed */}
                <div className="p-3.5 bg-slate-50 dark:bg-navy-900/80 rounded-xl border border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">{t.daysPlanFollowed}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {periodConfirmations.length > 0 ? (
                        `${daysPlanFollowed} / ${periodConfirmations.length} ${lang === "en" ? "days" : "দিন"}`
                      ) : (
                        <span className="text-slate-500 font-normal">{t.notReportedYet}</span>
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                    {t.badgeConfirmed}
                  </span>
                </div>
              </section>

              {/* Weekly Lost Demand Analytics Card */}
              {lostDemand && (
                <section className="card-soft space-y-3.5" aria-label={t.lostDemandHeading}>
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400">
                        <TrendingDown className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                        {t.lostDemandHeading}
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/[0.06]">
                      {lostDemand.week}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 bg-slate-50 dark:bg-navy-900/80 rounded-xl border border-slate-200 dark:border-white/[0.06]">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                        {t.lostCountLabel}
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                        {t.lostCountUnit(lostDemand.lost_count)}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-navy-900/80 rounded-xl border border-slate-200 dark:border-white/[0.06]">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                        {t.lostAmountLabel}
                      </span>
                      <span className="text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">
                        ৳ {formatBDT(lostDemand.lost_amount)}
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-50/70 dark:bg-navy-900/80 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                      <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300/80 block mb-1">
                        {t.lostCommissionLabel}
                      </span>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums flex items-center gap-1">
                        ৳ {formatBDT(lostDemand.lost_commission)}
                      </span>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
