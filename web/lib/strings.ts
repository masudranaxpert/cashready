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

  greetingMorning: (name: string) => string;
  greetingAfternoon: (name: string) => string;
  greetingEvening: (name: string) => string;

  liquidityStatusLabel: string;
  statusLowRisk: string;
  statusMediumRisk: string;
  statusHighRisk: string;
  recommendedOpeningCash: string;
  confirmCashBtn: string;
  cashConfirmedSuccess: string;
  changeConfirmation: string;

  stockoutRiskCardTitle: string;
  expectedShortageWindow: string;
  shortageWindowUnavailable: string;
  requestRebalancingBtn: string;
  rebalancingRequested: string;
  rebalancingLogged: string;

  whyRecommendationTitle: string;
  deterministicNotice: string;

  timelineTitle: string;
  timelineSubtitle: string;
  morningPhase: string;
  middayPhase: string;
  afternoonPhase: string;
  eveningPhase: string;
  peakShortageWarning: string;

  feedbackStockoutQuestion: string;
  feedbackUsefulQuestion: string;
  stockoutYes: string;
  stockoutNo: string;
  stockoutNotSure: string;

  managerOverviewTitle: string;
  totalAgentsLabel: string;
  normalRiskLabel: string;
  watchRiskLabel: string;
  criticalRiskLabel: string;
  agentsAttentionTitle: string;
  agentsAttentionSubtitle: string;
  rebalanceAction: string;
  statusNormal: string;
  statusWatch: string;
  statusCritical: string;
  viewAgentPlan: string;

  simulationDisclaimer: string;
  simulationDisclaimerNotice: string;
  modelTransparencyTitle: string;
  modelVersion: string;
  dataVersion: string;
  lastUpdated: string;
  explainabilityMethod: string;
};

