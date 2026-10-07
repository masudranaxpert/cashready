"use client";

import { useEffect, useState, useMemo } from "react";
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
  submitAgentFeedback,
  submitStockoutConfirmation,
  getAgentConfirmations,
  ApiError,
} from "@/lib/api";
import { DEMO_DATE, DEMO_WEEK } from "@/lib/mock-data";
import { STRINGS, formatBDT } from "@/lib/strings";
import { useLang } from "@/lib/lang";
import { Skeleton, ErrorState } from "@/components/Skeleton";
import { MockDataBanner } from "@/components/MockDataBanner";
import { Search, Calendar, CheckCircle2, AlertCircle, Lock } from "lucide-react";

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

  // Feedback states
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "demo" | "error">("idle");
  const [feedbackAnswer, setFeedbackAnswer] = useState<boolean | null>(null);

  // Structured Confirmation states
  const [cashRanOut, setCashRanOut] = useState<boolean>(false);
  const [fromHour, setFromHour] = useState<number>(13);
  const [toHour, setToHour] = useState<number>(15);
  const [customersTurnedAway, setCustomersTurnedAway] = useState<string>("");
  const [keptRecommended, setKeptRecommended] = useState<"yes" | "partly" | "no">("yes");
  const [openingCashKept, setOpeningCashKept] = useState<string>("");
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
          setUserRole(s.role);
          if (s.role === "agent" && s.id) {
            setLockedAgentId(s.id);
            setSelectedAgentId(s.id);
          }
        }
      } catch (err) {
        // ignore
      }
    }
    checkSession();
  }, []);

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
      from_hour: cashRanOut ? Number(fromHour) : null,
      to_hour: cashRanOut ? Number(toHour) : null,
      customers_turned_away: customersTurnedAway ? Number(customersTurnedAway) : null,
      kept_recommended_cash: keptRecommended,
      opening_cash_kept: openingCashKept ? Number(openingCashKept) : null,
    };

    try {
      const res = await submitStockoutConfirmation(selectedAgentId, payload);
      setAgentConfirmations((prev) => [res, ...prev]);
      setConfSubmitted(true);
    } catch (err: unknown) {
      setConfError(lang === "en" ? "Failed to save confirmation" : "রিপোর্ট সংরক্ষণ করা যায়নি");
    } finally {
      setConfSubmitting(false);
    }
  };

  const handleRiskChange = (newRisk: RiskLevel) => {
    setRiskLevel(newRisk);
  };

  return (
    <div className="max-w-md mx-auto space-y-3.5 sm:space-y-4 w-full">
      <MockDataBanner />

      <section className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-3.5 sm:p-4 space-y-3" aria-label={t.agentSelectorLabel}>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="font-bold text-base sm:text-lg text-slate-100 tracking-tight shrink-0">
              CashReady
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 truncate">
              {t.agentViewBadge}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 rounded-full px-2.5 py-1 text-xs font-medium text-slate-300 border border-slate-800 shrink-0">
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

        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="agent-search" className="block text-xs font-medium text-slate-400">
              {userRole === "agent"
                ? (lang === "bn" ? "আপনার এজেন্ট আইডি (নির্ধারিত)" : "Your Agent ID (Locked)")
                : t.agentSelectCount(agents.length)}
            </label>
            {userRole === "agent" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-800/60">
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
              className={`w-full min-h-[44px] px-3.5 py-2 text-left bg-slate-900/90 rounded-xl border border-slate-700/70 flex items-center justify-between text-sm transition-colors text-slate-200 ${
                userRole === "agent" ? "cursor-default opacity-90" : "hover:bg-slate-900"
              }`}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                <span className="font-bold text-slate-100 shrink-0">{currentAgent?.agent_id ?? selectedAgentId}</span>
                <span className="text-xs text-slate-400 truncate">
                  {currentAgent ? `• ${currentAgent.area_id} (${currentAgent.area_type})` : ""}
                </span>
              </div>
              {userRole === "agent" ? (
                <Lock className="w-4 h-4 text-teal-400 shrink-0 ml-2" />
              ) : (
                <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              )}
            </button>

            {isDropdownOpen && userRole !== "agent" && (
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
        <ErrorState
          message={errorMessage || undefined}
          onRetry={() => setSelectedAgentId(selectedAgentId)}
        />
      ) : loading || !plan ? (
        <div className="space-y-3.5 sm:space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <div className="space-y-3.5 sm:space-y-4 animate-fade-in">
          <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 text-center space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t.heroPlanHeading}
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-950/60 text-teal-300 border border-teal-800/50">
                {riskLevel === "0.8" ? t.planBadgeSafe : riskLevel === "0.9" ? t.planBadgeBalanced : t.planBadgeCautious}
              </span>
            </div>

            <div className="py-1">
              <div className="text-[34px] min-[390px]:text-[40px] leading-tight font-extrabold text-teal-400 tracking-tight tabular-nums">
                ৳ {formatBDT(plan.opening_cash)}
              </div>
              <p className="text-xs font-medium text-slate-400 mt-1">{t.openingCashLabel}</p>
            </div>

            <div className="p-3 sm:p-3.5 bg-navy-900/90 rounded-xl text-left border border-slate-800">
              <p className="text-[16px] min-[390px]:text-[17px] sm:text-[18px] text-slate-200 leading-relaxed font-normal">
                {lang === "en" && plan.message_en ? plan.message_en : plan.message_bn}
              </p>
            </div>

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

              <div className="mt-2.5 flex items-center justify-between text-[11px] sm:text-xs text-slate-400 px-1">
                <span>
                  {t.planShortfall}{" "}
                  <strong className="text-slate-200">
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
                </span>
                <span>
                  {t.habitBefore}{" "}
                  <strong className="text-slate-200">
                    {Math.round((
                      (typeof plan.stockout_prob_habit === "object" && plan.stockout_prob_habit !== null
                        ? (plan.stockout_prob_habit[riskLevel] ?? Object.values(plan.stockout_prob_habit)[0])
                        : plan.stockout_prob_habit) ?? 0.28
                    ) * 100)}%
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                {t.reasonsHeading}
              </h3>
              <span className="text-xs text-slate-500 italic">
                {t.shapCaption}
              </span>
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

          {lostDemand && (
            <div className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                {t.lostDemandHeading} ({lostDemand.week})
              </h3>

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

          {/* Structured Confirmation Card (Replaces simple "was this useful?" thumbs) */}
          <section className="bg-navy-850 rounded-2xl border border-slate-800/80 shadow-soft p-4 sm:p-5 space-y-4" aria-label={t.confirmationFormTitle}>
            <div className="border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  <span>{t.confirmationFormTitle}</span>
                </h3>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 border border-teal-800/40">
                  {t.badgeConfirmed}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t.confirmationFormDesc}
              </p>
            </div>

            {confSubmitted ? (
              <div className="p-3.5 bg-teal-950/30 border border-teal-800/60 rounded-xl space-y-2 text-slate-100">
                <div className="flex items-center gap-2 text-teal-300 font-semibold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>{t.confirmationSuccess}</span>
                </div>
                <p className="text-xs text-slate-300">
                  {lang === "en"
                    ? `Recorded: Cash ran out: ${cashRanOut ? "Yes" : "No"}, Kept plan: ${keptRecommended}.`
                    : `সংরক্ষিত তথ্য: নগদ ফুরিয়েছিল: ${cashRanOut ? "হ্যাঁ" : "না"}, প্ল্যান অনুসরণ: ${keptRecommended === "yes" ? "হ্যাঁ" : keptRecommended === "partly" ? "আংশিক" : "না"}।`}
                </p>
                <button
                  type="button"
                  onClick={() => setConfSubmitted(false)}
                  className="text-xs text-teal-400 underline hover:text-teal-300 font-medium pt-1"
                >
                  {lang === "en" ? "Update report" : "পুনরায় রিপোর্ট সংশোধন করুন"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmationSubmit} className="space-y-3.5 text-xs">
                {/* Question 1: Cash ran out? */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-200 block">
                    {t.qCashRanOut}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCashRanOut(false)}
                      className={`min-h-[40px] px-3 py-2 rounded-xl font-medium border transition-colors ${
                        !cashRanOut
                          ? "bg-teal-950/60 border-teal-600 text-teal-200"
                          : "bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t.qRanOutNo}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashRanOut(true)}
                      className={`min-h-[40px] px-3 py-2 rounded-xl font-medium border transition-colors ${
                        cashRanOut
                          ? "bg-rose-950/60 border-rose-600 text-rose-200"
                          : "bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t.qRanOutYes}
                    </button>
                  </div>
                </div>

                {/* Conditional hours & customers turned away if cash ran out */}
                {cashRanOut && (
                  <div className="p-3 bg-navy-900/90 rounded-xl border border-rose-900/40 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-slate-300 block mb-1">
                          {t.qFromHour}
                        </label>
                        <select
                          value={fromHour}
                          onChange={(e) => setFromHour(Number(e.target.value))}
                          className="w-full bg-navy-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                        >
                          {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
                            <option key={h} value={h}>
                              {h}:00
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-300 block mb-1">
                          {t.qToHour}
                        </label>
                        <select
                          value={toHour}
                          onChange={(e) => setToHour(Number(e.target.value))}
                          className="w-full bg-navy-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                        >
                          {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
                            <option key={h} value={h}>
                              {h}:00
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        {t.qCustomersTurnedAway}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        placeholder="e.g. 5"
                        value={customersTurnedAway}
                        onChange={(e) => setCustomersTurnedAway(e.target.value)}
                        className="w-full bg-navy-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                )}

                {/* Question: Kept recommended cash? */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-200 block">
                    {t.qKeptRecommended}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setKeptRecommended("yes")}
                      className={`min-h-[38px] px-2 py-1.5 rounded-xl font-medium border text-center transition-colors ${
                        keptRecommended === "yes"
                          ? "bg-teal-950/60 border-teal-600 text-teal-200"
                          : "bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t.optKeptYes}
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeptRecommended("partly")}
                      className={`min-h-[38px] px-2 py-1.5 rounded-xl font-medium border text-center transition-colors ${
                        keptRecommended === "partly"
                          ? "bg-amber-950/60 border-amber-600 text-amber-200"
                          : "bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t.optKeptPartly}
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeptRecommended("no")}
                      className={`min-h-[38px] px-2 py-1.5 rounded-xl font-medium border text-center transition-colors ${
                        keptRecommended === "no"
                          ? "bg-rose-950/60 border-rose-600 text-rose-200"
                          : "bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t.optKeptNo}
                    </button>
                  </div>
                </div>

                {/* Optional opening cash kept */}
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">
                    {t.qOpeningCashKept}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    placeholder="৳ 60,000"
                    value={openingCashKept}
                    onChange={(e) => setOpeningCashKept(e.target.value)}
                    className="w-full bg-navy-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                {confError && (
                  <div className="p-2 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-lg text-xs">
                    {confError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={confSubmitting}
                  className="w-full min-h-[44px] rounded-xl font-bold bg-teal-500 hover:bg-teal-400 text-navy-950 transition-colors disabled:opacity-50 text-xs sm:text-sm shadow-soft"
                >
                  {confSubmitting ? t.loading : t.btnSubmitConfirmation}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
