/**
 * Bilingual strings: BN (default) + EN.
 * UI language is chosen via the header toggle (বাং/EN) and stored in localStorage.
 */
export type Lang = "bn" | "en";

type Dict = {
  appName: string;
  appTagline: string;

  navAgent: string;
  navArea: string;
  navEvidence: string;

  loading: string;
  loadError: string;
  retry: string;
  bdtSymbol: string;
  bdtUnit: string;
  riskWord: string;
  ctaViewPlan: string;

  heroPlanHeading: string;
  riskTiers: { safe: string; balanced: string; cautious: string };
  reasonsHeading: string;
  shapCaption: string;
  reasonsEmpty: string;

  lostDemandHeading: string;
  lostCountLabel: string;
  lostAmountLabel: string;
  lostCommissionLabel: string;

  feedbackHeading: string;
  feedbackYes: string;
  feedbackNo: string;
  feedbackSuccess: string;
  feedbackSubmitting: string;
  feedbackFailed: string;

  agentSelectorLabel: string;
  agentSelectorPlaceholder: string;

  areaHeading: string;
  areaSelectorLabel: string;
  dateSelectorLabel: string;
  agentIdCol: string;
  riskProbCol: string;
  riskHourCol: string;
  digitalShiftBadge: string;
  areaLostDemandHeading: string;
  areaLostDemandAmountLabel: string;

  evidenceHeading: string;
  evidenceSubheading: string;
  whyTrustHeading: string;
  recoveryChartTitle: string;
  recoveryCaption: string;
  forecastChartTitle: string;

  pipelineStep1Title: string;
  pipelineStep1Desc: string;
  pipelineStep2Title: string;
  pipelineStep2Desc: string;
  pipelineStep3Title: string;
  pipelineStep3Desc: string;
  pipelineStep4Title: string;
  pipelineStep4Desc: string;

  footerSynthetic: string;
  footerLlmDisclosure: string;
};

const BN: Dict = {
  appName: "CashReady",
  appTagline: "AI Liquidity Planner for upay agents",

  navAgent: "এজেন্ট",
  navArea: "এরিয়া",
  navEvidence: "প্রমাণ",

  loading: "লোড হচ্ছে...",
  loadError: "ডেটা লোড করা যায়নি — আবার চেষ্টা করুন",
  retry: "আবার চেষ্টা করুন",
  bdtSymbol: "৳",
  bdtUnit: "টাকা",
  riskWord: "ঝুঁকি",
  ctaViewPlan: "আজকের প্ল্যান দেখুন",

  heroPlanHeading: "আজকের প্ল্যান",
  riskTiers: {
    safe: "নিরাপদ ৮০%",
    balanced: "ভারসাম্য ৯০%",
    cautious: "সতর্ক ৯৫%",
  },
  reasonsHeading: "ঝুঁকি কেন?",
  shapCaption: "SHAP দিয়ে ব্যাখ্যা করা",
  reasonsEmpty: "এই এজেন্টের জন্য কোনো অস্বাভাবিক ঝুঁকি পাওয়া যায়নি।",

  lostDemandHeading: "গত সপ্তাহের হারানো কাস্টমার",
  lostCountLabel: "হারানো কাস্টমার",
  lostAmountLabel: "হারানো চাহিদা (BDT)",
  lostCommissionLabel: "হারানো কমিশন (BDT)",

  feedbackHeading: "এই পরামর্শ কি কাজের ছিল?",
  feedbackYes: "হ্যাঁ",
  feedbackNo: "না",
  feedbackSuccess: "ধন্যবাদ!",
  feedbackSubmitting: "পাঠানো হচ্ছে...",
  feedbackFailed: "মতামত জমা দেওয়া যায়নি",

  agentSelectorLabel: "এজেন্ট নির্বাচন",
  agentSelectorPlaceholder: "এজেন্ট নির্বাচন বা সার্চ করুন...",

  areaHeading: "আগামীকালের ঝুঁকি",
  areaSelectorLabel: "এরিয়া",
  dateSelectorLabel: "তারিখ",
  agentIdCol: "এজেন্ট আইডি",
  riskProbCol: "ঝুঁকির মাত্রা",
  riskHourCol: "ঝুঁকির সময়",
  digitalShiftBadge: "ডিজিটালে সরে যাচ্ছে",
  areaLostDemandHeading: "হারানো চাহিদা (এই সপ্তাহ)",
  areaLostDemandAmountLabel: "হারানো পরিমাণ (টাকা)",

  evidenceHeading: "মডেল মূল্যায়ন ও প্রমাণ",
  evidenceSubheading: "কৃত্রিম তথ্য (Synthetic Data) ও গ্রাউন্ড ট্রুথের উপর ভিত্তি করে ৩০ দিনের টেস্ট মূল্যায়ন।",
  whyTrustHeading: "কেন বিশ্বাস করবেন?",
  recoveryChartTitle: "সেন্সরড চাহিদা পুনরুদ্ধার নির্ভুলতা (Recovery Comparison)",
  recoveryCaption: "কম = ভালো (Lower MAE is better)",
  forecastChartTitle: "এরিয়া ধরন অনুযায়ী পূর্বাভাস গড় ত্রুটি (Forecast MAE by Area)",

  pipelineStep1Title: "সনাক্ত",
  pipelineStep1Desc: "HMM/LightGBM detector",
  pipelineStep2Title: "পুনরুদ্ধার",
  pipelineStep2Desc: "censored demand",
  pipelineStep3Title: "পূর্বাভাস",
  pipelineStep3Desc: "quantile",
  pipelineStep4Title: "পরিকল্পনা",
  pipelineStep4Desc: "newsvendor",

  footerSynthetic: "সব সংখ্যা সিনথেটিক ডেটার উপর মূল্যায়ন থেকে; কোড: github.com/masudranaxpert/cashready",
  footerLlmDisclosure: "স্বীকৃতি: লার্জ ল্যাঙ্গুয়েজ মডেল (LLM) কেবল ফলাফল সংক্ষেপে উপস্থাপন করে, কোনো গাণিতিক সংখ্যা তৈরি বা পরিবর্তন করে না।",
};

