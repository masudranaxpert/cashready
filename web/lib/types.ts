export interface Agent {
  agent_id: string;
  area_id: string;
  area_type: string;
  lat: number;
  lon: number;
  is_new: boolean;
}

export interface Area {
  area_id: string;
  area_type: string;
}

export interface Reason {
  key: string;
  label_bn: string;
  impact: number;
}

export type RiskLevel = "0.8" | "0.9" | "0.95";

export interface AgentPlan {
  date: string;
  agent_id: string;
  opening_cash: number;
  stockout_prob_plan: Record<RiskLevel | string, number>;
  stockout_prob_habit: Record<RiskLevel | string, number>;
  risk_hour: number;
  reasons: Reason[];
  message_bn: string;
  message_en?: string;
  selected_risk?: RiskLevel;
}

export interface AgentLostDemand {
  week: string;
  agent_id: string;
  lost_count: number;
  lost_amount: number;
  lost_commission: number;
}

export interface FeedbackPayload {
  helpful: boolean;
  comment?: string;
}

export interface FeedbackResponse {
  ok: boolean;
}

export interface AreaAgentRisk {
  agent_id: string;
  stockout_prob_habit: number;
  risk_hour: number;
}

export interface AreaRiskResponse {
  date: string;
  area_id: string;
  agents: AreaAgentRisk[];
}

export interface AreaLostDemandItem {
  lost_count: number;
  lost_amount: number;
  demand_shift: number;
}

export interface AreaLostDemandResponse {
  week: string;
  areas: Record<string, AreaLostDemandItem>;
}

export interface MetricsResponse {
  detector_metrics: {
    rule?: { f1_macro: number; f1_cash_stockout: number };
    hmm?: { f1_macro: number; f1_cash_stockout: number };
    lgbm?: { f1_macro: number; f1_cash_stockout: number };
    f1_macro?: number;
    f1_cash_stockout?: number;
    best?: string;
  };
  recovery_metrics: {
    amount_mae_pct: {
      naive_observed: number;
      mean_correction: number;
      cashready_recovery: number;
    };
    count_mae_pct?: {
      naive_observed: number;
      mean_correction: number;
      cashready_recovery: number;
    };
    censored_hours?: number;
    total_estimated_lost_bdt?: number;
    demand_shift_area_weeks?: number;
  };
  forecast_metrics: {
    p50_mae_bdt: number;
    naive_mae_bdt: number;
    pinball_mean?: number;
    coverage_p10_p90: number;
    target_coverage?: number;
    mae_by_area_type: Record<string, number>;
  };
  business_sim_metrics: {
    habit_policy: {
      lost_bdt?: number;
      lost_pct: number;
    };
    cashready_policy: {
      lost_bdt?: number;
      lost_pct: number;
    };
    commission_saved_bdt: number;
    opening_comparison?: {
      habit_mean_opening: number;
      cashready_mean_opening: number;
      opening_ratio: number;
    };
  };
}
