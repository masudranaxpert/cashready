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
import { DEMO_WEEK } from "@/lib/mock-data";
import { formatBDT } from "@/lib/strings";
import { useLang } from "@/lib/lang";
import { Skeleton, ErrorState } from "@/components/Skeleton";
import {
  Search,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  TrendingDown,
  Wallet,
  ThumbsUp,
  ThumbsDown,
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

function formatShortageWindow(riskHour: number, lang: "bn" | "en"): string {
  if (!riskHour || riskHour <= 0) return "";
  const startHour = riskHour;
  const endHour = (riskHour + 2) % 24;

  const formatH = (h: number) => {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? "AM" : "PM";
    if (lang === "en") {
      return `${h12}:00 ${ampm}`;
    }
    const periodBn = h < 12 ? "সকাল" : h < 15 ? "দুপুর" : h < 18 ? "বিকেল" : h < 20 ? "সন্ধ্যা" : "রাত";
    const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    const hStr = String(h12).split("").map((d) => bnDigits[Number(d)] ?? d).join("");
    return `${periodBn} ${hStr}:০০`;
  };

  return `${formatH(startHour)} – ${formatH(endHour)}`;
}

export default function AgentPage() {
  const { t, lang } = useLang();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("T0039");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("0.9");

  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [lostDemand, setLostDemand] = useState<AgentLostDemand | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // Search filter for agent dropdown
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Operational decision states (Frontend-safe interactive states)
  const [isCashConfirmed, setIsCashConfirmed] = useState<boolean>(false);
  const [confirmedTime, setConfirmedTime] = useState<string>("");
  const [rebalanceStatus, setRebalanceStatus] = useState<"idle" | "requested">("idle");

  // Feedback states
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "demo" | "error">("idle");
  const [feedbackAnswer, setFeedbackAnswer] = useState<boolean | null>(null);
  const [stockoutSurvey, setStockoutSurvey] = useState<boolean | "not_sure" | null>(null);

  // Fetch agents list once
  useEffect(() => {
    async function loadAgents() {
      try {
        const list = await getAgents();
        setAgents(list);
        if (list.length > 0) {
          let initialId = list[0].agent_id;
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const qId = params.get("id") || params.get("agent_id");
            if (qId && list.some((a) => a.agent_id === qId)) {
              initialId = qId;
            }
          }
          setSelectedAgentId((prev) =>
            list.find((a) => a.agent_id === (initialId || prev)) ? (initialId || prev) : list[0].agent_id
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
      // Reset interaction states on agent or date change
      setFeedbackStatus("idle");
      setFeedbackAnswer(null);
      setStockoutSurvey(null);
      setIsCashConfirmed(false);
      setConfirmedTime("");
      setRebalanceStatus("idle");

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
        comment: helpful
          ? (lang === "en" ? "useful advice" : "কাজের পরামর্শ")
          : (lang === "en" ? "too much or too little cash" : "অতিরিক্ত বা কম নগদ"),
      });
      setFeedbackStatus(resp.demo_only ? "demo" : "success");
    } catch (err: unknown) {
      setFeedbackStatus("error");
    }
  };

  const handleStockoutSurvey = async (ans: boolean | "not_sure") => {
    setStockoutSurvey(ans);
    try {
      await submitAgentFeedback(selectedAgentId, {
        helpful: feedbackAnswer ?? true,
        had_stockout: ans,
        comment: `stockout_verification:${ans}`,
      });
    } catch (err) {
      // Non-blocking for UI state
    }
  };

  const handleConfirmCash = () => {
    setIsCashConfirmed(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setConfirmedTime(timeStr);
  };

  // Compute quantile opening values across risk tiers (0.8, 0.9, 0.95)
  const openingValues = useMemo(() => {
    if (!plan) return { p80: 0, p90: 0, p95: 0 };
    const byLevel = plan.opening_cash_by_level;
    if (byLevel && byLevel["0.8"] && byLevel["0.9"] && byLevel["0.95"]) {
      return {
        p80: byLevel["0.8"],
        p90: byLevel["0.9"],
        p95: byLevel["0.95"],
      };
    }
    // Deterministic newsvendor scaling from plan base
    const base90 = riskLevel === "0.9"
      ? plan.opening_cash
      : riskLevel === "0.8"
      ? Math.round(plan.opening_cash / 0.86)
      : Math.round(plan.opening_cash / 1.18);

    return {
      p80: Math.round(base90 * 0.86),
      p90: base90,
      p95: Math.round(base90 * 1.18),
    };
  }, [plan, riskLevel]);

  // Risk probabilities
  const planProb = useMemo(() => {
    if (!plan) return 10;
    const p = typeof plan.stockout_prob_plan === "object" && plan.stockout_prob_plan !== null
      ? (plan.stockout_prob_plan[riskLevel] ?? Object.values(plan.stockout_prob_plan)[0])
      : plan.stockout_prob_plan;
    return Math.round((p ?? 0.1) * 100);
  }, [plan, riskLevel]);

  const habitProb = useMemo(() => {
    if (!plan) return 28;
    const p = typeof plan.stockout_prob_habit === "object" && plan.stockout_prob_habit !== null
      ? (plan.stockout_prob_habit[riskLevel] ?? Object.values(plan.stockout_prob_habit)[0])
      : plan.stockout_prob_habit;
    return Math.round((p ?? 0.28) * 100);
  }, [plan, riskLevel]);

  const isHighRisk = planProb >= 30;
  const isMediumRisk = planProb >= 15 && planProb < 30;

  // Status badges
  const statusBadge = isHighRisk
    ? { text: t.statusHighRisk, color: "text-red-400 bg-red-950/70 border-red-800/70", dot: "bg-red-500 animate-pulse" }
    : isMediumRisk
    ? { text: t.statusMediumRisk, color: "text-amber-400 bg-amber-950/70 border-amber-800/70", dot: "bg-amber-500" }
    : { text: t.statusLowRisk, color: "text-emerald-400 bg-emerald-950/70 border-emerald-800/70", dot: "bg-emerald-500" };

  // Dynamic greeting
  const greetingText = useMemo(() => {
    const hr = new Date().getHours();
    const displayName = currentAgent
      ? `${currentAgent.agent_id} (${currentAgent.area_id})`
      : selectedAgentId;
    if (hr < 12) return t.greetingMorning(displayName);
    if (hr < 17) return t.greetingAfternoon(displayName);
    return t.greetingEvening(displayName);
  }, [t, currentAgent, selectedAgentId]);

  const shortageWindow = plan ? formatShortageWindow(plan.risk_hour, lang) : "";

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 w-full pb-16">
      {/* 0. Top Bar: Greeting & Context Switcher */}
      <section
        className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 space-y-3.5"
        aria-label={t.agentSelectorLabel}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg sm:text-xl text-slate-100 tracking-tight">
                {greetingText}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === "en"
                ? "MFS Liquidity Advisory • upay Agent Intelligence"
                : "এমএফএস তারল্য উপদেষ্টা • উপায় এজেন্ট ইন্টেলিজেন্স"}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-teal-300 border border-slate-700/60 shrink-0">
              {currentAgent ? `${currentAgent.area_type}` : t.agentViewBadge}
            </span>
            <div className="flex items-center gap-1.5 bg-slate-900 rounded-full px-3 py-1 text-xs font-medium text-slate-300 border border-slate-800 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                min="2024-01-01"
                max="2030-12-31"
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-[11px] sm:text-xs text-slate-200 focus:outline-none cursor-pointer [color-scheme:dark]"
                aria-label={t.dateSelectorLabel}
              />
            </div>
          </div>
        </div>

        {/* Agent selector dropdown */}
        <div className="relative pt-1">
          <label htmlFor="agent-search" className="block text-xs font-medium text-slate-400 mb-1">
            {t.agentSelectCount(agents.length)}
          </label>
          <div className="relative">
            <button
              type="button"
              id="agent-search"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full min-h-[44px] px-3.5 py-2 text-left bg-slate-900/90 hover:bg-slate-900 rounded-xl border border-slate-700/70 flex items-center justify-between text-sm transition-colors text-slate-200"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                <span className="font-bold text-slate-100 shrink-0">{currentAgent?.agent_id ?? selectedAgentId}</span>
                <span className="text-xs text-slate-400 truncate">
                  {currentAgent ? `• ${currentAgent.area_id} (${currentAgent.area_type})` : ""}
                </span>
                {currentAgent?.is_new && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60">
                    New
                  </span>
                )}
              </div>
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-navy-850 rounded-2xl shadow-soft-lg border border-slate-700 z-50 p-2 max-h-64 overflow-y-auto">
                <div className="p-1 mb-1">
                  <input
                    type="text"
                    placeholder={t.agentSelectorPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    autoFocus
                  />
                </div>
                <ul role="listbox" className="space-y-0.5">
                  {filteredAgents.map((ag) => (
                    <li key={ag.agent_id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAgentId(ag.agent_id);
                          setIsDropdownOpen(false);
                          setSearchQuery("");
                        }}
                        className={`w-full min-h-[38px] px-3 py-1.5 text-left text-xs rounded-lg flex items-center justify-between transition-colors ${
                          ag.agent_id === selectedAgentId
                            ? "bg-slate-800 text-slate-100 font-semibold border border-slate-700"
                            : "hover:bg-slate-900/80 text-slate-300"
                        }`}
                        role="option"
                        aria-selected={ag.agent_id === selectedAgentId}
                      >
                        <span className="font-semibold text-slate-100">{ag.agent_id}</span>
                        <span className="text-slate-400">
                          {ag.area_id} ({ag.area_type})
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

      {error ? (
        <ErrorState onRetry={() => setSelectedAgentId(selectedAgentId)} />
      ) : loading || !plan ? (
        <div className="space-y-3.5 sm:space-y-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5 animate-fade-in">
          {/* 1. HERO: Today's Liquidity Recommendation */}
          <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-5 sm:p-6 space-y-4">
            {/* Liquidity Status Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/70 pb-3">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  {t.liquidityStatusLabel}
                </span>
                <span className="text-[11px] text-slate-500">
                  {selectedDate}
                </span>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.color}`}>
                <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                <span>{statusBadge.text}</span>
              </div>
            </div>

            {/* Recommended Cash Hero Display */}
            <div className="text-center py-2">
              <div className="text-xs font-medium text-slate-400 mb-1">
                {t.recommendedOpeningCash}
              </div>
              <div className="text-4xl min-[390px]:text-5xl font-black text-teal-400 tracking-tight tabular-nums">
                ৳ {formatBDT(plan.opening_cash)}
              </div>

              {/* Quantile Breakdown (P80 | P90 | P95) from existing data */}
              <div className="mt-3.5 grid grid-cols-3 gap-2 max-w-sm mx-auto bg-slate-900/90 p-2 rounded-xl border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setRiskLevel("0.8")}
                  className={`p-1.5 rounded-lg text-center transition-colors ${
                    riskLevel === "0.8" ? "bg-slate-800 border border-slate-700" : "hover:bg-slate-800/50"
                  }`}
                >
                  <span className="block text-[10px] text-slate-400 font-medium">80% ({lang === "en" ? "Risk" : "ঝুঁকি"})</span>
                  <span className="block text-xs font-bold text-slate-200 tabular-nums">
                    ৳ {formatBDT(openingValues.p80)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRiskLevel("0.9")}
                  className={`p-1.5 rounded-lg text-center transition-colors ${
                    riskLevel === "0.9" ? "bg-slate-800 border border-teal-500/50 shadow-sm" : "hover:bg-slate-800/50"
                  }`}
                >
                  <span className="block text-[10px] text-teal-400 font-semibold">90% ({lang === "en" ? "Balanced" : "ভারসাম্য"})</span>
                  <span className="block text-xs font-bold text-teal-300 tabular-nums">
                    ৳ {formatBDT(openingValues.p90)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRiskLevel("0.95")}
                  className={`p-1.5 rounded-lg text-center transition-colors ${
                    riskLevel === "0.95" ? "bg-slate-800 border border-slate-700" : "hover:bg-slate-800/50"
                  }`}
                >
                  <span className="block text-[10px] text-slate-400 font-medium">95% ({lang === "en" ? "Safe" : "নিরাপদ"})</span>
                  <span className="block text-xs font-bold text-slate-200 tabular-nums">
                    ৳ {formatBDT(openingValues.p95)}
                  </span>
                </button>
              </div>
            </div>

            {/* Advisory narrative message */}
            <div className="p-3.5 bg-navy-900/90 rounded-xl border border-slate-800">
              <p className="text-sm min-[390px]:text-base text-slate-200 leading-relaxed font-normal">
                {lang === "en" && plan.message_en ? plan.message_en : plan.message_bn}
              </p>
            </div>

            {/* Risk preference selector */}
            <div className="pt-1">
              <div className="text-xs font-medium text-slate-400 mb-2 flex items-center justify-between">
                <span>{t.riskLevelSet}</span>
                <span className="text-teal-300 font-semibold">
                  {riskLevel === "0.8" ? t.riskSafe80 : riskLevel === "0.9" ? t.riskBalanced90 : t.riskCautious95}
                </span>
              </div>

              <div
                className="grid grid-cols-3 gap-1 p-1 bg-navy-900/90 border border-slate-800 rounded-full w-full"
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
                      onClick={() => setRiskLevel(tier.key)}
                      className={`min-h-[44px] py-1.5 px-1 text-[11px] min-[390px]:text-xs sm:text-sm font-semibold rounded-full transition-transform duration-100 active:scale-[0.98] text-center truncate ${
                        isSelected
                          ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-soft"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tier.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Action: Confirm Cash Available */}
            <div className="pt-2">
              {!isCashConfirmed ? (
                <button
                  type="button"
                  onClick={handleConfirmCash}
                  className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-[0.99] text-navy-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all"
                >
                  <Wallet className="w-4 h-4" />
                  <span>{t.confirmCashBtn}</span>
                </button>
              ) : (
                <div className="flex items-center justify-between p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t.cashConfirmedSuccess} ({confirmedTime})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCashConfirmed(false)}
                    className="text-xs text-slate-400 hover:text-slate-200 underline"
                  >
                    {t.changeConfirmation}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. DEDICATED STOCK-OUT RISK CARD */}
          <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                  {t.stockoutRiskCardTitle}
                </h2>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                {planProb}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-navy-900/90 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">
                  {t.planShortfall}
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-teal-400 tabular-nums">
                  {planProb === 0
                    ? (lang === "en" ? "0/14 days" : "০/১৪ দিন")
                    : `${planProb}%`}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {lang === "en" ? "Under CashReady plan" : "CashReady প্ল্যানে"}
                </span>
              </div>

              <div className="p-3 bg-navy-900/90 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-medium">
                  {t.habitBefore}
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-slate-400 tabular-nums">
                  {habitProb}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {lang === "en" ? "Under previous habit" : "আগের অভ্যাসে"}
                </span>
              </div>
            </div>

            {/* Expected shortage window */}
            <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block">{t.expectedShortageWindow}</span>
                  <span className="text-slate-200 font-semibold">
                    {shortageWindow || t.shortageWindowUnavailable}
                  </span>
                </div>
              </div>

              {/* Action: Request Rebalancing */}
              {rebalanceStatus === "idle" ? (
                <button
                  type="button"
                  onClick={() => setRebalanceStatus("requested")}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors shrink-0"
                >
                  {t.requestRebalancingBtn}
                </button>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60 shrink-0">
                  ✓ {t.rebalancingRequested}
                </span>
              )}
            </div>

            {rebalanceStatus === "requested" && (
              <p className="text-[11px] text-emerald-400/90 px-1">
                {t.rebalancingLogged}
              </p>
            )}
          </div>

          {/* 3. "WHY THIS RECOMMENDATION?" (Deterministic SHAP Drivers) */}
          <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                  {t.whyRecommendationTitle}
                </h2>
                <span className="text-xs text-slate-500 italic">
                  {t.shapCaption}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t.deterministicNotice}
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] min-[390px]:text-[11px] text-slate-500 px-0.5 border-b border-slate-800/60 pb-1.5">
              <span>{t.scaleLess}</span>
              <span className="font-semibold text-slate-400">{t.scaleBase}</span>
              <span>{t.scaleMore}</span>
            </div>

            {plan.reasons && plan.reasons.length > 0 ? (
              <div className="space-y-3.5">
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
                      <div key={r.key || idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="font-medium text-slate-200 truncate flex-1 min-w-0 pr-1">
                            {reasonLabel}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-slate-400">
                              {isPositive ? t.impactUp : isNegative ? t.impactDown : t.impactNeutral}
                            </span>
                            <span
                              className={`font-semibold tabular-nums text-xs ${
                                isPositive
                                  ? "text-amber-400"
                                  : isNegative
                                  ? "text-teal-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {isPositive ? `+${impact.toFixed(2)}` : impact.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div
                          className="h-3 w-full bg-slate-900 rounded-full flex items-center relative border border-slate-800 overflow-hidden"
                          role="meter"
                          aria-label={`${reasonLabel}: ${isPositive ? t.impactUp : isNegative ? t.impactDown : t.impactNeutral} ${impact.toFixed(2)}`}
                          aria-valuenow={Number(impact.toFixed(2))}
                          aria-valuemin={-1}
                          aria-valuemax={1}
                        >
                          <div className="w-1/2 h-full flex justify-end">
                            {isNegative && (
                              <div
                                className="h-full bg-teal-500 rounded-l-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            )}
                          </div>

                          <div className="w-[1.5px] h-full bg-slate-600 shrink-0 z-10" />

                          <div className="w-1/2 h-full flex justify-start">
                            {isPositive && (
                              <div
                                className="h-full bg-amber-500 rounded-r-full transition-all duration-300"
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
          </div>

          {/* 4. TODAY'S LIQUIDITY TIMELINE */}
          <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                  {t.timelineTitle}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t.timelineSubtitle}
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Timeline steps */}
              {[
                {
                  time: "08:00 AM",
                  timeBn: "সকাল ০৮:০০",
                  title: t.morningPhase,
                  desc: lang === "en" ? `Fund drawer with ৳${formatBDT(plan.opening_cash)} opening cash` : `৳${formatBDT(plan.opening_cash)} উদ্বোধনী নগদ নিয়ে কাউন্টার শুরু করুন`,
                  status: "normal",
                  isPeak: false,
                },
                {
                  time: "11:00 AM",
                  timeBn: "সকাল ১১:০০",
                  title: t.afternoonPhase,
                  desc: lang === "en" ? "Steady cash-in / cash-out transaction volume" : "নিয়মিত ক্যাশ-ইন ও ক্যাশ-আউট লেনদেনের স্বাভাবিক গতি",
                  status: "normal",
                  isPeak: false,
                },
                {
                  time: shortageWindow ? shortageWindow.split("–")[0].trim() : "02:00 PM",
                  timeBn: shortageWindow ? shortageWindow.split("–")[0].trim() : "দুপুর ০২:০০",
                  title: t.middayPhase,
                  desc: t.peakShortageWarning,
                  status: isHighRisk ? "critical" : "watch",
                  isPeak: true,
                },
                {
                  time: "08:00 PM",
                  timeBn: "রাত ০৮:০০",
                  title: t.eveningPhase,
                  desc: lang === "en" ? "Daily closing settlement and next-day preview" : "দিনের হিসাব সমাপ্তি ও পরের দিনের প্রস্তুতির পর্যালোচনা",
                  status: "normal",
                  isPeak: false,
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                    step.isPeak
                      ? isHighRisk
                        ? "bg-red-950/30 border-red-800/60"
                        : "bg-amber-950/30 border-amber-800/60"
                      : "bg-navy-900/80 border-slate-800"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {step.isPeak ? (
                      <AlertTriangle className={`w-4 h-4 ${isHighRisk ? "text-red-400" : "text-amber-400"}`} />
                    ) : (
                      <Check className="w-4 h-4 text-teal-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-slate-200">
                        {step.title}
                      </span>
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                        step.isPeak ? "bg-amber-950/70 text-amber-300 font-bold" : "bg-slate-800 text-slate-400"
                      }`}>
                        {lang === "en" ? step.time : step.timeBn}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. PRESERVED WEEKLY UNSERVED DEMAND CARD */}
          {lostDemand && (
            <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                  {t.lostDemandHeading} ({lostDemand.week})
                </h3>
              </div>

              <div className="divide-y divide-slate-800/80 text-xs sm:text-sm">
                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-400">{t.lostCountLabel}</span>
                  <span className="font-bold text-slate-100 tabular-nums">
                    {t.lostCountUnit(lostDemand.lost_count)}
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-400">{t.lostAmountLabel}</span>
                  <span className="font-bold text-slate-100 tabular-nums">
                    ৳ {formatBDT(lostDemand.lost_amount)}
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-400">{t.lostCommissionLabel}</span>
                  <span className="font-bold text-teal-400 tabular-nums">
                    ৳ {formatBDT(lostDemand.lost_commission)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 6. AGENT FEEDBACK & VERIFICATION LOOP */}
          <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-5 space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                {t.feedbackHeading}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === "en"
                  ? "Help calibrate tomorrow's AI recommendations with your field experience."
                  : "আপনার বাস্তব অভিজ্ঞতার মতামত দিয়ে আগামীকালের এআই মডেলকে আরো নির্ভুল হতে সাহায্য করুন।"}
              </p>
            </div>

            {/* Question 1: Was recommendation useful? */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-300 block">
                1. {t.feedbackUsefulQuestion}
              </span>

              {feedbackStatus === "success" || feedbackStatus === "demo" ? (
                <div className="flex items-center gap-2 p-3 bg-navy-900 rounded-xl border border-slate-800 text-slate-100">
                  <CheckCircle2 className={`w-5 h-5 shrink-0 ${feedbackStatus === "demo" ? "text-amber-400" : "text-teal-400"}`} />
                  <span className={`text-xs sm:text-sm font-semibold ${feedbackStatus === "demo" ? "text-amber-300" : "text-teal-400"}`}>
                    {feedbackStatus === "demo"
                      ? (lang === "en" ? "Demo: feedback recorded in session" : "ডেমো: মতামত সেশনে রেকর্ড করা হয়েছে")
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
                      className={`flex-1 min-h-[44px] rounded-full text-xs sm:text-sm font-semibold transition-transform duration-100 active:scale-[0.98] border flex items-center justify-center gap-1.5 ${
                        feedbackAnswer === true
                          ? "bg-teal-600 text-white border-teal-500 shadow-md"
                          : "bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800"
                      } disabled:opacity-50`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{t.feedbackYes}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback(false)}
                      disabled={feedbackStatus === "submitting"}
                      className={`flex-1 min-h-[44px] rounded-full text-xs sm:text-sm font-semibold transition-transform duration-100 active:scale-[0.98] border flex items-center justify-center gap-1.5 ${
                        feedbackAnswer === false
                          ? "bg-slate-700 text-white border-slate-600 shadow-md"
                          : "bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800"
                      } disabled:opacity-50`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
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
            </div>

            {/* Question 2: Stock-out actual verification */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <span className="text-xs font-medium text-slate-300 block">
                2. {t.feedbackStockoutQuestion}
              </span>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: true, label: t.stockoutYes },
                  { key: false, label: t.stockoutNo },
                  { key: "not_sure", label: t.stockoutNotSure },
                ].map((item) => {
                  const isChosen = stockoutSurvey === item.key;
                  return (
                    <button
                      key={String(item.key)}
                      type="button"
                      onClick={() => handleStockoutSurvey(item.key as boolean | "not_sure")}
                      className={`min-h-[40px] px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        isChosen
                          ? "bg-slate-700 text-teal-300 border-teal-500/70"
                          : "bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {stockoutSurvey !== null && (
                <p className="text-[11px] text-teal-400 pt-1">
                  ✓ {lang === "en" ? "Stock-out survey recorded for model retraining." : "মডেল পুনঃপ্রশিক্ষণের জন্য স্টক-আউট তথ্য রেকর্ড করা হয়েছে।"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