const EN: Dict = {
  appName: "CashReady",
  appTagline: "AI Liquidity Planner for upay agents",

  navAgent: "Agent",
  navArea: "Area",
  navEvidence: "Evidence",

  loading: "Loading...",
  loadError: "Could not load data — please try again",
  retry: "Retry",
  bdtSymbol: "৳",
  bdtUnit: "BDT",
  riskWord: "risk",
  ctaViewPlan: "View today's plan",

  heroPlanHeading: "Today's plan",
  riskTiers: {
    safe: "Safe 80%",
    balanced: "Balanced 90%",
    cautious: "Cautious 95%",
  },
  reasonsHeading: "Why this risk?",
  shapCaption: "Explained with SHAP",
  reasonsEmpty: "No unusual risk found for this agent.",

  lostDemandHeading: "Last week's lost customers",
  lostCountLabel: "Lost customers",
  lostAmountLabel: "Lost demand (BDT)",
  lostCommissionLabel: "Lost commission (BDT)",

  feedbackHeading: "Was this advice useful?",
  feedbackYes: "Yes",
  feedbackNo: "No",
  feedbackSuccess: "Thank you!",
  feedbackSubmitting: "Sending...",
  feedbackFailed: "Could not submit feedback",

  agentSelectorLabel: "Select agent",
  agentSelectorPlaceholder: "Select or search an agent...",

  areaHeading: "Tomorrow's risk",
  areaSelectorLabel: "Area",
  dateSelectorLabel: "Date",
  agentIdCol: "Agent ID",
  riskProbCol: "Risk level",
  riskHourCol: "Risk hour",
  digitalShiftBadge: "Shifting to digital",
  areaLostDemandHeading: "Lost demand (this week)",
  areaLostDemandAmountLabel: "Lost amount (BDT)",

  evidenceHeading: "Model evaluation & evidence",
  evidenceSubheading: "30-day test evaluation on synthetic data and ground truth.",
  whyTrustHeading: "Why trust this?",
  recoveryChartTitle: "Censored demand recovery accuracy",
  recoveryCaption: "Lower is better (MAE)",
  forecastChartTitle: "Forecast MAE by area type",

  pipelineStep1Title: "Detect",
  pipelineStep1Desc: "HMM/LightGBM detector",
  pipelineStep2Title: "Recover",
  pipelineStep2Desc: "censored demand",
  pipelineStep3Title: "Forecast",
  pipelineStep3Desc: "quantile",
  pipelineStep4Title: "Plan",
  pipelineStep4Desc: "newsvendor",

  footerSynthetic: "All numbers come from synthetic-data evaluation; code: github.com/masudranaxpert/cashready",
  footerLlmDisclosure: "Disclosure: the LLM only presents results in plain words; it never creates or changes any number.",
};

export const STRINGS: Record<Lang, Dict> = { bn: BN, en: EN };

export const DEFAULT_LANG: Lang = "bn";

/**
 * Format Western digits with commas (e.g. 1062799 -> "1,062,799")
 */
export function formatBDT(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Format decimal percentages (e.g. 0.8263 -> "82.6%")
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
