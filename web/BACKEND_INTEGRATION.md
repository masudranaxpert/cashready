# CashReady P9 — FastAPI Backend Integration & Contract Specification

This document details the exact HTTP endpoints, methods, parameters, request payloads, response schemas, and error behavior implemented in the frontend client ([web/lib/api.ts](file:///home/ajmine/CTF/cashready/web/lib/api.ts)) to communicate with the FastAPI serving layer ([api/main.py](file:///home/ajmine/CTF/cashready/api/main.py)).

---

## 1. Integration Overview & Environment Flags

The CashReady frontend operates in two distinct modes controlled by client environment variables:

| Environment Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Optional | Base URL of the FastAPI backend (e.g. `http://localhost:8000`). If omitted or empty, the frontend operates in **Full Offline Mock Mode** using pre-configured mock fixtures for judge demos. |
| `NEXT_PUBLIC_API_KEY` | Optional | Shared authentication secret sent via the `x-api-key` HTTP header. If backend environment variable `API_KEY` is configured, this header must match to prevent HTTP 401 Unauthorized. |

---

## 2. API Endpoint Specifications

### 1. Health Check
- **Endpoint**: `GET /health`
- **Purpose**: Verify backend and serving artifact availability.
- **Request Headers**:
  - `Accept: application/json`
  - `x-api-key: <KEY>` (optional)
- **Expected Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "artifacts_dir": "artifacts/serve"
  }
  ```

---

### 2. Agents List
- **Endpoint**: `GET /agents`
- **Query Parameters**:
  - `area_id` *(string, optional)*: Filter agents by area (e.g., `A01`).
- **Request Headers**:
  - `Accept: application/json`
  - `x-api-key: <KEY>` (optional)
- **Expected Response (200 OK)**:
  ```json
  [
    {
      "agent_id": "T0039",
      "area_id": "A01",
      "area_type": "urban_market",
      "lat": 23.8103,
      "lon": 90.4125,
      "is_new": false
    }
  ]
  ```

---

### 3. Areas List
- **Endpoint**: `GET /areas`
- **Purpose**: Retrieve distinct area identifiers and density types for navigation and selectors.
- **Request Headers**:
  - `Accept: application/json`
  - `x-api-key: <KEY>` (optional)
- **Expected Response (200 OK)**:
  ```json
  [
    { "area_id": "A00", "area_type": "rural" },
    { "area_id": "A01", "area_type": "urban_market" },
    { "area_id": "A02", "area_type": "peri_urban" },
    { "area_id": "A03", "area_type": "rural" }
  ]
  ```

---

### 4. Agent Liquidity Plan
- **Endpoint**: `GET /agents/{agent_id}/plan`
- **Path Parameters**:
  - `agent_id` *(string, required)*: e.g. `T0039`
- **Query Parameters**:
  - `date` *(string, required, regex `^\d{4}-\d{2}-\d{2}$`)*: e.g. `2026-10-02`
  - `risk` *(string, optional, default `"0.9"`)*: e.g. `"0.8"`, `"0.9"`, or `"0.95"`
- **Request Headers**:
  - `Accept: application/json`
  - `x-api-key: <KEY>` (optional)
- **Expected Response (200 OK)**:
  ```json
  {
    "date": "2026-10-02",
    "agent_id": "T0039",
    "opening_cash": 7813,
    "stockout_prob_plan": {
      "0.8": 0.15,
      "0.9": 0.10,
      "0.95": 0.05
    },
    "stockout_prob_habit": {
      "0.8": 0.35,
      "0.9": 0.28,
      "0.95": 0.18
    },
    "risk_hour": 18,
    "reasons": [
      { "key": "payment", "label_bn": "ডিজিটালে সরে যাওয়া", "impact": 0.438 },
      { "key": "nbr_out_amt", "label_bn": "পাশের এলাকার চাপ", "impact": 0.198 },
      { "key": "day_of_month", "label_bn": "মাসের তারিখ", "impact": 0.192 }
    ],
    "message_bn": "আজ সকালে 7,813 টাকা নগদ রাখুন। সবচেয়ে ঝুঁকির সময় বিকেল 18টা-এর পর। কারণ: ডিজিটালে সরে যাওয়া, পাশের এলাকার চাপ"
  }
  ```
- **Frontend Scaling Adapter**:
  - If the backend returns base cash for 90%, the frontend automatically scales opening cash by `0.86×` (80% safe) or `1.18×` (95% cautious) and adjusts `message_bn` accordingly.

---

### 5. Agent Lost Demand (Weekly History)
- **Endpoint**: `GET /agents/{agent_id}/lost-demand`
- **Path Parameters**:
  - `agent_id` *(string, required)*: e.g. `T0039`
- **Query Parameters**:
  - `week` *(string, required, regex `^\d{4}-W\d{2}$`)*: e.g. `2026-W40`
- **Request Headers**:
  - `Accept: application/json`
  - `x-api-key: <KEY>` (optional)
- **Expected Response (200 OK)**:
  ```json
  {
    "week": "2026-W40",
    "agent_id": "T0039",
    "lost_count": 48.0,
    "lost_amount": 26974.0,
    "lost_commission": 486.0
  }
  ```

---

### 6. Area Daily Risk
- **Endpoint**: `GET /areas/{area_id}/risk`
- **Path Parameters**:
  - `area_id` *(string, required)*: e.g. `A01`
- **Query Parameters**:
  - `date` *(string, required, regex `^\d{4}-\d{2}-\d{2}$`)*: e.g. `2026-10-02`
- **Request Headers**:
  - `Accept: application/json`
  - `x-api-key: <KEY>` (optional)
- **Expected Response (200 OK)**:
  ```json
  {
    "date": "2026-10-02",
    "area_id": "A01",
    "agents": [
      { "agent_id": "T0039", "stockout_prob_habit": 1.0, "risk_hour": 18 },
      { "agent_id": "T0115", "stockout_prob_habit": 0.999, "risk_hour": 20 },
      { "agent_id": "T0225", "stockout_prob_habit": 0.999, "risk_hour": 21 },
      { "agent_id": "T0037", "stockout_prob_habit": 0.999, "risk_hour": 19 },
      { "agent_id": "T0241", "stockout_prob_habit": 0.999, "risk_hour": 19 }
    ]
  }
  ```

---

### 7. Area Weekly Lost Demand
- **Endpoint**: `GET /areas/lost-demand`
- **Query Parameters**:
  - `week` *(string, required, regex `^\d{4}-W\d{2}$`)*: e.g. `2026-W40`
- **Request Headers**:
  - `Accept: application/json`
  - `x-api-key: <KEY>` (optional)
- **Expected Response (200 OK)**:
  ```json
  {
    "week": "2026-W40",
    "areas": {
      "A00": { "lost_count": 616.0, "lost_amount": 283176.0, "demand_shift": 0 },
      "A01": { "lost_count": 1560.9, "lost_amount": 843092.0, "demand_shift": 0 },
      "A04": { "lost_count": 312.0, "lost_amount": 146836.0, "demand_shift": 1 }
    }
  }
  ```

---

### 8. Global Evidence & Evaluation Metrics
- **Endpoint**: `GET /metrics`
- **Request Headers**:
  - `Accept: application/json`
  - `x-api-key: <KEY>` (optional)
- **Expected Response (200 OK)**:
  ```json
  {
    "forecast_metrics": {
      "p50_mae_bdt": 2133.6,
      "naive_mae_bdt": 1983.7,
      "pinball_mean": 688.4,
      "coverage_p10_p90": 0.8263,
      "target_coverage": 0.8,
      "mae_by_area_type": {
        "urban_market": 2892.1,
        "peri_urban": 2377.9,
        "rural": 1808.7
      }
    },
    "detector_metrics": {
      "lgbm": { "f1_macro": 0.7852 },
      "hmm": { "f1_macro": 0.6553 }
    },
    "recovery_metrics": {
      "amount_mae_pct": {
        "naive_observed": 71.87,
        "mean_correction": 69.74,
        "cashready_recovery": 68.29
      }
    },
    "business_sim_metrics": {
      "habit_policy": { "lost_pct": 18.1 },
      "cashready_policy": { "lost_pct": 1.36 },
      "commission_saved_bdt": 1062799.0
    }
  }
  ```

---

### 9. Agent Feedback Submission *(Optional Enhancement)*
- **Endpoint**: `POST /agents/{agent_id}/feedback`
- **Path Parameters**:
  - `agent_id` *(string, required)*: e.g. `T0039`
- **Request Headers**:
  - `Content-Type: application/json`
  - `x-api-key: <KEY>` (optional)
- **Request Body**:
  ```json
  {
    "helpful": true,
    "comment": "আজ সকালে পর্যাপ্ত ক্যাশ পেয়েছি"
  }
  ```
- **Expected Response (200 OK or 201 Created)**:
  ```json
  {
    "ok": true
  }
  ```
- **Fallback Note**: In commit `15ca5ad`, the backend teammate removed this endpoint to simplify demo serving. The frontend client catches HTTP 404/405 and gracefully returns `{ ok: true }` without crashing or showing an error modal during presentations.

---

## 3. Backend Teammate Integration Checklist

When deploying or testing with the live FastAPI service:

1. **CORS Configuration**: Ensure `FRONTEND_ORIGIN` in `api/main.py` permits the frontend origin (defaults to `*`).
2. **Artifact Directory**: Verify `ARTIFACTS_DIR` points to `artifacts/serve/` containing `agents.json`, `metrics.json`, `plans/2026-10-02.json`, `area_risk/2026-10-02.json`, and `lost_demand/2026-W40.json`.
3. **API Key Sync**: If `API_KEY` is set in the backend environment, configure `NEXT_PUBLIC_API_KEY` in the frontend `.env.local` to match.
4. **Vercel / Production Deployment**: Set `NEXT_PUBLIC_API_URL=https://api.yourdomain.com` in project settings. Leave unset for standalone demo mode.
