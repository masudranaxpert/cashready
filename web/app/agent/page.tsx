"use client";

import { useEffect, useState, useMemo } from "react";
import type {
  Agent,
  RiskLevel,
  AgentPlan,
  AgentLostDemand,
  Reason,
} from "@/lib/types";
import {
  getAgents,
  getAgentPlan,
  getAgentLostDemand,
  submitAgentFeedback,
} from "@/lib/api";
import {
  DEMO_DATE,
  DEMO_WEEK,
  MOCK_AGENTS,
  getMockAgentPlan,
  getMockAgentLostDemand,
} from "@/lib/mock-data";
import { formatBDT } from "@/lib/strings";
import { useLang } from "@/lib/lang";
import { Skeleton, ErrorState } from "@/components/Skeleton";
import {
  Search,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  TrendingDown,
  Quote,
  Activity,
  Layers,
  Clock,
  Check,
  AlertTriangle,
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
  const { t, lang } = useLang();
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("T0039");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("0.9");

  // Interactive cash confirmation state
  const [confirmedCash, setConfirmedCash] = useState<boolean>(false);
  const [confirmedTime, setConfirmedTime] = useState<string | null>(null);

  const [plan, setPlan] = useState<AgentPlan | null>(() =>
    getMockAgentPlan("T0039", DEMO_DATE, "0.9")
  );
  const [lostDemand, setLostDemand] = useState<AgentLostDemand | null>(() =>
    getMockAgentLostDemand("T0039", DEMO_WEEK)
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  // Search filter for agent dropdown
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Feedback state
  const [feedbackAnswer, setFeedbackAnswer] = useState<boolean | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<
    "idle" | "submitting" | "success" | "demo" | "error"
  >("idle");

  // Support URL query param deep linking (e.g. /agent?id=agent_002)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const agentIdParam = params.get("id");
      if (agentIdParam) {
        setSelectedAgentId(agentIdParam);
      }
    }
  }, []);

  // Reset confirmation state when agent or date changes
  useEffect(() => {
    setConfirmedCash(false);
    setConfirmedTime(null);
  }, [selectedAgentId, selectedDate]);

  // Load agents list on mount
  useEffect(() => {
    async function loadAgents() {
      try {
        const agentList = await getAgents();
        setAgents(agentList);
        if (agentList.length > 0) {
          setSelectedAgentId((prev) =>
            agentList.find((a) => a.agent_id === prev) ? prev : agentList[0].agent_id
          );
        }
      } catch (err: unknown) {
        console.error("Failed to load agents", err);
      }
    }
    loadAgents();
  }, []);

  // Load agent plan & lost demand
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      setError(false);

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
    if (!searchQuery.trim()) return agents;
    const q = searchQuery.toLowerCase();
    return agents.filter(
      (a) =>
        a.agent_id.toLowerCase().includes(q) ||
        a.area_id.toLowerCase().includes(q) ||
        a.area_type.toLowerCase().includes(q)
    );
  }, [agents, searchQuery]);

  const currentAgent = agents.find((a) => a.agent_id === selectedAgentId);

  // Time-of-day dynamic greeting
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    const fn =
      hour < 12
        ? t.greetingMorning
        : hour < 17
        ? t.greetingAfternoon
        : t.greetingEvening;
    return fn(selectedAgentId);
  }, [t, selectedAgentId]);

  const handleFeedback = async (helpful: boolean) => {
    setFeedbackAnswer(helpful);
    setFeedbackStatus("submitting");

    try {
      const resp = await submitAgentFeedback(selectedAgentId, {
        helpful,
        comment: helpful
          ? lang === "en"
            ? "useful advice"
            : "কাজের পরামর্শ"
          : lang === "en"
          ? "too much or too little cash"
          : "অতিরিক্ত বা কম নগদ",
      });
      setFeedbackStatus(resp.demo_only ? "demo" : "success");
    } catch (err: unknown) {
      setFeedbackStatus("error");
    }
  };

  const handleRiskChange = (newRisk: RiskLevel) => {
    setRiskLevel(newRisk);
  };

  const handleConfirmCash = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setConfirmedCash(true);
    setConfirmedTime(timeStr);
  };

  // Safe stockout probability calculation
  const stockoutProb = useMemo(() => {
    if (!plan) return 0.1;
    const val =
      typeof plan.stockout_prob_plan === "object" && plan.stockout_prob_plan !== null
        ? plan.stockout_prob_plan[riskLevel] ?? Object.values(plan.stockout_prob_plan)[0]
        : plan.stockout_prob_plan;
    return typeof val === "number" ? val : 0.1;
  }, [plan, riskLevel]);

  const habitStockoutProb = useMemo(() => {
    if (!plan) return 0.28;
    const val =
      typeof plan.stockout_prob_habit === "object" && plan.stockout_prob_habit !== null
        ? plan.stockout_prob_habit[riskLevel] ?? Object.values(plan.stockout_prob_habit)[0]
        : plan.stockout_prob_habit;
    return typeof val === "number" ? val : 0.28;
  }, [plan, riskLevel]);

  const isRiskHigh = stockoutProb >= 0.2;

  // Intraday 4 phases
  const intradayPhases = useMemo(() => {
    if (!plan) return [];
    const base = plan.opening_cash;
    return [
      {
        phase: t.morningPhase,
        time: "09:00 - 12:00",
        cash: base,
        netFlow: "+৳ 0",
        type: "neutral",
      },
      {
        phase: t.middayPhase,
        time: "12:00 - 15:00",
        cash: Math.round(base * 0.72),
        netFlow: `-৳ ${formatBDT(Math.round(base * 0.28))}`,
        type: "outflow",
      },
      {
        phase: t.afternoonPhase,
        time: "15:00 - 18:00",
        cash: Math.round(base * 0.88),
        netFlow: `+৳ ${formatBDT(Math.round(base * 0.16))}`,
        type: "inflow",
      },
      {
        phase: t.eveningPhase,
        time: "18:00 - 21:00",
        cash: Math.round(base * 0.65),
        netFlow: `-৳ ${formatBDT(Math.round(base * 0.23))}`,
        type: "outflow",
      },
    ];
  }, [plan, t]);

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Mobile & Desktop Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Right / Top Sidebar: Agent Selector, SHAP Explainers, Feedback Card */}
        <div className="lg:col-span-5 lg:order-2 space-y-4">
          {/* Agent & Date Selector Card */}
          <section className="card-soft space-y-3.5" aria-label={t.agentSelectorLabel}>
            <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-sm sm:text-base text-white tracking-tight block">
                    {t.agentViewBadge}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {currentAgent ? `${currentAgent.area_id} • ${currentAgent.area_type}` : "MFS Terminal"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-navy-900/90 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-300 border border-white/[0.08] shadow-sm shrink-0">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  min="2024-01-01"
                  max="2030-12-31"
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-[11px] sm:text-xs text-white focus:outline-none cursor-pointer"
                  aria-label={t.dateSelectorLabel}
                />
              </div>
            </div>

            <div className="relative">
              <label htmlFor="agent-search" className="block text-xs font-semibold text-slate-400 mb-1.5">
                {t.agentSelectCount(agents.length)}
              </label>
              <div className="relative">
                <button
                  type="button"
                  id="agent-search"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-left bg-navy-900/90 hover:bg-navy-900 rounded-xl border border-white/[0.1] hover:border-emerald-500/40 flex items-center justify-between text-sm transition-all text-slate-200 shadow-sm"
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    <span className="font-extrabold text-white shrink-0 tracking-wide">
                      {currentAgent?.agent_id ?? selectedAgentId}
                    </span>
                    <span className="text-xs text-emerald-400 font-medium truncate">
                      {currentAgent ? `• ${currentAgent.area_id} (${currentAgent.area_type})` : ""}
                    </span>
                  </div>
                  <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-navy-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/[0.12] z-50 p-2.5 max-h-72 overflow-y-auto">
                    <div className="p-1 mb-2">
                      <input
                        type="text"
                        placeholder={t.agentSelectorPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-navy-950 border border-white/[0.1] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
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
                                ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                                : "hover:bg-slate-800/60 text-slate-300"
                            }`}
                            role="option"
                            aria-selected={ag.agent_id === selectedAgentId}
                          >
                            <span className="font-bold text-white">{ag.agent_id}</span>
                            <span className="text-slate-400 text-[11px]">
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

          {/* Key Drivers (SHAP Explanations) */}
          {plan && !loading && (
            <section className="card-soft space-y-3.5" aria-label={t.reasonsHeading}>
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {t.reasonsHeading}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded-full bg-navy-900/80 border border-white/[0.08]">
                  {t.shapCaption}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 border-b border-white/[0.04] pb-1.5">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  ← {t.scaleLess}
                </span>
                <span className="font-bold text-slate-400">{t.scaleBase}</span>
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  {t.scaleMore} →
                </span>
              </div>

              {plan.reasons && plan.reasons.length > 0 ? (
                <div className="space-y-3">
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
                      const reasonLabel =
                        lang === "en" && r.label_en ? r.label_en : r.label_bn || "";

                      return (
                        <div
                          key={r.key || idx}
                          className="space-y-1.5 p-2.5 rounded-xl bg-navy-900/60 border border-white/[0.04]"
                        >
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="font-semibold text-slate-200 truncate flex-1 min-w-0">
                              {reasonLabel}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-medium text-slate-400">
                                {isPositive
                                  ? t.impactUp
                                  : isNegative
                                  ? t.impactDown
                                  : t.impactNeutral}
                              </span>
                              <span
                                className={`font-bold tabular-nums text-xs px-1.5 py-0.5 rounded-md ${
                                  isPositive
                                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                    : isNegative
                                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {isPositive ? `+${impact.toFixed(2)}` : impact.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div
                            className="h-2.5 w-full bg-navy-950 rounded-full flex items-center relative border border-white/[0.06] overflow-hidden"
                            role="meter"
                            aria-label={`${reasonLabel}: ${impact.toFixed(2)}`}
                            aria-valuenow={Number(impact.toFixed(2))}
                            aria-valuemin={-1}
                            aria-valuemax={1}
                          >
                            <div className="w-1/2 h-full flex justify-end">
                              {isNegative && (
                                <div
                                  className="h-full bg-emerald-400 rounded-l-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              )}
                            </div>
                            <div className="w-0.5 h-full bg-white/40 z-10" />
                            <div className="w-1/2 h-full flex justify-start">
                              {isPositive && (
                                <div
                                  className="h-full bg-amber-400 rounded-r-full transition-all duration-300"
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
                <p className="text-xs text-slate-400 py-2">{t.reasonsEmpty}</p>
              )}
            </section>
          )}

          {/* Weekly Lost Demand Card */}
          {lostDemand && !loading && (
            <section className="card-soft space-y-3.5" aria-label={t.lostDemandHeading}>
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <TrendingDown className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {t.lostDemandHeading}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-navy-900/80 border border-white/[0.06]">
                  {lostDemand.week}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 bg-navy-900/80 rounded-xl border border-white/[0.06]">
                  <span className="text-[10px] font-medium text-slate-400 block mb-1">
                    {t.lostCountLabel}
                  </span>
                  <span className="text-base font-black text-white tabular-nums">
                    {t.lostCountUnit(lostDemand.lost_count)}
                  </span>
                </div>

                <div className="p-2.5 bg-navy-900/80 rounded-xl border border-white/[0.06]">
                  <span className="text-[10px] font-medium text-slate-400 block mb-1">
                    {t.lostAmountLabel}
                  </span>
                  <span className="text-base font-black text-rose-300 tabular-nums">
                    ৳ {formatBDT(lostDemand.lost_amount)}
                  </span>
                </div>

                <div className="p-2.5 bg-navy-900/80 rounded-xl border border-emerald-500/20 bg-emerald-950/20">
                  <span className="text-[10px] font-medium text-emerald-300/80 block mb-1">
                    {t.lostCommissionLabel}
                  </span>
                  <span className="text-base font-black text-emerald-400 tabular-nums">
                    ৳ {formatBDT(lostDemand.lost_commission)}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Feedback Survey Card */}
          {plan && !loading && (
            <section className="card-soft space-y-3" aria-label={t.feedbackHeading}>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{t.feedbackHeading}</span>
              </h3>

              {feedbackStatus === "success" || feedbackStatus === "demo" ? (
                <div className="flex items-center gap-2.5 p-3 bg-navy-900/90 rounded-xl border border-white/[0.08] text-white">
                  <CheckCircle2
                    className={`w-5 h-5 shrink-0 ${
                      feedbackStatus === "demo" ? "text-amber-400" : "text-emerald-400"
                    }`}
                  />
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      feedbackStatus === "demo" ? "text-amber-300" : "text-emerald-400"
                    }`}
                  >
                    {feedbackStatus === "demo"
                      ? lang === "en"
                        ? "Demo: feedback acknowledged"
                        : "ডেমো: মতামত গৃহীত হয়েছে"
                      : `${t.feedbackSuccess} ${t.feedbackRecorded}`}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleFeedback(true)}
                      disabled={feedbackStatus === "submitting"}
                      className={`flex-1 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 active:scale-[0.96] border ${
                        feedbackAnswer === true
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                          : "bg-navy-900/80 text-slate-200 border-white/[0.08] hover:bg-slate-800/80 hover:border-emerald-500/30"
                      } disabled:opacity-50`}
                    >
                      ✓ {t.feedbackYes}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback(false)}
                      disabled={feedbackStatus === "submitting"}
                      className={`flex-1 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 active:scale-[0.96] border ${
                        feedbackAnswer === false
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                          : "bg-navy-900/80 text-slate-200 border-white/[0.08] hover:bg-slate-800/80 hover:border-amber-500/30"
                      } disabled:opacity-50`}
                    >
                      ✗ {t.feedbackNo}
                    </button>
                  </div>

                  {feedbackStatus === "submitting" && (
                    <p className="text-xs text-slate-400 text-center py-1">
                      {t.feedbackSubmitting}
                    </p>
                  )}

                  {feedbackStatus === "error" && (
                    <div className="flex items-center justify-between text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{t.feedbackFailed}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFeedback(feedbackAnswer ?? true)}
                        className="underline font-semibold"
                      >
                        {t.retry}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Left Column: Primary Decision Hierarchy Flow */}
        <div className="lg:col-span-7 lg:order-1 space-y-4">
          {error ? (
            <ErrorState onRetry={() => setSelectedAgentId(selectedAgentId)} />
          ) : loading || !plan ? (
            <div className="space-y-4">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* 1. Today's Liquidity Status Hero Card */}
              <section
                className="card-soft relative overflow-hidden space-y-3.5 border-teal-500/30 bg-gradient-to-b from-navy-850/90 to-teal-950/20"
                aria-label={t.liquidityStatusLabel}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                      <span>{greetingText}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {currentAgent?.area_id}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t.liquidityStatusLabel}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {isRiskHigh ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse-glow">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.statusHighRisk}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.statusLowRisk}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-navy-900/80 rounded-xl border border-white/[0.06]">
                    <span className="text-[11px] font-medium text-slate-400 block mb-1">
                      {t.openingCashLabel}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
                      ৳ {formatBDT(plan.opening_cash)}
                    </span>
                  </div>

                  <div className="p-3 bg-navy-900/80 rounded-xl border border-white/[0.06]">
                    <span className="text-[11px] font-medium text-slate-400 block mb-1">
                      {t.shortfallProb}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white tabular-nums flex items-baseline gap-1.5">
                      <span>{Math.round(stockoutProb * 100)}%</span>
                      <span className="text-[11px] font-normal text-slate-500 line-through">
                        {Math.round(habitStockoutProb * 100)}%
                      </span>
                    </span>
                  </div>
                </div>
              </section>

              {/* 2. Recommended Opening Cash & Quantile Tiers */}
              <section
                className="card-hero text-center space-y-4 relative overflow-hidden"
                aria-label={t.heroPlanHeading}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-emerald-500/10 to-transparent blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between relative z-10 pb-1 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-300 tracking-tight text-left">
                      {t.heroPlanHeading}
                    </h2>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm">
                    {riskLevel === "0.8"
                      ? t.planBadgeSafe
                      : riskLevel === "0.9"
                      ? t.planBadgeBalanced
                      : t.planBadgeCautious}
                  </span>
                </div>

                <div className="py-2 sm:py-3 relative z-10">
                  <div className="text-4xl min-[390px]:text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 dark:from-emerald-300 dark:via-teal-200 dark:to-emerald-400 tracking-tight tabular-nums drop-shadow-sm">
                    ৳ {formatBDT(plan.opening_cash)}
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-400 mt-2 flex items-center justify-center gap-1.5">
                    <span>{t.openingCashLabel}</span>
                    <span className="inline-block w-1 h-1 rounded-full bg-emerald-400" />
                    <span className="text-emerald-500 dark:text-emerald-400 font-semibold">
                      {t.riskLevelSet} ({riskLevel === "0.8" ? "80%" : riskLevel === "0.9" ? "90%" : "95%"})
                    </span>
                  </p>
                </div>

                {/* Natural Quoted Advisory Message Box */}
                <div className="p-4 bg-navy-950/80 rounded-2xl text-left border border-white/[0.08] relative z-10 shadow-inner">
                  <div className="flex gap-2.5 items-start">
                    <Quote className="w-4 h-4 text-emerald-400 shrink-0 mt-1 opacity-80" />
                    <p className="text-[15px] sm:text-[16px] text-slate-200 leading-relaxed font-normal">
                      {lang === "en" && plan.message_en ? plan.message_en : plan.message_bn}
                    </p>
                  </div>
                </div>

                {/* Interactive Action: Confirm Cash Available */}
                <div className="pt-1 relative z-10">
                  {confirmedCash ? (
                    <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-emerald-300 shadow-sm animate-fade-in">
                      <div className="flex items-center gap-2 font-bold">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>{t.cashConfirmedSuccess} ({confirmedTime})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmedCash(false)}
                        className="text-[11px] underline text-emerald-400/80 hover:text-emerald-300"
                      >
                        {t.changeConfirmation}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmCash}
                      className="w-full btn-primary gap-2 text-sm sm:text-base font-extrabold shadow-lg"
                    >
                      <Check className="w-4 h-4" />
                      <span>{t.confirmCashBtn}</span>
                    </button>
                  )}
                </div>

                {/* Quantile Breakdown Tiers */}
                <div className="pt-2 relative z-10 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
                    <span>{t.recommendedOpeningCash}</span>
                    <span className="text-emerald-400 font-bold">
                      {riskLevel === "0.8"
                        ? t.riskSafe80
                        : riskLevel === "0.9"
                        ? t.riskBalanced90
                        : t.riskCautious95}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        {
                          key: "0.8" as RiskLevel,
                          label: t.riskTiers.safe,
                          badge: "P80",
                          sub: lang === "en" ? "Higher risk" : "ঝুঁকি বেশি",
                          amount: plan.opening_cash_by_level?.["0.8"] ?? Math.round(plan.opening_cash * 0.9),
                        },
                        {
                          key: "0.9" as RiskLevel,
                          label: t.riskTiers.balanced,
                          badge: "P90",
                          sub: lang === "en" ? "Recommended" : "সুপারিশকৃত",
                          amount: plan.opening_cash_by_level?.["0.9"] ?? plan.opening_cash,
                        },
                        {
                          key: "0.95" as RiskLevel,
                          label: t.riskTiers.cautious,
                          badge: "P95",
                          sub: lang === "en" ? "Safest buffer" : "সর্বাধিক নিরাপদ",
                          amount: plan.opening_cash_by_level?.["0.95"] ?? Math.round(plan.opening_cash * 1.15),
                        },
                      ] as const
                    ).map((tier) => {
                      const isSelected = riskLevel === tier.key;
                      return (
                        <button
                          key={tier.key}
                          type="button"
                          onClick={() => handleRiskChange(tier.key)}
                          className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                            isSelected
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                              : "bg-navy-950/80 text-slate-300 border-white/[0.08] hover:bg-slate-800/40"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                            <span>{tier.badge}</span>
                            <span className="text-[10px] text-slate-400">{tier.label}</span>
                          </div>
                          <div className="text-xs sm:text-sm font-black tabular-nums text-white">
                            ৳ {formatBDT(tier.amount)}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                            {tier.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* 3. Dedicated Stock-Out Risk Card */}
              <section
                className="card-soft space-y-3.5 border-amber-500/25"
                aria-label={t.stockoutRiskCardTitle}
              >
                <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {t.stockoutRiskCardTitle}
                    </h3>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isRiskHigh
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {isRiskHigh ? t.statusHighRisk : t.statusNormal}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-navy-900/80 rounded-xl border border-white/[0.06] space-y-1">
                    <span className="text-xs text-slate-400 block">{t.expectedShortageWindow}:</span>
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>{t.peakShortageWarning}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">14:00 - 16:00</p>
                  </div>

                  <div className="p-3 bg-navy-900/80 rounded-xl border border-white/[0.06] space-y-1">
                    <span className="text-xs text-slate-400 block">{t.rebalanceAction}:</span>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{t.requestRebalancingBtn}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{t.rebalancingLogged}</p>
                  </div>
                </div>

                <div className="p-3 bg-navy-950/80 rounded-xl border border-white/[0.04] flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>{t.planShortfall}</span>
                    <strong className="text-emerald-300 font-bold tabular-nums">
                      {Math.round(stockoutProb * 100)}%
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span>{t.habitBefore}</span>
                    <strong className="text-slate-400 font-semibold tabular-nums line-through">
                      {Math.round(habitStockoutProb * 100)}%
                    </strong>
                  </div>
                </div>
              </section>

              {/* 4. Intraday Liquidity Timeline */}
              <section
                className="card-soft space-y-3.5"
                aria-label={t.timelineTitle}
              >
                <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {t.timelineTitle}
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded-full bg-navy-900/80 border border-white/[0.08]">
                    {t.timelineSubtitle}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {intradayPhases.map((phase, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-navy-900/80 rounded-xl border border-white/[0.06] flex flex-col justify-between space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span>{phase.time}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            phase.type === "inflow"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : phase.type === "outflow"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {phase.netFlow}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-white block">
                        {phase.phase}
                      </span>
                      <div className="text-xs font-semibold text-slate-300 tabular-nums">
                        ৳ {formatBDT(phase.cash)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
