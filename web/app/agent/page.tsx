"use client";

import { useEffect, useState, useMemo } from "react";
import {
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
    <div className="max-w-md mx-auto space-y-4">
      {/* Top Bar: Title, Date Picker, and Searchable Agent Selector */}
      <section className="bg-white rounded-2xl shadow-soft p-4 space-y-3" aria-label="এজেন্ট ও তারিখ নির্বাচন">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              CashReady
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              এজেন্ট ভিউ
            </span>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 rounded-full px-3 py-1.5 text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-800 focus:outline-none cursor-pointer"
              aria-label="তারিখ নির্বাচন"
            />
          </div>
        </div>

        {/* Searchable Agent Selector */}
        <div className="relative">
          <label htmlFor="agent-search" className="block text-xs font-medium text-slate-500 mb-1">
            এজেন্ট নির্বাচন ({agents.length} জন এজেন্ট)
          </label>
          <div className="relative">
            <button
              type="button"
              id="agent-search"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full min-h-[44px] px-3.5 py-2 text-left bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between text-sm transition-colors"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-slate-900">{currentAgent?.agent_id ?? selectedAgentId}</span>
                <span className="text-xs text-slate-500">
                  {currentAgent ? `• ${currentAgent.area_id} (${currentAgent.area_type})` : ""}
                </span>
              </div>
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-soft-lg border border-slate-200 z-50 p-2 max-h-64 overflow-y-auto">
                <div className="p-1 mb-1">
                  <input
                    type="text"
                    placeholder="এজেন্ট আইডি বা এরিয়া সার্চ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
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
                        className={`w-full min-h-[38px] px-3 py-1.5 text-left text-xs rounded-lg flex items-center justify-between ${
                          ag.agent_id === selectedAgentId
                            ? "bg-slate-900 text-white font-medium"
                            : "hover:bg-slate-100 text-slate-800"
                        }`}
                        role="option"
                        aria-selected={ag.agent_id === selectedAgentId}
                      >
                        <span className="font-semibold">{ag.agent_id}</span>
                        <span className={ag.agent_id === selectedAgentId ? "text-slate-300" : "text-slate-500"}>
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
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* HERO CARD: Opening Cash & Segmented Risk Control */}
          <div className="bg-white rounded-2xl shadow-soft p-5 text-center space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {STRINGS.heroPlanHeading}
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                {riskLevel === "0.8" ? "নিরাপদ প্ল্যান" : riskLevel === "0.9" ? "ভারসাম্য প্ল্যান" : "সতর্ক প্ল্যান"}
              </span>
            </div>

            {/* Giant Opening Cash Number (40px, Teal) */}
            <div className="py-1">
              <div className="text-[40px] leading-tight font-extrabold text-teal-600 tracking-tight tabular-nums">
                ৳ {formatBDT(plan.opening_cash)}
              </div>
              <p className="text-xs font-medium text-slate-500 mt-1">প্রস্তাবিত উদ্বোধনী নগদ (Opening Cash)</p>
            </div>

            {/* Full Bangla Message (18px, Hind Siliguri) */}
            <div className="p-3.5 bg-slate-50 rounded-xl text-left border border-slate-100">
              <p className="text-[17px] sm:text-[18px] text-slate-800 leading-relaxed font-normal">
                {plan.message_bn}
              </p>
            </div>

            {/* 3-Way Segmented Control */}
            <div className="pt-2">
              <div className="text-xs font-medium text-slate-500 mb-2 flex items-center justify-between">
                <span>ঝুঁকির স্তর নির্ধারণ করুন:</span>
                <span className="font-semibold text-slate-800">
                  {riskLevel === "0.8" ? "৮০% নিরাপদ" : riskLevel === "0.9" ? "৯০% ভারসাম্য" : "৯৫% সতর্ক"}
                </span>
              </div>

              <div
                className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-full"
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
                      className={`min-h-[44px] py-2 px-1 text-xs sm:text-sm font-semibold rounded-full transition-transform duration-100 active:scale-[0.98] ${
                        isSelected
                          ? "bg-black text-white shadow-soft"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tier.label}
                    </button>
                  );
                })}
              </div>

              {/* Stockout Probability Info */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  প্ল্যানে ঘাটতি সম্ভাবনা:{" "}
                  <strong className="text-slate-800">
                    {Math.round((plan.stockout_prob_plan[riskLevel] ?? 0.1) * 100)}%
                  </strong>
                </span>
                <span>
                  পূর্বের অভ্যাসে:{" "}
                  <strong className="text-slate-800">
                    {Math.round((plan.stockout_prob_habit[riskLevel] ?? 0.28) * 100)}%
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* REASONS CARD: Top 3 Reasons with Horizontal Bars */}
          <div className="bg-white rounded-2xl shadow-soft p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                {STRINGS.reasonsHeading}
              </h3>
              <span className="text-xs text-slate-500 italic">
                {STRINGS.shapCaption}
              </span>
            </div>

            {plan.reasons && plan.reasons.length > 0 ? (
              <div className="space-y-3.5">
                {plan.reasons.slice(0, 3).map((r: Reason, idx: number) => {
                  const isPositive = r.impact >= 0;
                  const absVal = Math.min(Math.abs(r.impact) * 180, 100); // normalized bar width percentage

                  return (
                    <div key={r.key || idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">{r.label_bn}</span>
                        <span
                          className={`font-semibold tabular-nums ${
                            isPositive ? "text-amber-800" : "text-teal-700"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {r.impact.toFixed(2)}
                        </span>
                      </div>

                      {/* Bi-directional impact bar */}
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex items-center relative">
                        {/* Center reference mark */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 z-10" />

                        {isPositive ? (
                          // Positive risk impact extends right in amber
                          <div className="w-1/2 flex justify-start ml-auto">
                            <div
                              className="h-full bg-amber-400 rounded-r-full transition-all duration-300"
                              style={{ width: `${absVal}%` }}
                              title={`ঝুঁকি বৃদ্ধি: +${r.impact.toFixed(2)}`}
                            />
                          </div>
                        ) : (
                          // Negative risk impact extends left in teal
                          <div className="w-1/2 flex justify-end">
                            <div
                              className="h-full bg-teal-600 rounded-l-full transition-all duration-300"
                              style={{ width: `${absVal}%` }}
                              title={`ঝুঁকি হ্রাস: ${r.impact.toFixed(2)}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-2">{STRINGS.reasonsEmpty}</p>
            )}
          </div>

          {/* LOST DEMAND CARD */}
          {lostDemand && (
            <div className="bg-white rounded-2xl shadow-soft p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                {STRINGS.lostDemandHeading} ({lostDemand.week})
              </h3>

              <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-600">{STRINGS.lostCountLabel}</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {lostDemand.lost_count} জন
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-600">{STRINGS.lostAmountLabel}</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    ৳ {formatBDT(lostDemand.lost_amount)}
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-600">{STRINGS.lostCommissionLabel}</span>
                  <span className="font-bold text-teal-700 tabular-nums">
                    ৳ {formatBDT(lostDemand.lost_commission)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* FEEDBACK CARD */}
          <div className="bg-white rounded-2xl shadow-soft p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {STRINGS.feedbackHeading}
            </h3>

            {feedbackStatus === "success" ? (
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-slate-900">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                <span className="text-sm font-bold">{STRINGS.feedbackSuccess}</span>
                <span className="text-xs text-slate-500">আপনার মতামত রেকর্ড করা হয়েছে।</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleFeedback(true)}
                    disabled={feedbackStatus === "submitting"}
                    className={`flex-1 min-h-[44px] rounded-full text-sm font-semibold transition-transform duration-100 active:scale-[0.98] ${
                      feedbackAnswer === true
                        ? "bg-black text-white"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200/80"
                    } disabled:opacity-50`}
                  >
                    {STRINGS.feedbackYes}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(false)}
                    disabled={feedbackStatus === "submitting"}
                    className={`flex-1 min-h-[44px] rounded-full text-sm font-semibold transition-transform duration-100 active:scale-[0.98] ${
                      feedbackAnswer === false
                        ? "bg-black text-white"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200/80"
                    } disabled:opacity-50`}
                  >
                    {STRINGS.feedbackNo}
                  </button>
                </div>

                {feedbackStatus === "submitting" && (
                  <p className="text-xs text-slate-500 text-center py-1">
                    {STRINGS.feedbackSubmitting}
                  </p>
                )}

                {feedbackStatus === "error" && (
                  <div className="flex items-center justify-between text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
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