const BN: Dict = {
  appName: "CashReady",
  appTagline: "AI Liquidity Planner for upay agents",

  navAgent: "এজেন্ট",
  navArea: "এরিয়া",
  navEvidence: "প্রমাণ",

  loading: "লোড হচ্ছে...",
  loadError: "ডেটা লোড করা যায়নি। আবার চেষ্টা করুন।",
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
  lostCountUnit: (n: number) => `আনুমানিক ${Math.round(n)} জন`,
  feedbackRecorded: "আপনার মতামত রেকর্ড করা হয়েছে।",
  areaViewBadge: "এরিয়া ভিউ",
  areaSubheading: "আগামীকালের জন্য সম্ভাব্য ক্যাশ ঘাটতি এবং এরিয়াভিত্তিক চাহিদা শিফট বিশ্লেষণ",
  agentShortfallList: "এজেন্ট ঘাটতি ঝুঁকির তালিকা",
  areaAgentCount: (id: string, n: number) => `এরিয়া ${id} • শীর্ষ ${n} জন ঝুঁকিপূর্ণ এজেন্ট`,
  redBorderLegend: "লাল সীমানা = উচ্চ ঝুঁকি (≥ ৩০%)",
  sortBy: "সাজান:",
  riskTime: (h: number) => {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const period = h < 12 ? "সকাল" : h < 15 ? "দুপুর" : h < 18 ? "বিকেল" : h < 20 ? "সন্ধ্যা" : "রাত";
    const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    const h12Bn = String(h12).split("").map((d) => bnDigits[Number(d)] ?? d).join("");
    return `সময়: ${period} ${h12Bn}টা`;
  },
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
  evidenceSubheading2: "সমস্ত ফলাফল লুকানো গ্রাউন্ড ট্রুথ এবং টেস্ট মূল্যায়নের সাথে যাচাইকৃত।",
  kpiDetectorF1: "স্টক-আউট ডিটেক্টর F1",
  kpiLightgbm: "LightGBM মডেল",
  kpiCalibration: "পূর্বাভাস ক্যালিব্রেশন (P10-P90)",
  kpiCoverage: "কভারেজ হার",
  kpiTarget80: "টার্গেট ৮০.০%",
  kpiLostDemand: "হারানো চাহিদা (৩০ দিনের সিমুলেশন)",
  kpiVsHabit: "CashReady vs অভ্যাস",
  kpiCommissionSaved: "সংরক্ষিত কমিশন (৩০ দিন)",
  kpiTotalSaved: "মোট সাশ্রয়",
  evalEvidenceTitle: "মূল্যায়ন প্রমাণ",
  evalEvidenceDesc: "বেসলাইন পদ্ধতির তুলনায় মডেলের নির্ভুলতার পরিমাপযোগ্য পরিসংখ্যান।",
  errorLevel: "ত্রুটি মাত্রা",
  chartSummary: "চার্ট সারাংশ",
  meanDeviationBdt: "গড় বিচ্যুতি (BDT)",
  pipelineTitle: "CashReady এন্ড-টু-এন্ড পাইপলাইন আর্কিটেকচার",
  recoverySummary: "সাধারণ পর্যবেক্ষণে গড় ত্রুটি ৭১.৯% এবং গড় সংশোধনে ৬৯.৭%, যা CashReady মডেলে ৬৮.৩%-এ নেমে আসে।",
  forecastSummary: "শহর বাজারে পূর্বাভাসের গড় ত্রুটি (MAE) ২,৮৯২ টাকা, উপশহরে ২,৩৭৮ টাকা এবং পল্লী অঞ্চলে ১,৮০৯ টাকা।",

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

  pipelineStep1Title: "শনাক্ত",
  pipelineStep1Desc: "HMM/LightGBM detector",
  pipelineStep2Title: "পুনরুদ্ধার",
  pipelineStep2Desc: "censored demand",
  pipelineStep3Title: "পূর্বাভাস",
  pipelineStep3Desc: "quantile",
  pipelineStep4Title: "পরিকল্পনা",
  pipelineStep4Desc: "newsvendor",

  footerSynthetic: "সব সংখ্যা সিনথেটিক ডেটার উপর মূল্যায়ন থেকে; কোড: github.com/masudranaxpert/cashready",
  footerLlmDisclosure: "স্বীকৃতি: লার্জ ল্যাঙ্গুয়েজ মডেল (LLM) কেবল সিদ্ধান্ত সারসংক্ষেপ তৈরি করে; সমস্ত গাণিতিক সংখ্যা অ্যালগরিদমের মাধ্যমে নির্ধারিত।",

  greetingMorning: (name: string) => `শুভ সকাল, ${name} 👋`,
  greetingAfternoon: (name: string) => `শুভ অপরাহ্ন, ${name} 👋`,
  greetingEvening: (name: string) => `শুভ সন্ধ্যা, ${name} 👋`,

  liquidityStatusLabel: "আজকের তারল্য অবস্থা",
  statusLowRisk: "কম ঝুঁকি",
  statusMediumRisk: "নজরদারি",
  statusHighRisk: "উচ্চ ঝুঁকি",
  recommendedOpeningCash: "প্রস্তাবিত শুরুর ক্যাশ",
  confirmCashBtn: "ক্যাশ প্রস্তুত নিশ্চিত করুন",
  cashConfirmedSuccess: "আজকের ক্যাশ প্রস্তুত নিশ্চিত হয়েছে",
  changeConfirmation: "পরিবর্তন",

  stockoutRiskCardTitle: "ক্যাশ শেষ হওয়ার ঝুঁকি",
  expectedShortageWindow: "সম্ভাব্য ঘাটতির সময়",
  shortageWindowUnavailable: "ঘাটতির সময় অনুপলব্ধ",
  requestRebalancingBtn: "রিব্যালান্স অনুরোধ",
  rebalancingRequested: "রিব্যালান্স অনুরোধ পাঠানো হয়েছে",
  rebalancingLogged: "ক্যাশ সমন্বয়ের জন্য সুপারভাইজারকে জানানো হয়েছে",

  whyRecommendationTitle: "কেন এই পরামর্শ?",
  deterministicNotice: "SHAP ভিত্তিক নিশ্চিত কারণ — কোনো অনুমানভিত্তিক তথ্য নয়",

  timelineTitle: "আজকের তারল্য টাইমলাইন",
  timelineSubtitle: "সারাদিনের লেনদেনের গতিপ্রকৃতি ও সম্ভাব্য চাপের সময়",
  morningPhase: "সকালের শুরু",
  middayPhase: "সর্বোচ্চ চাহিদার সময়",
  afternoonPhase: "স্বাভাবিক প্রবাহ",
  eveningPhase: "দিনের হিসাব সমাপ্তি",
  peakShortageWarning: "এই সময়ে ক্যাশ ঘাটতির সর্বোচ্চ ঝুঁকি রয়েছে",

  feedbackStockoutQuestion: "আজকে কি সত্যিই ক্যাশ শেষ হয়েছিল?",
  feedbackUsefulQuestion: "এই পরামর্শ কি কাজের ছিল?",
  stockoutYes: "হ্যাঁ",
  stockoutNo: "না",
  stockoutNotSure: "নিশ্চিত নই",

  managerOverviewTitle: "এজেন্ট নেটওয়ার্ক ওভারভিউ",
  totalAgentsLabel: "মোট এজেন্ট",
  normalRiskLabel: "স্বাভাবিক",
  watchRiskLabel: "নজরদারি",
  criticalRiskLabel: "সংকটপূর্ণ",
  agentsAttentionTitle: "জরুরি নজরদারি প্রয়োজন এমন এজেন্ট",
  agentsAttentionSubtitle: "ঘাটতির ঝুঁকি ৩০% বা তার বেশি—দ্রুত নগদ সমন্বয় প্রয়োজন",
  rebalanceAction: "তারল্য যাচাই",
  statusNormal: "স্বাভাবিক",
  statusWatch: "নজরদারি",
  statusCritical: "জরুরি",
  viewAgentPlan: "প্ল্যান দেখুন",

  simulationDisclaimer: "৩০ দিনের সিমুলেশন প্রাক্কলন",
  simulationDisclaimerNotice: "বিজ্ঞপ্তি: এই ফলাফলগুলো ৩০ দিনের নিয়ন্ত্রিত সিমুলেশনের মাধ্যমে পরিমাপকৃত, লাইভ প্রোডাকশন টেলিমিতি নয়।",
  modelTransparencyTitle: "মডেল ও আর্টিফ্যাক্ট স্বচ্ছতা",
  modelVersion: "মডেল ভার্সন",
  dataVersion: "ডেটা পাইপলাইন ভার্সন",
  lastUpdated: "সর্বশেষ মূল্যায়নের তারিখ",
  explainabilityMethod: "ব্যাখ্যা ইঞ্জিন",
};

