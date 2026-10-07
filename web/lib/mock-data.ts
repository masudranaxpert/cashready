import type {
  Agent,
  Area,
  AgentPlan,
  AgentLostDemand,
  AreaRiskResponse,
  AreaLostDemandResponse,
  MetricsResponse,
  RiskLevel,
} from "./types";

export const DEMO_DATE = "2026-10-02";
export const DEMO_WEEK = "2026-W40";

export const MOCK_AREAS: Area[] = [
  { area_id: "A01", area_type: "urban_market" },
  { area_id: "A02", area_type: "peri_urban" },
  { area_id: "A03", area_type: "peri_urban" },
  { area_id: "A04", area_type: "rural" },
];

export const MOCK_AGENTS: Agent[] = [
  // Area A01 (Urban Market)
  { agent_id: "T0039", area_id: "A01", area_type: "urban_market", lat: 23.8103, lon: 90.4125, is_new: false },
  { agent_id: "T0115", area_id: "A01", area_type: "urban_market", lat: 23.8115, lon: 90.4132, is_new: false },
  { agent_id: "T0225", area_id: "A01", area_type: "urban_market", lat: 23.8122, lon: 90.4140, is_new: false },
  { agent_id: "T0037", area_id: "A01", area_type: "urban_market", lat: 23.8130, lon: 90.4110, is_new: true },
  { agent_id: "T0241", area_id: "A01", area_type: "urban_market", lat: 23.8142, lon: 90.4155, is_new: false },

  // Area A02 (Peri-Urban)
  { agent_id: "T0258", area_id: "A02", area_type: "peri_urban", lat: 23.7501, lon: 90.3802, is_new: false },
  { agent_id: "T0178", area_id: "A02", area_type: "peri_urban", lat: 23.7515, lon: 90.3815, is_new: false },
  { agent_id: "T0016", area_id: "A02", area_type: "peri_urban", lat: 23.7523, lon: 90.3830, is_new: false },
  { agent_id: "T0181", area_id: "A02", area_type: "peri_urban", lat: 23.7538, lon: 90.3842, is_new: false },
  { agent_id: "T0038", area_id: "A02", area_type: "peri_urban", lat: 23.7545, lon: 90.3850, is_new: true },

  // Area A03 (Peri-Urban, Digital Shift)
  { agent_id: "T0182", area_id: "A03", area_type: "peri_urban", lat: 23.7200, lon: 90.4200, is_new: false },
  { agent_id: "T0265", area_id: "A03", area_type: "peri_urban", lat: 23.7212, lon: 90.4215, is_new: false },
  { agent_id: "T0218", area_id: "A03", area_type: "peri_urban", lat: 23.7225, lon: 90.4230, is_new: false },
  { agent_id: "T0287", area_id: "A03", area_type: "peri_urban", lat: 23.7238, lon: 90.4242, is_new: false },
  { agent_id: "T0109", area_id: "A03", area_type: "peri_urban", lat: 23.7250, lon: 90.4255, is_new: false },

  // Area A04 (Rural)
  { agent_id: "T0220", area_id: "A04", area_type: "rural", lat: 23.6800, lon: 90.4800, is_new: false },
  { agent_id: "T0118", area_id: "A04", area_type: "rural", lat: 23.6815, lon: 90.4812, is_new: false },
  { agent_id: "T0251", area_id: "A04", area_type: "rural", lat: 23.6828, lon: 90.4825, is_new: false },
  { agent_id: "T0116", area_id: "A04", area_type: "rural", lat: 23.6840, lon: 90.4838, is_new: true },
  { agent_id: "T0058", area_id: "A04", area_type: "rural", lat: 23.6852, lon: 90.4850, is_new: false },
];

/** Base opening cash values mapped by agent ID */
const AGENT_BASE_CASH: Record<string, { cash: number; hour: number }> = {
  T0039: { cash: 68500, hour: 18 },
  T0115: { cash: 62400, hour: 20 },
  T0225: { cash: 54200, hour: 21 },
  T0037: { cash: 48000, hour: 19 },
  T0241: { cash: 59300, hour: 19 },
  T0258: { cash: 51200, hour: 17 },
  T0178: { cash: 46800, hour: 12 },
  T0016: { cash: 42500, hour: 12 },
  T0181: { cash: 39800, hour: 12 },
  T0038: { cash: 36500, hour: 13 },
  T0182: { cash: 64100, hour: 15 },
  T0265: { cash: 58900, hour: 18 },
  T0218: { cash: 52400, hour: 14 },
  T0287: { cash: 47200, hour: 13 },
  T0109: { cash: 43600, hour: 13 },
  T0220: { cash: 72000, hour: 16 },
  T0118: { cash: 66500, hour: 19 },
  T0251: { cash: 38400, hour: 13 },
  T0116: { cash: 34200, hour: 13 },
  T0058: { cash: 31000, hour: 12 },
};

/**
 * Generate plan for an agent given risk selection
 */
