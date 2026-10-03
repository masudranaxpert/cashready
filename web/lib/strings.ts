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
  agentViewBadge: string;
  agentSelectCount: (n: number) => string;
  openingCashLabel: string;
  planBadgeSafe: string;
  planBadgeBalanced: string;
  planBadgeCautious: string;
  riskLevelSet: string;
  riskSafe80: string;
  riskBalanced90: string;
  riskCautious95: string;
  planShortfall: string;
  habitBefore: string;
  scaleLess: string;
  scaleBase: string;
  scaleMore: string;
  impactUp: string;
  impactDown: string;
  impactNeutral: string;
  noAgentMatch: string;
  lostCountUnit: (n: number) => string;
  feedbackRecorded: string;
  areaViewBadge: string;
  areaSubheading: string;
  agentShortfallList: string;
  areaAgentCount: (id: string, n: number) => string;
  redBorderLegend: string;
  sortBy: string;
  riskTime: (h: number) => string;
  shortfallProb: string;
  cashShortfall: string;
  normal: string;
  cashShortfallRisk: string;
  normalState: string;
  week: string;
  demandBdt: string;
  lostTransactionsLabel: string;
  chartTapHint: string;
  evidenceBadge: string;
  evidenceSubheading2: string;
  kpiDetectorF1: string;
  kpiLightgbm: string;
  kpiCalibration: string;
  kpiCoverage: string;
  kpiTarget80: string;
  kpiLostDemand: string;
  kpiVsHabit: string;
  kpiCommissionSaved: string;
  kpiTotalSaved: string;
  evalEvidenceTitle: string;
  evalEvidenceDesc: string;
  errorLevel: string;
  chartSummary: string;
  meanDeviationBdt: string;
  pipelineTitle: string;
  recoverySummary: string;
  forecastSummary: string;

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
    safe: "ঝুঁকি বেশি ৮০%",
    balanced: "ভারসাম্য ৯০%",
    cautious: "সবচেয়ে নিরাপদ ৯৫%",
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
  agentViewBadge: "এজেন্ট ভিউ",
  agentSelectCount: (n: number) => `এজেন্ট নির্বাচন (${n} জন)`,
  openingCashLabel: "প্রস্তাবিত উদ্বোধনী নগদ (Opening Cash)",
  planBadgeSafe: "ঝুঁকি বেশি প্ল্যান",
  planBadgeBalanced: "ভারসাম্য প্ল্যান",
  planBadgeCautious: "সবচেয়ে নিরাপদ প্ল্যান",
  riskLevelSet: "ঝুঁকির স্তর নির্ধারণ:",
  riskSafe80: "৮০% ঝুঁকি বেশি",
  riskBalanced90: "৯০% ভারসাম্য",
  riskCautious95: "৯৫% সবচেয়ে নিরাপদ",
  planShortfall: "প্ল্যানে ঘাটতি:",
  habitBefore: "পূর্বের অভ্যাসে:",
  scaleLess: "← হ্রাস (Teal)",
  scaleBase: "০ (ভিত্তি)",
  scaleMore: "বৃদ্ধি (Amber) →",
  impactUp: "বৃদ্ধি",
  impactDown: "হ্রাস",
  impactNeutral: "নিরপেক্ষ",
  noAgentMatch: "কোনো এজেন্ট মেলেনি",
  lostCountUnit: (n: number) => `${n} জন`,
  feedbackRecorded: "আপনার মতামত রেকর্ড করা হয়েছে।",
  areaViewBadge: "এরিয়া ভিউ",
  areaSubheading: "আগামীকালের জন্য সম্ভাব্য ক্যাশ ঘাটতি এবং এরিয়াভিত্তিক চাহিদা শিফট বিশ্লেষণ",
  agentShortfallList: "এজেন্ট ঘাটতি ঝুঁকির তালিকা",
  areaAgentCount: (id: string, n: number) => `এরিয়া ${id} • মোট ${n} জন এজেন্ট`,
  redBorderLegend: "লাল সীমানা = উচ্চ ঝুঁকি (≥ ৩০%)",
  sortBy: "সাজান:",
  riskTime: (h: number) => `সময়: ${h < 12 ? "সকাল" : h < 15 ? "দুপুর" : h < 18 ? "বিকেল" : h < 20 ? "সন্ধ্যা" : "রাত"} ${h}:00`,
  shortfallProb: "ঘাটতি সম্ভাবনা",
  cashShortfall: "নগদ ঘাটতি",
  normal: "স্বাভাবিক",
  cashShortfallRisk: "নগদ ঘাটতি ঝুঁকি",
  normalState: "স্বাভাবিক অবস্থা",
  week: "সপ্তাহ",
  demandBdt: "চাহিদা (BDT)",
  lostTransactionsLabel: "হারানো লেনদেন",
  chartTapHint: "চার্টের বারে ট্যাপ করে নির্দিষ্ট এরিয়া পরিবর্তন করুন।",
  evidenceBadge: "মূল্যায়ন-ভিত্তিক প্রমাণ",
  evidenceSubheading2: "কোনো অনুমিত বা কাল্পনিক সংখ্যা নয় — সমস্ত ফলাফল লুকানো গ্রাউন্ড ট্রুথের সাথে পরিমাপযোগ্য।",
  kpiDetectorF1: "স্টক-আউট ডিটেক্টর F1",
  kpiLightgbm: "LightGBM মডেল",
  kpiCalibration: "পূর্বাভাস ক্যালিব্রেশন (P10–P90)",
  kpiCoverage: "কভারেজ হার",
  kpiTarget80: "টার্গেট ৮০.০%",
  kpiLostDemand: "হারানো চাহিদা (৩০ দিনের সিমুলেশন)",
  kpiVsHabit: "CashReady vs অভ্যাস",
  kpiCommissionSaved: "সংরক্ষিত কমিশন (৩০ দিন)",
  kpiTotalSaved: "মোট সাশ্রয়",
  evalEvidenceTitle: "মূল্যায়ন প্রমাণ",
  evalEvidenceDesc: "মডেলের সিদ্ধান্ত গ্রহণ প্রক্রিয়া এবং অ্যালগরিদম ভিত্তিক সক্ষমতার তুলনামূলক পরিসংখ্যান।",
  errorLevel: "ত্রুটি মাত্রা",
  chartSummary: "চার্ট সারাংশ",
  meanDeviationBdt: "গড় বিচ্যুতি (BDT)",
  pipelineTitle: "CashReady এন্ড-টু-এন্ড পাইপলাইন আর্কিটেকচার",
  recoverySummary: "সাধারণ পর্যবেক্ষণ (Naive) ত্রুটি ৭১.৯% এবং গড় সংশোধন (Mean correction) ৬৯.৭% হলেও CashReady রিকভারি মডেল তা কমিয়ে ৬৮.৩%-এ নামিয়ে আনে (কম = ভালো)।",
  forecastSummary: "উচ্চ লেনদেন ঘনত্বের শহর বাজারে MAE ২,৮৯২ টাকা, উপশহরে ২,৩৭৮ টাকা এবং পল্লী অঞ্চলে ১,৮০৯ টাকা; সকল ক্ষেত্রে কোয়ান্টাইল প্রেডিকশন গ্রাহক চাহিদার ওঠানামা সফলভাবে ধারণ করে।",

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
    safe: "Higher risk 80%",
    balanced: "Balanced 90%",
    cautious: "Safest 95%",
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
  agentViewBadge: "Agent view",
  agentSelectCount: (n: number) => `Select agent (${n})`,
  openingCashLabel: "Recommended opening cash",
  planBadgeSafe: "Higher-risk plan",
  planBadgeBalanced: "Balanced plan",
  planBadgeCautious: "Safest plan",
  riskLevelSet: "Set risk level:",
  riskSafe80: "80% higher risk",
  riskBalanced90: "90% balanced",
  riskCautious95: "95% safest",
  planShortfall: "Shortfall with plan:",
  habitBefore: "With old habit:",
  scaleLess: "← Less (Teal)",
  scaleBase: "0 (base)",
  scaleMore: "More (Amber) →",
  impactUp: "up",
  impactDown: "down",
  impactNeutral: "neutral",
  noAgentMatch: "No agents match",
  lostCountUnit: (n: number) => `${n}`,
  feedbackRecorded: "Your feedback has been recorded.",
  areaViewBadge: "Area view",
  areaSubheading: "Likely cash shortfalls for tomorrow and demand-shift analysis by area",
  agentShortfallList: "Agent shortfall risk list",
  areaAgentCount: (id: string, n: number) => `Area ${id} • ${n} agents`,
  redBorderLegend: "Red border = high risk (≥ 30%)",
  sortBy: "Sort:",
  riskTime: (h: number) => `Time: ${h < 12 ? "morning" : h < 15 ? "midday" : h < 18 ? "afternoon" : h < 20 ? "evening" : "night"} ${h}:00`,
  shortfallProb: "Shortfall probability",
  cashShortfall: "Cash shortfall",
  normal: "Normal",
  cashShortfallRisk: "Cash shortfall risk",
  normalState: "Normal state",
  week: "Week",
  demandBdt: "Demand (BDT)",
  lostTransactionsLabel: "Lost transactions",
  chartTapHint: "Tap a bar in the chart to switch to that area.",
  evidenceBadge: "Evaluation-based evidence",
  evidenceSubheading2: "No made-up numbers — every result is measured against hidden ground truth.",
  kpiDetectorF1: "Stock-out detector F1",
  kpiLightgbm: "LightGBM model",
  kpiCalibration: "Forecast calibration (P10–P90)",
  kpiCoverage: "Coverage rate",
  kpiTarget80: "Target 80.0%",
  kpiLostDemand: "Lost demand (30-day simulation)",
  kpiVsHabit: "CashReady vs habit",
  kpiCommissionSaved: "Commission saved (30 days)",
  kpiTotalSaved: "Total savings",
  evalEvidenceTitle: "Evaluation evidence",
  evalEvidenceDesc: "Comparative statistics of the model's decision process and algorithm-based capability.",
  errorLevel: "Error level",
  chartSummary: "Chart summary",
  meanDeviationBdt: "Mean deviation (BDT)",
  pipelineTitle: "CashReady end-to-end pipeline architecture",
  recoverySummary: "Naive observation has 71.9% error and mean correction 69.7%, while the CashReady recovery model brings it down to 68.3% (lower is better).",
  forecastSummary: "MAE is 2,892 BDT in busy urban markets, 2,378 BDT in peri-urban and 1,809 BDT in rural areas; in all cases the quantile forecast captures the swings in customer demand.",

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
