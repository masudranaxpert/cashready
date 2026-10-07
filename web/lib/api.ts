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

const API_BASE_URL = "/api-backend";
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
    throw new Error(message || "Failed to load data");
  }
}

/**
 * GET /agents?area_id=A01
 */
export async function getAgents(areaId?: string): Promise<Agent[]> {
  if (isRealApiConfigured()) {
    try {
      const query = areaId ? `?area_id=${encodeURIComponent(areaId)}` : "";
      return await fetchFromApi<Agent[]>(`/agents${query}`);
    } catch (err) {
      console.warn("API unavailable, falling back to local data:", err);
    }
  }

  // Fallback to local data
  if (areaId) {
    return MOCK_AGENTS.filter((a) => a.area_id === areaId);
  }
  return MOCK_AGENTS;
}

/**
 * GET /areas
 */
export async function getAreas(): Promise<Area[]> {
  if (isRealApiConfigured()) {
    try {
      return await fetchFromApi<Area[]>("/areas");
    } catch (err) {
      console.warn("API unavailable, falling back to local data:", err);
    }
  }
  return MOCK_AREAS;
}

/**
 * GET /agents/{id}/plan?date=YYYY-MM-DD&risk=0.9
 */
export async function getAgentPlan(
  agentId: string,
  date: string = DEMO_DATE,
  risk: RiskLevel = "0.9"
): Promise<AgentPlan> {
  if (isRealApiConfigured()) {
    try {
      const res = await fetchFromApi<AgentPlan>(
        `/agents/${encodeURIComponent(agentId)}/plan?date=${encodeURIComponent(date)}&risk=${encodeURIComponent(risk)}`
      );

      const byLevel = (res as { opening_cash_by_level?: Record<string, number> }).opening_cash_by_level;
      const rawOpening = typeof res.opening_cash === "object" && res.opening_cash !== null ? (res.opening_cash as Record<string, number>)[risk] : res.opening_cash;
      const opening_cash = (byLevel?.[risk] ?? Number(rawOpening)) || 60000;

      return {
        ...res,
        opening_cash,
        opening_cash_by_level: byLevel,
        selected_risk: risk,
      };
    } catch (err) {
      console.warn("API unavailable, falling back to local plan:", err);
    }
  }

  return getMockAgentPlan(agentId, date, risk);
}

/**
 * GET /agents/{id}/lost-demand?week=YYYY-Www
 */
export async function getAgentLostDemand(
  agentId: string,
  week: string = DEMO_WEEK
): Promise<AgentLostDemand> {
  if (isRealApiConfigured()) {
    try {
      return await fetchFromApi<AgentLostDemand>(
        `/agents/${encodeURIComponent(agentId)}/lost-demand?week=${encodeURIComponent(week)}`
      );
    } catch (err) {
      console.warn("API unavailable, falling back to local lost demand:", err);
    }
  }
  return getMockAgentLostDemand(agentId, week);
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
    // Handle demo deployments where endpoint is unconfigured.
    if (res.status === 404 || res.status === 405) {
      console.warn("Demo: feedback endpoint not available in this deployment");
      return { ok: false, demo_only: true };
    }
    throw new Error(`Feedback failed with status ${res.status}`);
  } catch (err: unknown) {
    console.error("Feedback error:", err);
    throw new Error("Failed to submit feedback");
  }
}

/**
 * GET /areas/{area_id}/risk?date=YYYY-MM-DD
 */
export async function getAreaRisk(
  areaId: string,
  date: string = DEMO_DATE
): Promise<AreaRiskResponse> {
  if (isRealApiConfigured()) {
    try {
      return await fetchFromApi<AreaRiskResponse>(
        `/areas/${encodeURIComponent(areaId)}/risk?date=${encodeURIComponent(date)}`
      );
    } catch (err) {
      console.warn("API unavailable, falling back to local area risk:", err);
    }
  }
  return getMockAreaRisk(areaId, date);
}

/**
 * GET /areas/lost-demand?week=YYYY-Www
 */
export async function getAreaLostDemand(week: string = DEMO_WEEK): Promise<AreaLostDemandResponse> {
  if (isRealApiConfigured()) {
    try {
      return await fetchFromApi<AreaLostDemandResponse>(
        `/areas/lost-demand?week=${encodeURIComponent(week)}`
      );
    } catch (err) {
      console.warn("API unavailable, falling back to local area lost demand:", err);
    }
  }
  return getMockAreaLostDemand(week);
}

/**
 * GET /metrics
 */
export async function getMetrics(): Promise<MetricsResponse> {
  if (isRealApiConfigured()) {
    try {
      return await fetchFromApi<MetricsResponse>("/metrics");
    } catch (err) {
      console.warn("API unavailable, falling back to local metrics:", err);
    }
  }
  return MOCK_METRICS;
}
