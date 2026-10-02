export const STRINGS = {
  appName: "CashReady",
  appTagline: "উপায় AI লিকুইডিটি",
  
  // Navigation
  navAgent: "এজেন্ট",
  navArea: "এরিয়া",
  navEvidence: "প্রমাণ",
  
  // Common
  loading: "লোড হচ্ছে...",
  loadError: "ডেটা লোড করা যায়নি — আবার চেষ্টা করুন",
  retry: "আবার চেষ্টা করুন",
  bdtSymbol: "৳",
  bdtUnit: "টাকা",
  riskWord: "ঝুঁকি",
  ctaViewPlan: "আজকের প্ল্যান দেখুন",
  
  // Agent Page
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
  
  agentSelectorPlaceholder: "এজেন্ট নির্বাচন বা সার্চ করুন...",
  
  // Area Page
  areaHeading: "আগামীকালের ঝুঁকি",
  areaSelectorLabel: "এরিয়া",
  dateSelectorLabel: "তারিখ",
  agentIdCol: "এজেন্ট আইডি",
  riskProbCol: "ঝুঁকির মাত্রা",
  riskHourCol: "ঝুঁকির সময়",
  digitalShiftBadge: "ডিজিটালে সরে যাচ্ছে",
  areaLostDemandHeading: "হারানো চাহিদা (এই সপ্তাহ)",
  areaLostDemandAmountLabel: "হারানো পরিমাণ (টাকা)",
  
  // Evidence Page
  evidenceHeading: "মডেল মূল্যায়ন ও প্রমাণ",
  evidenceSubheading: "কৃত্রিম তথ্য (Synthetic Data) ও গ্রাউন্ড ট্রুথের উপর ভিত্তি করে ৩০ দিনের টেস্ট মূল্যায়ন।",
  whyTrustHeading: "কেন বিশ্বাস করবেন?",
  recoveryChartTitle: "সেন্সরড চাহিদা পুনরুদ্ধার নির্ভুলতা (Recovery Comparison)",
  recoveryCaption: "কম = ভালো (Lower MAE is better)",
  forecastChartTitle: "এরিয়া ধরন অনুযায়ী পূর্বাভাস গড় ত্রুটি (Forecast MAE by Area)",
  
  // Pipeline Strip
  pipelineStep1Title: "সনাক্ত",
  pipelineStep1Desc: "HMM/LightGBM detector",
  pipelineStep2Title: "পুনরুদ্ধার",
  pipelineStep2Desc: "censored demand",
  pipelineStep3Title: "পূর্বাভাস",
  pipelineStep3Desc: "quantile",
  pipelineStep4Title: "পরিকল্পনা",
  pipelineStep4Desc: "newsvendor",
  
  // Disclosures & Footer
  footerSynthetic: "সব সংখ্যা সিনথেটিক ডেটার উপর মূল্যায়ন থেকে; কোড: github.com/masudranaxpert/cashready",
  footerLlmDisclosure: "স্বীকৃতি: লার্জ ল্যাঙ্গুয়েজ মডেল (LLM) কেবল ফলাফল সংক্ষেপে উপস্থাপন করে, কোনো গাণিতিক সংখ্যা তৈরি বা পরিবর্তন করে না।",
} as const;

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
