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

let usingMockFallback = false;

export function getIsUsingMockFallback(): boolean {
  return usingMockFallback;
}

export function setIsUsingMockFallback(val: boolean): void {
  usingMockFallback = val;
}

export class ApiError extends Error {
  status: number;
  isForbidden: boolean;
  isUnauthorized: boolean;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isForbidden = status === 403;
    this.isUnauthorized = status === 401;
  }
}

/**
 * Returns true if real API is configured; false for local mock mode
 */
export function isRealApiConfigured(): boolean {
  return Boolean(API_BASE_URL && API_BASE_URL.length > 0);
}

/**
 * Helper to fetch from real API with error classification and 401/403 handling
 */
async function fetchFromApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError(401, "Unauthorized (401)");
    }

    if (res.status === 403) {
      throw new ApiError(
        403,
        "আপনার এই তথ্য দেখার অনুমতি নেই / You don't have access to this resource"
      );
    }

    if (!res.ok) {
      throw new ApiError(res.status, `API error ${res.status}: ${res.statusText}`);
    }

    // Successful live response
    setIsUsingMockFallback(false);
    const data = await res.json();
    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Network error";
    console.error(`Failed to fetch from ${endpoint}:`, message);
    throw new ApiError(500, message);
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
      if (err instanceof ApiError && (err.isForbidden || err.isUnauthorized)) {
        throw err;
      }
      console.warn("API unavailable, falling back to local data:", err);
      setIsUsingMockFallback(true);
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
      if (err instanceof ApiError && (err.isForbidden || err.isUnauthorized)) {
        throw err;
      }
      console.warn("API unavailable, falling back to local data:", err);
      setIsUsingMockFallback(true);
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
      const rawOpening =
        typeof res.opening_cash === "object" && res.opening_cash !== null
          ? (res.opening_cash as Record<string, number>)[risk]
          : res.opening_cash;
      const opening_cash = (byLevel?.[risk] ?? Number(rawOpening)) || 60000;

      return {
        ...res,
        opening_cash,
        selected_risk: risk,
      };
    } catch (err) {
      if (err instanceof ApiError && (err.isForbidden || err.isUnauthorized)) {
        throw err;
      }
      console.warn("API unavailable, falling back to local plan:", err);
      setIsUsingMockFallback(true);
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
      if (err instanceof ApiError && (err.isForbidden || err.isUnauthorized)) {
        throw err;
      }
      console.warn("API unavailable, falling back to local lost demand:", err);
      setIsUsingMockFallback(true);
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
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/agents/${encodeURIComponent(agentId)}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError(401, "Unauthorized");
    }
    if (res.status === 403) {
      throw new ApiError(403, "Forbidden");
    }

    if (res.ok) {
      const data = await res.json();
      return { ok: Boolean(data?.ok ?? true) };
    }
    if (res.status === 404 || res.status === 405) {
      console.warn("Demo: feedback endpoint not available");
      return { ok: false, demo_only: true };
    }
    throw new Error(`Feedback failed with status ${res.status}`);
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
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
      if (err instanceof ApiError && (err.isForbidden || err.isUnauthorized)) {
        throw err;
      }
      console.warn("API unavailable, falling back to local area risk:", err);
      setIsUsingMockFallback(true);
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
      if (err instanceof ApiError && (err.isForbidden || err.isUnauthorized)) {
        throw err;
      }
      console.warn("API unavailable, falling back to local area lost demand:", err);
      setIsUsingMockFallback(true);
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
      if (err instanceof ApiError && (err.isForbidden || err.isUnauthorized)) {
        throw err;
      }
      console.warn("API unavailable, falling back to local metrics:", err);
      setIsUsingMockFallback(true);
    }
  }
  return MOCK_METRICS;
}
