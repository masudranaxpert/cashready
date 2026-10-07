"use client";

import { useEffect, useState, useMemo } from "react";
import type {
  Agent,
  AgentPlan,
  AgentLostDemand,
  RiskLevel,
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
import { STRINGS, formatBDT } from "@/lib/strings";
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
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  ChevronDown,
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

  const [plan, setPlan] = useState<AgentPlan | null>(() =>
    getMockAgentPlan("T0039", DEMO_DATE, "0.9")
  );
  const [lostDemand, setLostDemand] = useState<AgentLostDemand | null>(() =>
    getMockAgentLostDemand("T0039", DEMO_WEEK)
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  // Search filter for agent dropdown
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Feedback states
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "demo" | "error">("idle");
  const [feedbackAnswer, setFeedbackAnswer] = useState<boolean | null>(null);

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
      // Reset feedback on agent or date change
      setFeedbackStatus("idle");
      setFeedbackAnswer(null);

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

  const handleFeedback = async (helpful: boolean) => {
    if (feedbackStatus === "submitting" || feedbackStatus === "success") return;
    setFeedbackStatus("submitting");
    setFeedbackAnswer(helpful);

    try {
      const resp = await submitAgentFeedback(selectedAgentId, {
        helpful,
        comment: helpful ? (lang === "en" ? "useful advice" : "কাজের পরামর্শ") : (lang === "en" ? "too much or too little cash" : "অতিরিক্ত বা কম নগদ"),
      });
      setFeedbackStatus(resp.demo_only ? "demo" : "success");
    } catch (err: unknown) {
      setFeedbackStatus("error");
    }
  };

  const handleRiskChange = (newRisk: RiskLevel) => {
    setRiskLevel(newRisk);
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Mobile & Desktop Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Top/Sidebar: Agent & Date Selector on Mobile, Right on Desktop */}
        <div className="lg:col-span-5 lg:order-2 space-y-4">
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
              <label htmlFor="agent-search" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                {t.agentSelectCount(agents.length)}
              </label>
              <div className="relative">
                <button
                  type="button"
                  id="agent-search"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-left bg-slate-100/90 hover:bg-slate-100 dark:bg-navy-900/90 dark:hover:bg-navy-900 rounded-xl border border-slate-200 dark:border-white/[0.1] hover:border-emerald-500/40 flex items-center justify-between text-sm transition-all text-slate-800 dark:text-slate-200 shadow-sm"
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    <span className="font-extrabold text-slate-900 dark:text-white shrink-0 tracking-wide">{currentAgent?.agent_id ?? selectedAgentId}</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                      {currentAgent ? `• ${currentAgent.area_id} (${currentAgent.area_type})` : ""}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-navy-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.12] z-50 p-2.5 max-h-72 overflow-y-auto">
                    <div className="relative p-1 mb-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder={t.agentSelectorPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                            className={`w-full min-h-[44px] px-3 py-2 text-left text-xs rounded-xl flex items-center justify-between transition-colors ${ag.agent_id === selectedAgentId
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

          {/* Key Drivers (SHAP Explanations) on the side */}
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

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 border-b border-slate-200 dark:border-white/[0.04] pb-1.5">
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400/90 font-semibold">
                  <ArrowLeft className="w-3 h-3 shrink-0" />
                  <span>{t.scaleLess}</span>
                </span>
                <span className="font-bold text-slate-500 dark:text-slate-400">{t.scaleBase}</span>
                <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400/90 font-semibold">
                  <span>{t.scaleMore}</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
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
                                className={`font-bold tabular-nums text-xs px-1.5 py-0.5 rounded-md ${isPositive
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

          {/* Feedback Card */}
          {plan && !loading && (
            <section className="card-soft space-y-3" aria-label={t.feedbackHeading}>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t.feedbackHeading}</span>
              </h3>

              {feedbackStatus === "success" || feedbackStatus === "demo" ? (
                <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-navy-900/90 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white">
                  <CheckCircle2 className={`w-5 h-5 shrink-0 ${feedbackStatus === "demo" ? "text-amber-500 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`} />
                  <span className={`text-xs sm:text-sm font-semibold ${feedbackStatus === "demo" ? "text-amber-800 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-400"}`}>
                    {feedbackStatus === "demo"
                      ? (lang === "en" ? "Demo: feedback acknowledged" : "ডেমো: মতামত গৃহীত হয়েছে")
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
                      className={`flex-1 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 active:scale-[0.96] border flex items-center justify-center gap-1.5 ${feedbackAnswer === true
                        ? "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 shadow-sm"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-navy-900/80 dark:text-slate-200 dark:border-white/[0.08] dark:hover:bg-slate-800/80"
                        } disabled:opacity-50`}
                    >
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{t.feedbackYes}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback(false)}
                      disabled={feedbackStatus === "submitting"}
                      className={`flex-1 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 active:scale-[0.96] border flex items-center justify-center gap-1.5 ${feedbackAnswer === false
                        ? "bg-amber-600 text-white border-amber-600 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 shadow-sm"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-navy-900/80 dark:text-slate-200 dark:border-white/[0.08] dark:hover:bg-slate-800/80"
                        } disabled:opacity-50`}
                    >
                      <X className="w-4 h-4 shrink-0" />
                      <span>{t.feedbackNo}</span>
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

        {/* Main Column: Hero Liquidity Balance & Lost Demand */}
        <div className="lg:col-span-7 lg:order-1 space-y-4">
          {error ? (
            <ErrorState onRetry={() => setSelectedAgentId(selectedAgentId)} />
          ) : loading || !plan ? (
            <div className="space-y-4">
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Primary Hero Liquidity Recommendation Card */}
              <section className="card-hero text-center space-y-4 relative overflow-hidden" aria-label={t.heroPlanHeading}>
                {/* Subtle ambient lighting accent */}
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
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{t.riskLevelSet} ({riskLevel === "0.8" ? "80%" : riskLevel === "0.9" ? "90%" : "95%"})</span>
                  </p>
                </div>

                {/* Natural Quoted Advisory Message Box */}
                <div className="p-4 sm:p-4.5 bg-emerald-50/70 dark:bg-navy-950/80 rounded-2xl text-left border border-emerald-200/80 dark:border-white/[0.08] relative z-10 shadow-sm">
                  <div className="flex gap-2.5 items-start">
                    <Quote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1 opacity-90" />
                    <p className="text-[15px] sm:text-[16px] text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                      {lang === "en" && plan.message_en ? plan.message_en : plan.message_bn}
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
                          className={`min-h-[44px] py-2 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 active:scale-[0.96] text-center truncate ${isSelected
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
                            ? (lang === "en" ? "0/14 days in past 14d" : "গত ১৪ দিনে ০ দিন")
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
                      <span className="text-lg font-black text-rose-600 dark:text-rose-300 tabular-nums">
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