const EN: Dict = {
  appName: "CashReady",
  appTagline: "AI Liquidity Planner for upay agents",

  navAgent: "Agent",
  navArea: "Area",
  navEvidence: "Evidence",

  loading: "Loading...",
  loadError: "Could not load data. Please try again.",
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
  lostCountUnit: (n: number) => `Approx. ${Math.round(n)} customers`,
  feedbackRecorded: "Your feedback has been recorded.",
  areaViewBadge: "Area view",
  areaSubheading: "Likely cash shortfalls for tomorrow and demand-shift analysis by area",
  agentShortfallList: "Agent shortfall risk list",
  areaAgentCount: (id: string, n: number) => `Area ${id} • Top ${n} risky agents`,
  redBorderLegend: "Red border = high risk (≥ 30%)",
  sortBy: "Sort:",
  riskTime: (h: number) => {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? "AM" : "PM";
    const period = h < 12 ? "morning" : h < 15 ? "midday" : h < 18 ? "afternoon" : h < 20 ? "evening" : "night";
    return `Time: ${period} ${h12}:00 ${ampm}`;
  },
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
  evidenceSubheading2: "All results are empirically measured against hidden ground truth in our 30-day evaluation.",
  kpiDetectorF1: "Stock-out detector F1",
  kpiLightgbm: "LightGBM model",
  kpiCalibration: "Forecast calibration (P10-P90)",
  kpiCoverage: "Coverage rate",
  kpiTarget80: "Target 80.0%",
  kpiLostDemand: "Lost demand (30-day simulation)",
  kpiVsHabit: "CashReady vs habit",
  kpiCommissionSaved: "Commission saved (30 days)",
  kpiTotalSaved: "Total savings",
  evalEvidenceTitle: "Evaluation evidence",
  evalEvidenceDesc: "Empirical benchmarks comparing model accuracy against baseline heuristics.",
  errorLevel: "Error level",
  chartSummary: "Chart summary",
  meanDeviationBdt: "Mean deviation (BDT)",
  pipelineTitle: "CashReady end-to-end pipeline architecture",
  recoverySummary: "Naive baseline error is 71.9% MAE and mean correction is 69.7% MAE; the CashReady recovery model reduces error to 68.3% MAE.",
  forecastSummary: "Forecast MAE is 2,892 BDT in urban markets, 2,378 BDT in peri-urban areas, and 1,809 BDT in rural areas.",

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
  footerLlmDisclosure: "Disclosure: Language models summarize advisory text; all numeric recommendations are computed algorithmically.",

  greetingMorning: (name: string) => `Good Morning, ${name} 👋`,
  greetingAfternoon: (name: string) => `Good Afternoon, ${name} 👋`,
  greetingEvening: (name: string) => `Good Evening, ${name} 👋`,

  liquidityStatusLabel: "Today's Liquidity Status",
  statusLowRisk: "LOW RISK",
  statusMediumRisk: "WATCH",
  statusHighRisk: "HIGH RISK",
  recommendedOpeningCash: "Recommended Opening Cash",
  confirmCashBtn: "Confirm Cash Available",
  cashConfirmedSuccess: "Cash Confirmed for Today",
  changeConfirmation: "Change",

  stockoutRiskCardTitle: "Cash Stock-out Risk",
  expectedShortageWindow: "Expected shortage window",
  shortageWindowUnavailable: "Shortage window unavailable",
  requestRebalancingBtn: "Request Rebalancing",
  rebalancingRequested: "Rebalance Request Sent",
  rebalancingLogged: "Area supervisor notified for liquidity support",

  whyRecommendationTitle: "Why this recommendation?",
  deterministicNotice: "Deterministic SHAP feature drivers — no generative hallucinations",

  timelineTitle: "Today's Liquidity Timeline",
  timelineSubtitle: "Expected intraday transaction rhythm & peak risk windows",
  morningPhase: "Opening & Setup",
  middayPhase: "Peak Demand Window",
  afternoonPhase: "Normal Flow",
  eveningPhase: "Reconciliation",
  peakShortageWarning: "Peak shortage risk expected around this window",

  feedbackStockoutQuestion: "Was there actually a stock-out today?",
  feedbackUsefulQuestion: "Was this recommendation useful?",
  stockoutYes: "Yes",
  stockoutNo: "No",
  stockoutNotSure: "Not Sure",

  managerOverviewTitle: "Agent Network Overview",
  totalAgentsLabel: "Total Agents",
  normalRiskLabel: "Normal",
  watchRiskLabel: "Watch",
  criticalRiskLabel: "Critical",
  agentsAttentionTitle: "Agents Requiring Attention",
  agentsAttentionSubtitle: "Agents with stock-out risk ≥ 30% requiring immediate liquidity support",
  rebalanceAction: "Review Liquidity",
  statusNormal: "Normal",
  statusWatch: "Watch",
  statusCritical: "Critical",
  viewAgentPlan: "View Plan",

  simulationDisclaimer: "30-day simulation estimate",
  simulationDisclaimerNotice: "Notice: Metrics are benchmarked via 30-day simulated evaluation against hidden ground-truth, not live production telemetry.",
  modelTransparencyTitle: "Model & Artifact Transparency",
  modelVersion: "Model Version",
  dataVersion: "Data Pipeline Version",
  lastUpdated: "Last Evaluation Date",
  explainabilityMethod: "Explainability Engine",
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
