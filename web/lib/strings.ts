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

  // Same capital comparison & Pilot plan
  sameCapitalHeading: string;
  sameCapitalBadge: string;
  sameCapitalDesc: string;
  colMetric: string;
  colBaseline: string;
  colCashReady: string;
  colDifference: string;
  rowTotalOpeningCash: string;
  rowStockoutHours: string;
  rowCompletedCashouts: string;
  rowLostCashoutPct: string;
  rowAgentCommission: string;
  rowAvgIdleCash: string;
  rowRebalanceTrips: string;
  rowRebalanceCost: string;

  pilotPlanHeading: string;
  pilotPlanBadge: string;
  pilotPlanDuration: string;
  pilotPlanDurationVal: string;
  pilotPlanPairing: string;
  pilotPlanPairingVal: string;
  pilotPlanRandomization: string;
  pilotPlanRandomizationVal: string;
  pilotPlanMetrics: string;
  pilotPlanMetricsVal: string;
  pilotPlanAnalysis: string;
  pilotPlanAnalysisVal: string;
  pilotPlanGuardrails: string;
  pilotPlanGuardrailsVal: string;

  adminOnlyRestrictedTitle: string;
  adminOnlyRestrictedDesc: string;
  adminOnlyLoginAction: string;

  recallProgressionHeading: string;
  recallProgressionBadge: string;
  recallProgressionDesc: string;
  colStage: string;
  colRuleThreshold: string;
  colPrecisionVal: string;
  colRecallVal: string;
  colF1Val: string;
  colTPVal: string;
  colNotesVal: string;

  // Step 2: Confirmation form
  confirmationFormTitle: string;
  confirmationFormDesc: string;
  qCashRanOut: string;
  qRanOutYes: string;
  qRanOutNo: string;
  qFromHour: string;
  qToHour: string;
  qCustomersTurnedAway: string;
  qKeptRecommended: string;
  optKeptYes: string;
  optKeptPartly: string;
  optKeptNo: string;
  qOpeningCashKept: string;
  btnSubmitConfirmation: string;
  confirmationSuccess: string;
  badgeConfirmed: string;
  badgeEstimated: string;

  // Step 3: Agent impact card ("আমার ব্যবসার অবস্থা")
  agentImpactHeading: string;
  agentImpactSubheading: string;
  period7Days: string;
  period30Days: string;
  confirmedStockoutHours: string;
  noConfirmationsYet: string;
  estimatedStockoutHours: string;
  estimatedMissedCashouts: string;
  estimatedLostCommission: string;
  daysPlanFollowed: string;
  notReportedYet: string;

  // Step 4: Manager area impact ("এলাকার Business Impact")
  areaImpactHeading: string;
  areaImpactSubheading: string;
  totalLostCashoutBdt: string;
  totalLostCommissionBdt: string;
  areaConfirmedStockouts: string;
  agentsReportingCount: string;
  agentImpactTableTitle: string;
  colAgentId: string;
  colConfirmedStockoutHours: string;
  colEstimatedMissedAmount: string;
  colEstimatedLostCommission: string;
  colPlanAdoption: string;
  top5LiquidityNeedBadge: string;
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

  sameCapitalHeading: "একই মূলধন: বেসলাইন vs CashReady",
  sameCapitalBadge: "সিমুলেটেড প্রভাব (সিন্থেটিক ডেটা)",
  sameCapitalDesc: "সমান প্রারম্ভিক নগদ মূলধনে (পার্থক্য = ০) দুই পদ্ধতির সিমুলেশন ভিত্তিক তুলনামূলক বিশ্লেষণ।",
  colMetric: "মেট্রিক / সূচক",
  colBaseline: "বেসলাইন (অভ্যাস)",
  colCashReady: "CashReady",
  colDifference: "পার্থক্য",
  rowTotalOpeningCash: "মোট প্রারম্ভিক নগদ (টাকা)",
  rowStockoutHours: "স্টক-আউট সময় (ঘণ্টা)",
  rowCompletedCashouts: "সম্পন্ন ক্যাশ-আউট (টাকা)",
  rowLostCashoutPct: "হারানো ক্যাশ-আউট %",
  rowAgentCommission: "এজেন্ট কমিশন (ধরে নেওয়া ১.৮% হার)",
  rowAvgIdleCash: "গড় অলস নগদ (টাকা)",
  rowRebalanceTrips: "জরুরি রিব্যালেন্স ট্রিপ",
  rowRebalanceCost: "রিব্যালেন্স খরচ (১০০ টাকা/ট্রিপ)",

  pilotPlanHeading: "ফিল্ড পাইলট প্ল্যান ও ট্রায়াল ফ্রেমওয়ার্ক",
  pilotPlanBadge: "পরিকল্পিত পাইলট",
  pilotPlanDuration: "পরিকল্পিত সময়কাল",
  pilotPlanDurationVal: "২ সপ্তাহের বেসলাইন পর্যবেক্ষণ + ৪ সপ্তাহের তুলনামূলক ফিল্ড ট্রায়াল",
  pilotPlanPairing: "এজেন্ট পেয়ারিং ও ক্লাস্টার",
  pilotPlanPairingVal: "এলাকার ধরন, লেনদেন ভলিউম ও প্রারম্ভিক মূলধনের ভিত্তিতে এজেন্টদের জোড়া তৈরি",
  pilotPlanRandomization: "র‍্যান্ডম বরাদ্দ",
  pilotPlanRandomizationVal: "প্রতি জোড়ার মধ্যে লটারির মাধ্যমে একটি ট্রিটমেন্ট এবং একটি কন্ট্রোল গ্রুপে বরাদ্দ",
  pilotPlanMetrics: "মূল্যায়িত মেট্রিক্স",
  pilotPlanMetricsVal: "নিশ্চিত হওয়া স্টক-আউট ঘণ্টা, সম্পন্ন ক্যাশ-আউট, কমিশন আয়, অলস নগদ ও প্ল্যান অনুসরণের হার",
  pilotPlanAnalysis: "পরিসংখ্যানগত বিশ্লেষণ",
  pilotPlanAnalysisVal: "Difference-in-differences (DiD) এবং পেয়ার্ড কম্প্যারিজন অ্যানালাইসিস",
  pilotPlanGuardrails: "সেফটি গার্ডরেইল",
  pilotPlanGuardrailsVal: "যদি ট্রিটমেন্ট গ্রুপের স্টক-আউট কন্ট্রোল গ্রুপকে ছাড়িয়ে যায়, তবে তৎক্ষণাৎ ট্রায়াল স্থগিত",

  adminOnlyRestrictedTitle: "অ্যাডমিন অ্যাক্সেস প্রয়োজন",
  adminOnlyRestrictedDesc: "মডেল মূল্যায়ন মেট্রিক্স, ক্যাপিটাল কম্প্যারিজন এবং পাইলট প্ল্যান শুধুমাত্র বিচারক ও অ্যাডমিনের জন্য সংরক্ষিত।",
  adminOnlyLoginAction: "অ্যাডমিন হিসেবে লগইন করুন",

  recallProgressionHeading: "ক্যাশ স্টক-আউট রিকল ও অ্যাকুরেসি উন্নয়ন",
  recallProgressionBadge: "মডেল পারফরম্যান্স অগ্রগতি",
  recallProgressionDesc: "টেম্পোরাল ড্রডাউন ও পারসিস্টেন্স ফিচার এবং ভ্যালিডেশন টিউনিংয়ের মাধ্যমে ক্যাশ স্টক-আউট রিকলের ধাপভিত্তিক অগ্রগতি।",
  colStage: "মডেল ধাপ / সংস্করণ",
  colRuleThreshold: "সিদ্ধান্তের নিয়ম / থ্রেশহোল্ড",
  colPrecisionVal: "প্রিসিশন",
  colRecallVal: "রিকল",
  colF1Val: "F1 স্কোর",
  colTPVal: "সঠিক শনাক্ত (TP)",
  colNotesVal: "ফলাফল ও নোটস",

  // Step 2: Confirmation form
  confirmationFormTitle: "দৈনিক নগদ ও স্টক-আউট রিপোর্ট",
  confirmationFormDesc: "আজকের প্রকৃত ক্যাশ অবস্থা নিশ্চিত করুন (মডেলের পূর্বাভাস যাচাইয়ে সহায়তা করবে)",
  qCashRanOut: "আজকে কি নগদ ফুরিয়ে গিয়েছিল?",
  qRanOutYes: "হ্যাঁ, ফুরিয়েছিল",
  qRanOutNo: "না, নগদ পর্যাপ্ত ছিল",
  qFromHour: "কখন থেকে ঘাটতি শুরু হয়েছিল? (ঘণ্টা)",
  qToHour: "কখন পর্যন্ত ঘাটতি ছিল? (ঘণ্টা)",
  qCustomersTurnedAway: "কতজন গ্রাহক ফিরে গেছেন? (ঐচ্ছিক)",
  qKeptRecommended: "সুপারিশকৃত প্রারম্ভিক নগদ রেখেছিলেন?",
  optKeptYes: "হ্যাঁ, সম্পূর্ণ",
  optKeptPartly: "আংশিক",
  optKeptNo: "না",
  qOpeningCashKept: "প্রকৃত প্রারম্ভিক নগদ টাকা (ঐচ্ছিক)",
  btnSubmitConfirmation: "রিপোর্ট জমা দিন",
  confirmationSuccess: "ধন্যবাদ! আপনার রিপোর্ট সংরক্ষিত হয়েছে।",
  badgeConfirmed: "Confirmed by agent",
  badgeEstimated: "Simulated / estimated",

  // Step 3: Agent impact card ("আমার ব্যবসার অবস্থা")
  agentImpactHeading: "আমার ব্যবসার অবস্থা",
  agentImpactSubheading: "মডেলের পূর্বাভাস এবং আপনার নিশ্চিত করা তথ্যের ভিত্তিতে ব্যবসার প্রভাব বিশ্লেষণ",
  period7Days: "গত ৭ দিন",
  period30Days: "গত ৩০ দিন",
  confirmedStockoutHours: "নিশ্চিত স্টক-আউট সময়",
  noConfirmationsYet: "No confirmations yet",
  estimatedStockoutHours: "মডেল-আনুমানিক স্টক-আউট সময়",
  estimatedMissedCashouts: "অনুপস্থিত ক্যাশ-আউট লেনদেন",
  estimatedLostCommission: "হারানো কমিশন আয় (১.৮% হার)",
  daysPlanFollowed: "প্ল্যান অনুসরণের দিন",
  notReportedYet: "Not reported yet",

  // Step 4: Manager area impact ("এলাকার Business Impact")
  areaImpactHeading: "এলাকার Business Impact",
  areaImpactSubheading: "ম্যানেজারের এলাকার এজেন্টদের সামগ্রিক নগদ ঘাটতি ও কমিশনের প্রভাব বিশ্লেষণ",
  totalLostCashoutBdt: "মোট সম্ভাব্য হারানো ক্যাশ-আউট",
  totalLostCommissionBdt: "মোট সম্ভাব্য হারানো কমিশন",
  areaConfirmedStockouts: "মোট নিশ্চিত স্টক-আউট ঘণ্টা",
  agentsReportingCount: "রিপোর্ট প্রদানকারী এজেন্ট",
  agentImpactTableTitle: "এলাকার এজেন্টদের ব্যবসায়িক প্রভাব তালিকা",
  colAgentId: "এজেন্ট আইডি",
  colConfirmedStockoutHours: "নিশ্চিত স্টক-আউট ঘণ্টা",
  colEstimatedMissedAmount: "আনুমানিক হারানো পরিমাণ",
  colEstimatedLostCommission: "হারানো কমিশন",
  colPlanAdoption: "প্ল্যান গ্রহণ/অনুসরণ",
  top5LiquidityNeedBadge: "তারল্য সহায়তা প্রয়োজন (শীর্ষ ৫)",
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
  evidenceSubheading2: "All results are measured against hidden ground truth in our 30-day evaluation (assumed illustrative parameters; see cashready/config.py).",
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
  evalEvidenceDesc: "Rigorous benchmarks comparing model accuracy against baseline heuristics (assumed illustrative parameters; see cashready/config.py).",
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

  sameCapitalHeading: "Same capital: Baseline vs CashReady",
  sameCapitalBadge: "Simulated impact (synthetic data)",
  sameCapitalDesc: "Comparative replay under identical opening capital (difference = 0) on the held-out evaluation window.",
  colMetric: "Metric",
  colBaseline: "Baseline (Habit)",
  colCashReady: "CashReady",
  colDifference: "Difference",
  rowTotalOpeningCash: "Total opening cash (BDT)",
  rowStockoutHours: "Stock-out duration (hours)",
  rowCompletedCashouts: "Completed cash-outs (BDT)",
  rowLostCashoutPct: "Lost cash-out %",
  rowAgentCommission: "Agent commission (illustrative 1.8% assumed rate)",
  rowAvgIdleCash: "Average idle cash (BDT)",
  rowRebalanceTrips: "Emergency rebalancing trips",
  rowRebalanceCost: "Rebalancing cost (100 BDT/trip)",

  pilotPlanHeading: "Field Pilot Plan & Trial Design",
  pilotPlanBadge: "Proposed Pilot",
  pilotPlanDuration: "Timeline & Phase",
  pilotPlanDurationVal: "2-week baseline observation + 4-week active comparison trial",
  pilotPlanPairing: "Agent Cohort Pairing",
  pilotPlanPairingVal: "Agents matched in pairs by area type, historical transaction volume, and capital size",
  pilotPlanRandomization: "Random Assignment",
  pilotPlanRandomizationVal: "Random 1:1 assignment within each matched pair into treatment and control arms",
  pilotPlanMetrics: "Measured Metrics",
  pilotPlanMetricsVal: "Confirmed stock-out hours, completed cash-outs, agent commission, idle cash, and plan adoption rate",
  pilotPlanAnalysis: "Statistical Evaluation",
  pilotPlanAnalysisVal: "Difference-in-differences (DiD) estimation with paired longitudinal comparisons",
  pilotPlanGuardrails: "Safety Guardrails",
  pilotPlanGuardrailsVal: "Immediate rollback if treatment stock-out frequency exceeds the matched control group",

  adminOnlyRestrictedTitle: "Admin Access Required",
  adminOnlyRestrictedDesc: "Model verification metrics, capital-matched evaluation, and trial designs are restricted to judges and administrators.",
  adminOnlyLoginAction: "Log in as Admin",

  recallProgressionHeading: "Cash Stock-Out Recall Progression",
  recallProgressionBadge: "Model Evaluation Lift",
  recallProgressionDesc: "Step-by-step recall and detection progression from temporal features and validation-tuned operating points.",
  colStage: "Stage / Model Variant",
  colRuleThreshold: "Decision Rule / Threshold",
  colPrecisionVal: "Precision",
  colRecallVal: "Recall",
  colF1Val: "F1 Score",
  colTPVal: "True Positives (TP)",
  colNotesVal: "Key Findings & Notes",

  // Step 2: Confirmation form
  confirmationFormTitle: "Daily Stock-Out Confirmation",
  confirmationFormDesc: "Confirm today's actual cash status (helps verify algorithm forecast)",
  qCashRanOut: "Did cash run out today?",
  qRanOutYes: "Yes, ran out",
  qRanOutNo: "No, had enough",
  qFromHour: "Start of stock-out (hour, 24h)",
  qToHour: "End of stock-out (hour, 24h)",
  qCustomersTurnedAway: "Customers turned away (optional)",
  qKeptRecommended: "Did you keep recommended opening cash?",
  optKeptYes: "Yes, fully",
  optKeptPartly: "Partly",
  optKeptNo: "No",
  qOpeningCashKept: "Actual opening cash held (BDT, optional)",
  btnSubmitConfirmation: "Submit Report",
  confirmationSuccess: "Thank you! Your feedback has been confirmed and recorded.",
  badgeConfirmed: "Confirmed by agent",
  badgeEstimated: "Simulated / estimated",

  // Step 3: Agent impact card ("আমার ব্যবসার অবস্থা")
  agentImpactHeading: "My Business Impact",
  agentImpactSubheading: "Overview of your liquidity performance comparing confirmed feedback and algorithm estimates",
  period7Days: "Last 7 days",
  period30Days: "Last 30 days",
  confirmedStockoutHours: "Confirmed stock-out hours",
  noConfirmationsYet: "No confirmations yet",
  estimatedStockoutHours: "Model-estimated stock-out hours",
  estimatedMissedCashouts: "Missed cash-outs",
  estimatedLostCommission: "Estimated lost commission (1.8%)",
  daysPlanFollowed: "Days plan followed",
  notReportedYet: "Not reported yet",

  // Step 4: Manager area impact ("এলাকার Business Impact")
  areaImpactHeading: "Area Business Impact",
  areaImpactSubheading: "Aggregated liquidity loss, commission impact, and agent reports across your cluster",
  totalLostCashoutBdt: "Total estimated lost cash-out",
  totalLostCommissionBdt: "Total estimated lost commission",
  areaConfirmedStockouts: "Confirmed stock-out hours",
  agentsReportingCount: "Reporting agents",
  agentImpactTableTitle: "Area Agents Performance & Impact",
  colAgentId: "Agent ID",
  colConfirmedStockoutHours: "Confirmed stock-outs",
  colEstimatedMissedAmount: "Est. missed cash-out",
  colEstimatedLostCommission: "Est. lost commission",
  colPlanAdoption: "Plan adoption",
  top5LiquidityNeedBadge: "Liquidity Support Needed (Top 5)",
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
