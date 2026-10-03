import type {
  Agent,
  Area,
  AgentPlan,
  AgentLostDemand,
  FeedbackPayload,
  FeedbackResponse,
  AreaRiskResponse,
  AreaLostDemandResponse,
  MetricsResponse,
  RiskLevel,
} from "./types";
import {
  DEMO_DATE,
  DEMO_WEEK,
  MOCK_AGENTS,
  MOCK_AREAS,
  MOCK_METRICS,
  getMockAgentPlan,
  getMockAgentLostDemand,
  getMockAreaRisk,
  getMockAreaLostDemand,
} from "./mock-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

/**
 * Returns true if real API is configured; false for local mock mode
 */
export function isRealApiConfigured(): boolean {
  return Boolean(API_BASE_URL && API_BASE_URL.length > 0);
}

/**
 * Helper to fetch from real API with timeout and error wrapping
 */
async function fetchFromApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("API URL not configured");
  }

  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    };

    if (API_KEY) {
      headers["x-api-key"] = API_KEY;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data as T;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    console.error(`Failed to fetch from ${endpoint}:`, message);
    throw new Error("ডেটা লোড করা যায়নি — আবার চেষ্টা করুন");
  }
}

/**
 * GET /agents?area_id=A01
 */
export async function getAgents(areaId?: string): Promise<Agent[]> {
  if (!isRealApiConfigured()) {
    // Mock mode
    if (areaId) {
      return MOCK_AGENTS.filter((a) => a.area_id === areaId);
    }
    return MOCK_AGENTS;
  }

  const query = areaId ? `?area_id=${encodeURIComponent(areaId)}` : "";
  return fetchFromApi<Agent[]>(`/agents${query}`);
}

/**
 * GET /areas
 */
export async function getAreas(): Promise<Area[]> {
  if (!isRealApiConfigured()) {
    return MOCK_AREAS;
  }
  return fetchFromApi<Area[]>("/areas");
}

/**
 * GET /agents/{id}/plan?date=YYYY-MM-DD&risk=0.9
 */
export async function getAgentPlan(
  agentId: string,
  date: string = DEMO_DATE,
  risk: RiskLevel = "0.9"
): Promise<AgentPlan> {
  if (!isRealApiConfigured()) {
    return getMockAgentPlan(agentId, date, risk);
  }

  const res = await fetchFromApi<AgentPlan>(
    `/agents/${encodeURIComponent(agentId)}/plan?date=${encodeURIComponent(date)}&risk=${encodeURIComponent(risk)}`
  );

  // AUDIT FIX: no frontend multipliers. The plan artifact carries the exact
  // opening for the requested service level (opening_cash_by_level) computed
  // by business_sim.plan_opening; fall back to opening_cash only if absent.
  const byLevel = (res as { opening_cash_by_level?: Record<string, number> }).opening_cash_by_level;
  let opening_cash: number;
  if (byLevel && byLevel[risk] != null) {
    opening_cash = byLevel[risk];
  } else if (typeof res.opening_cash === "object" && res.opening_cash !== null) {
    opening_cash = (res.opening_cash as Record<string, number>)[risk] ?? (res.opening_cash as Record<string, number>)["0.9"] ?? 60000;
  } else {
    opening_cash = Number(res.opening_cash) || 60000;
  }

  return {
    ...res,
    opening_cash,
    selected_risk: risk,
  };
}

/**
 * GET /agents/{id}/lost-demand?week=YYYY-Www
 */
export async function getAgentLostDemand(
  agentId: string,
  week: string = DEMO_WEEK
): Promise<AgentLostDemand> {
  if (!isRealApiConfigured()) {
    return getMockAgentLostDemand(agentId, week);
  }
  return fetchFromApi<AgentLostDemand>(
    `/agents/${encodeURIComponent(agentId)}/lost-demand?week=${encodeURIComponent(week)}`
  );
}

/**
 * POST /agents/{id}/feedback
 */
export async function submitAgentFeedback(
  agentId: string,
  payload: FeedbackPayload
): Promise<FeedbackResponse> {
  if (!isRealApiConfigured()) {
    // Simulate brief network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true };
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (API_KEY) {
      headers["x-api-key"] = API_KEY;
    }

    const res = await fetch(`${API_BASE_URL}/agents/${encodeURIComponent(agentId)}/feedback`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return { ok: Boolean(data?.ok ?? true) };
    }
    // AUDIT FIX: no fake success. If the demo endpoint is absent, surface it.
    if (res.status === 404 || res.status === 405) {
      console.warn("Demo: feedback endpoint not available in this deployment");
      return { ok: false, demo_only: true };
    }
    throw new Error(`Feedback failed with status ${res.status}`);
  } catch (err: unknown) {
    console.error("Feedback error:", err);
    throw new Error("মতামত জমা দেওয়া যায়নি — আবার চেষ্টা করুন");
  }
}

/**
 * GET /areas/{area_id}/risk?date=YYYY-MM-DD
 */
export async function getAreaRisk(
  areaId: string,
  date: string = DEMO_DATE
): Promise<AreaRiskResponse> {
  if (!isRealApiConfigured()) {
    return getMockAreaRisk(areaId, date);
  }
  return fetchFromApi<AreaRiskResponse>(
    `/areas/${encodeURIComponent(areaId)}/risk?date=${encodeURIComponent(date)}`
  );
}

/**
 * GET /areas/lost-demand?week=YYYY-Www
 */
export async function getAreaLostDemand(week: string = DEMO_WEEK): Promise<AreaLostDemandResponse> {
  if (!isRealApiConfigured()) {
    return getMockAreaLostDemand(week);
  }
  return fetchFromApi<AreaLostDemandResponse>(
    `/areas/lost-demand?week=${encodeURIComponent(week)}`
  );
}

/**
 * GET /metrics
 */
export async function getMetrics(): Promise<MetricsResponse> {
  if (!isRealApiConfigured()) {
    return MOCK_METRICS;
  }
  return fetchFromApi<MetricsResponse>("/metrics");
}
