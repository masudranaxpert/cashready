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
import { DEMO_DATE, DEMO_WEEK } from "@/lib/mock-data";
import { STRINGS, formatBDT } from "@/lib/strings";
import { Skeleton, ErrorState } from "@/components/Skeleton";
import { Search, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

export default function AgentPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("T0039");
  const [selectedDate, setSelectedDate] = useState<string>(DEMO_DATE);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("0.9");

  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [lostDemand, setLostDemand] = useState<AgentLostDemand | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter for agent dropdown
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Feedback states
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
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
      setError(null);
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
          setError(STRINGS.loadError);
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
      await submitAgentFeedback(selectedAgentId, {
        helpful,
        comment: helpful ? "কাজের পরামর্শ" : "অতিরিক্ত বা কম নগদ",
      });
      setFeedbackStatus("success");
    } catch (err: unknown) {
      setFeedbackStatus("error");
    }
  };

  const handleRiskChange = (newRisk: RiskLevel) => {
    setRiskLevel(newRisk);
  };

  return (
    <div className="max-w-md mx-auto space-y-3.5 sm:space-y-4 w-full">
      {/* Top Bar: Title, Date Picker, and Searchable Agent Selector */}
      <section className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-3.5 sm:p-4 space-y-3" aria-label="এজেন্ট ও তারিখ নির্বাচন">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="font-bold text-base sm:text-lg text-slate-100 tracking-tight shrink-0">
              CashReady
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 truncate">
              এজেন্ট ভিউ
            </span>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1 bg-slate-900 rounded-full px-2.5 py-1 text-xs font-medium text-slate-300 border border-slate-800 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              min="2026-09-03"
              max="2026-10-08"
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-[11px] sm:text-xs text-slate-200 focus:outline-none cursor-pointer [color-scheme:dark]"
              aria-label="তারিখ নির্বাচন"
            />
          </div>
        </div>

        {/* Searchable Agent Selector */}
        <div className="relative">
          <label htmlFor="agent-search" className="block text-xs font-medium text-slate-400 mb-1">
            এজেন্ট নির্বাচন ({agents.length} জন)
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
              </div>
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-navy-850 rounded-2xl shadow-soft-lg border border-slate-700 z-50 p-2 max-h-64 overflow-y-auto">
                <div className="p-1 mb-1">
                  <input
                    type="text"
                    placeholder="এজেন্ট আইডি বা এরিয়া সার্চ..."
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
                    <li className="px-3 py-2 text-xs text-slate-500 text-center">কোনো এজেন্ট মেলেনি</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area: Loading / Error / Data */}
      {error ? (
        <ErrorState message={error} onRetry={() => setSelectedAgentId(selectedAgentId)} />
      ) : loading || !plan ? (
        <div className="space-y-3.5 sm:space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <div className="space-y-3.5 sm:space-y-4 animate-fade-in">
          {/* HERO CARD: Opening Cash & Segmented Risk Control */}
          <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 text-center space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {STRINGS.heroPlanHeading}
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-950/60 text-teal-300 border border-teal-800/50">
                {riskLevel === "0.8" ? "নিরাপদ প্ল্যান" : riskLevel === "0.9" ? "ভারসাম্য প্ল্যান" : "সতর্ক প্ল্যান"}
              </span>
            </div>

            {/* Responsive Opening Cash Number (34px mobile, 40px tablet/desktop) */}
            <div className="py-1">
              <div className="text-[34px] min-[390px]:text-[40px] leading-tight font-extrabold text-teal-400 tracking-tight tabular-nums">
                ৳ {formatBDT(plan.opening_cash)}
              </div>
              <p className="text-xs font-medium text-slate-400 mt-1">প্রস্তাবিত উদ্বোধনী নগদ (Opening Cash)</p>
            </div>

            {/* Full Bangla Message */}
            <div className="p-3 sm:p-3.5 bg-navy-900/90 rounded-xl text-left border border-slate-800">
              <p className="text-[16px] min-[390px]:text-[17px] sm:text-[18px] text-slate-200 leading-relaxed font-normal">
                {plan.message_bn}
              </p>
            </div>

            {/* 3-Way Segmented Control */}
            <div className="pt-1">
              <div className="text-xs font-medium text-slate-400 mb-2 flex items-center justify-between">
                <span>ঝুঁকির স্তর নির্ধারণ:</span>
                <span className="font-semibold text-slate-200">
                  {riskLevel === "0.8" ? "৮০% নিরাপদ" : riskLevel === "0.9" ? "৯০% ভারসাম্য" : "৯৫% সতর্ক"}
                </span>
              </div>

              <div
                className="grid grid-cols-3 gap-1 p-1 bg-navy-900/90 border border-slate-800 rounded-full w-full"
                role="radiogroup"
                aria-label="ঝুঁকি স্তর নিয়ন্ত্রণ"
              >
                {(
                  [
                    { key: "0.8", label: STRINGS.riskTiers.safe },
                    { key: "0.9", label: STRINGS.riskTiers.balanced },
                    { key: "0.95", label: STRINGS.riskTiers.cautious },
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
                      className={`min-h-[44px] py-1.5 px-0.5 min-[380px]:px-1 text-[11px] min-[390px]:text-xs sm:text-sm font-semibold rounded-full transition-transform duration-100 active:scale-[0.98] text-center truncate ${
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

              {/* Stockout Probability Info */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] sm:text-xs text-slate-400 px-1">
                <span>
                  প্ল্যানে ঘাটতি:{" "}
                  <strong className="text-slate-200">
                    {Math.round((plan.stockout_prob_plan[riskLevel] ?? 0.1) * 100)}%
                  </strong>
                </span>
                <span>
                  পূর্বের অভ্যাসে:{" "}
                  <strong className="text-slate-200">
                    {Math.round((plan.stockout_prob_habit[riskLevel] ?? 0.28) * 100)}%
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* REASONS CARD: Top 3 Reasons with Horizontal Bars */}
          <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                {STRINGS.reasonsHeading}
              </h3>
              <span className="text-xs text-slate-500 italic">
                {STRINGS.shapCaption}
              </span>
            </div>

            {/* Responsive scale reference bar */}
            <div className="flex items-center justify-between text-[10px] min-[390px]:text-[11px] text-slate-500 px-0.5 border-b border-slate-800/60 pb-1.5">
              <span>← হ্রাস (Teal)</span>
              <span className="font-semibold text-slate-400">০ (ভিত্তি)</span>
              <span>বৃদ্ধি (Amber) →</span>
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

                    return (
                      <div key={r.key || idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="font-medium text-slate-200 truncate flex-1 min-w-0 pr-1">
                            {r.label_bn}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-slate-400">
                              {isPositive ? "বৃদ্ধি" : isNegative ? "হ্রাস" : "নিরপেক্ষ"}
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

                        {/* Bi-directional impact bar with clear center baseline */}
                        <div
                          className="h-3 w-full bg-slate-900 rounded-full flex items-center relative border border-slate-800 overflow-hidden"
                          role="meter"
                          aria-label={`${r.label_bn}: ${isPositive ? "ঝুঁকি বৃদ্ধি" : isNegative ? "ঝুঁকি হ্রাস" : "নিরপেক্ষ"} ${impact.toFixed(2)}`}
                          aria-valuenow={Number(impact.toFixed(2))}
                          aria-valuemin={-1}
                          aria-valuemax={1}
                        >
                          {/* Left Half: Negative impact extending left from center baseline */}
                          <div className="w-1/2 h-full flex justify-end">
                            {isNegative && (
                              <div
                                className="h-full bg-teal-500 rounded-l-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            )}
                          </div>

                          {/* Center Baseline Divider */}
                          <div className="w-[1.5px] h-full bg-slate-600 shrink-0 z-10" />

                          {/* Right Half: Positive impact extending right from center baseline */}
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
              <p className="text-xs text-slate-400 py-2">{STRINGS.reasonsEmpty}</p>
            )}
          </div>

          {/* LOST DEMAND CARD */}
          {lostDemand && (
            <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                {STRINGS.lostDemandHeading} ({lostDemand.week})
              </h3>

              <div className="divide-y divide-slate-800/80 text-xs sm:text-sm">
                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-400">{STRINGS.lostCountLabel}</span>
                  <span className="font-bold text-slate-100 tabular-nums">
                    {lostDemand.lost_count} জন
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-400">{STRINGS.lostAmountLabel}</span>
                  <span className="font-bold text-slate-100 tabular-nums">
                    ৳ {formatBDT(lostDemand.lost_amount)}
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-400">{STRINGS.lostCommissionLabel}</span>
                  <span className="font-bold text-teal-400 tabular-nums">
                    ৳ {formatBDT(lostDemand.lost_commission)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* FEEDBACK CARD */}
          <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">
              {STRINGS.feedbackHeading}
            </h3>

            {feedbackStatus === "success" ? (
              <div className="flex items-center gap-2 p-3 bg-navy-900 rounded-xl border border-slate-800 text-slate-100">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                <span className="text-sm font-bold text-teal-400">{STRINGS.feedbackSuccess}</span>
                <span className="text-xs text-slate-400">আপনার মতামত রেকর্ড করা হয়েছে।</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleFeedback(true)}
                    disabled={feedbackStatus === "submitting"}
                    className={`flex-1 min-h-[44px] rounded-full text-xs sm:text-sm font-semibold transition-transform duration-100 active:scale-[0.98] border ${
                      feedbackAnswer === true
                        ? "bg-slate-700 text-white border-slate-600"
                        : "bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800"
                    } disabled:opacity-50`}
                  >
                    {STRINGS.feedbackYes}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(false)}
                    disabled={feedbackStatus === "submitting"}
                    className={`flex-1 min-h-[44px] rounded-full text-xs sm:text-sm font-semibold transition-transform duration-100 active:scale-[0.98] border ${
                      feedbackAnswer === false
                        ? "bg-slate-700 text-white border-slate-600"
                        : "bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800"
                    } disabled:opacity-50`}
                  >
                    {STRINGS.feedbackNo}
                  </button>
                </div>

                {feedbackStatus === "submitting" && (
                  <p className="text-xs text-slate-400 text-center py-1">
                    {STRINGS.feedbackSubmitting}
                  </p>
                )}

                {feedbackStatus === "error" && (
                  <div className="flex items-center justify-between text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 p-2.5 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{STRINGS.feedbackFailed}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFeedback(feedbackAnswer ?? true)}
                      className="underline font-semibold"
                    >
                      {STRINGS.retry}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