export function getMockAgentPlan(agentId: string, date: string = DEMO_DATE, risk: RiskLevel = "0.9"): AgentPlan {
  const base = AGENT_BASE_CASH[agentId] || { cash: 55000, hour: 18 };
  
  // Documented interpolation / scaling factor across risk tiers:
  // 80% (safe/conservative buffer): 0.86x of 90% base
  // 90% (balanced baseline): 1.0x
  // 95% (cautious/high buffer): 1.18x of 90% base
  let opening_cash = base.cash;
  if (risk === "0.8") {
    opening_cash = Math.round(base.cash * 0.86);
  } else if (risk === "0.95") {
    opening_cash = Math.round(base.cash * 1.18);
  }

  const reasons = [
    { key: "day_of_month", label_bn: "মাসের শেষ সপ্তাহের বেতন লেনদেন", label_en: "End-of-month salary transactions", impact: 0.32 },
    { key: "out_mean_28d", label_bn: "গত ২৮ দিনের গড় নগদ উত্তোলনের চাপ", label_en: "Average cash-out pressure over last 28 days", impact: -0.14 },
    { key: "neighbour_pressure", label_bn: "আশপাশের এজেন্টদের সম্ভাব্য ঘাটতি", label_en: "Potential shortages at neighbouring agents", impact: 0.18 },
  ];

  const formattedCash = new Intl.NumberFormat("en-US").format(opening_cash);
  const h12 = base.hour % 12 === 0 ? 12 : base.hour % 12;
  const periodBn = base.hour < 12 ? "সকাল" : base.hour < 15 ? "দুপুর" : base.hour < 18 ? "বিকেল" : base.hour < 20 ? "সন্ধ্যা" : "রাত";
  const periodEn = base.hour < 12 ? "morning" : base.hour < 15 ? "midday" : base.hour < 18 ? "afternoon" : base.hour < 20 ? "evening" : "night";
  const ampm = base.hour < 12 ? "AM" : "PM";

  return {
    date,
    agent_id: agentId,
    opening_cash,
    opening_cash_by_level: {
      "0.8": Math.round(base.cash * 0.86),
      "0.9": base.cash,
      "0.95": Math.round(base.cash * 1.18),
    },
    stockout_prob_plan: {
      "0.8": 0.15,
      "0.9": 0.10,
      "0.95": 0.05,
    },
    stockout_prob_habit: {
      "0.8": 0.35,
      "0.9": 0.28,
      "0.95": 0.18,
    },
    risk_hour: base.hour,
    reasons,
    message_bn: `আজ সকালে ${formattedCash} টাকা নগদ রাখুন। সবচেয়ে ঝুঁকির সময় ${periodBn} ${h12}টা-এর পর। কারণ: মাসের শেষ সপ্তাহের বেতন লেনদেন, আশপাশের এজেন্টদের সম্ভাব্য ঘাটতি`,
    message_en: `Keep ${formattedCash} BDT cash this morning. Highest risk ${periodEn} after ${h12}:00 ${ampm}. Because: End-of-month salary transactions, Potential shortages at neighbouring agents`,
    selected_risk: risk,
  };
}

export function getMockAgentLostDemand(agentId: string, week: string = DEMO_WEEK): AgentLostDemand {
  // Deterministic mock lost demand based on agent
  const base = AGENT_BASE_CASH[agentId]?.cash || 50000;
  const lost_count = Math.round(base / 2200);
  const lost_amount = lost_count * 1450;
  const lost_commission = Math.round(lost_amount * 0.0042);

  return {
    week,
    agent_id: agentId,
    lost_count,
    lost_amount,
    lost_commission,
  };
}

export function getMockAreaRisk(areaId: string, date: string = DEMO_DATE): AreaRiskResponse {
  const areaAgents = MOCK_AGENTS.filter((a) => a.area_id === areaId);
  const agents = areaAgents.map((a, idx) => {
    // Generate varying risk probabilities, ensuring some are >= 0.3 (high risk)
    const probs = [0.85, 0.62, 0.41, 0.24, 0.12];
    const hours = [18, 19, 20, 14, 12];
    return {
      agent_id: a.agent_id,
      stockout_prob_habit: probs[idx % probs.length],
      risk_hour: hours[idx % hours.length],
    };
  });

  return {
    date,
    area_id: areaId,
    agents,
  };
}

export function getMockAreaLostDemand(week: string = DEMO_WEEK): AreaLostDemandResponse {
  return {
    week,
    areas: {
      A01: { lost_count: 1560, lost_amount: 843092, demand_shift: 0 },
      A02: { lost_count: 1120, lost_amount: 612400, demand_shift: 0 },
      A03: { lost_count: 1890, lost_amount: 984500, demand_shift: 1 }, // Demand shifting to digital
      A04: { lost_count: 780, lost_amount: 395100, demand_shift: 0 },
    },
  };
}

export const MOCK_METRICS: MetricsResponse = {
  detector_metrics: {
    rule: { f1_macro: 0.40, f1_cash_stockout: 0.12 },
    hmm: { f1_macro: 0.66, f1_cash_stockout: 0.00 },
    lgbm: { f1_macro: 0.79, f1_cash_stockout: 0.38 },
    f1_macro: 0.79,
    best: "lgbm",
  },
  recovery_metrics: {
    amount_mae_pct: {
      naive_observed: 71.9,
      mean_correction: 69.7,
      cashready_recovery: 68.3,
    },
    count_mae_pct: {
      naive_observed: 63.5,
      mean_correction: 61.8,
      cashready_recovery: 45.9,
    },
    censored_hours: 3463,
    total_estimated_lost_bdt: 22089334,
    demand_shift_area_weeks: 19,
  },
  forecast_metrics: {
    p50_mae_bdt: 2133.6,
    naive_mae_bdt: 1983.7,
    coverage_p10_p90: 0.826,
    mae_by_area_type: {
      urban_market: 2892.1,
      peri_urban: 2377.9,
      rural: 1808.7,
    },
  },
  business_sim_metrics: {
    habit_policy: {
      lost_pct: 18.1,
      lost_bdt: 63830138,
    },
    cashready_policy: {
      lost_pct: 1.4,
      lost_bdt: 4785765,
    },
    commission_saved_bdt: 1062799,
  },
};
