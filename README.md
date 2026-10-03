# CashReady: AI Liquidity Planner for MFS Agents

> **Track 05 (DIU CPC × upay):** Automated Liquidity Management for Mobile Financial Services Agents.

CashReady predicts unobserved cash-out demand caused by cash/float stock-outs, forecasts next-day hourly demand, and recommends calibrated morning opening balances for MFS agents with deterministic SHAP explanations.

---

## Live Links

- **Frontend (Next.js):** [http://204.136.10.31:8200/agent](http://204.136.10.31:8200/agent)
- **API Health (FastAPI):** [http://204.136.10.31:8100/health](http://204.136.10.31:8100/health)

---

## API Documentation

Interactive Swagger documentation, ReDoc specification, and raw OpenAPI schemas are served directly by the FastAPI backend:

- **Swagger UI (Interactive API Docs):** [http://204.136.10.31:8100/docs](http://204.136.10.31:8100/docs)
- **ReDoc (API Reference):** [http://204.136.10.31:8100/redoc](http://204.136.10.31:8100/redoc)
- **OpenAPI Schema (JSON):** [http://204.136.10.31:8100/openapi.json](http://204.136.10.31:8100/openapi.json)

### Endpoints Overview

| Endpoint | Method | Key Parameters | Description |
|---|---|---|---|
| `/health` | `GET` | — | Service health and artifacts availability |
| `/agents` | `GET` | `area_id` (optional) | Agent list filtered by area |
| `/areas` | `GET` | — | Distinct areas and area classifications |
| `/metrics` | `GET` | — | 30-day evaluation metrics and baseline comparisons |
| `/agents/{id}/plan` | `GET` | `date` (YYYY-MM-DD), `risk` (0.8\|0.9\|0.95) | Opening cash recommendation and SHAP reasons |
| `/agents/{id}/lost-demand` | `GET` | `week` (YYYY-Www) | Weekly unserved demand and lost commission |
| `/agents/{id}/feedback` | `POST` | JSON payload `{helpful, comment}` | Agent advisory feedback audit log |
| `/areas/{id}/risk` | `GET` | `date` (YYYY-MM-DD) | Area-level agent shortfall risks |
| `/areas/lost-demand` | `GET` | `week` (YYYY-Www) | Area-wide weekly lost demand aggregation |

---

## Key Features

1. **Stock-Out Detector:** Multiclass detection (normal, cash stock-out, float stock-out, closed) from transaction patterns without extra hardware.
2. **Censored Demand Recovery:** Recovers unserved transactions using clean-hour regression gated at $P(\text{stockout}) \ge 0.5$ with digital migration guard.
3. **Day-Ahead Quantile Forecast:** Predicts P10, P50, and P90 cash needs using strictly causal features known the evening before.
4. **Calibrated Morning Cash:** Continuous newsvendor optimization recommending opening cash across 3 risk tiers (80% Higher Risk, 90% Balanced, 95% Safest).
5. **SHAP Explanations:** Explains recommendations using top-3 feature drivers in clear technical language. Calculations are deterministic and decoupled from generative LLMs.
6. **Bilingual UI:** Next.js mobile-first dashboard (Agent, Area, Evidence) with instant Bengali/English language toggle.

---

## How AI Works

```
e-Money Log ──► Causal Panel ──► Detector ──► Recovery ──► Quantile Forecast ──► Newsvendor Plan ──► SHAP Explainer
```

- **Detect:** LightGBM classifier distinguishes true stock-outs from store closures.
- **Recover:** Formula $\text{Rec} = \text{Obs} + P \times (\text{Pred} - \text{Obs})$ restores hidden walk-in demand.
- **Forecast:** Day-ahead quantile regression on recovered demand with lag 1d, lag 7d, trailing 7d/28d means.
- **Plan:** Daily cumulative need integrated into opening cash rounded to 1,000 BDT.
- **Explain:** TreeExplainer SHAP impacts mapped to deterministic advisory templates.

---

## Measured Results (30-Day Test Partition)

| Metric | CashReady | Baseline | Impact |
|---|---|---|---|
| **Detector F1** | **0.7852** (all-hours: 0.6786) | Rule: 0.3989, HMM: 0.6553 | +96% over heuristics |
| **Recovery MAE** | **67.76%** | Naive: 71.87%, Mean: 69.74% | Accurate unserved demand |
| **Forecast Calibration** | **84.74%** in P10–P90 | Target: 80.00% | Well-calibrated intervals |
| **Lost Demand** | **0.48%** | Habit Policy: 18.10% | 97.3% demand saved |
| **Commission Saved** | **1,118,330 BDT** | Habit Policy | Direct agent revenue lift |

---

## Tech Stack & Requirements

- **Stack:** Python 3.11, LightGBM, SHAP, Scikit-Learn, FastAPI, Next.js 14, TypeScript, Tailwind CSS, Docker.
- **Requirements:** Python 3.11+, Node.js 20+, Docker Compose.

### Environment Variables

| Variable | Scope | Description | Sample |
|---|---|---|---|
| `API_KEY` | Backend | Shared API key | `secret_api_key_here` |
| `FRONTEND_ORIGIN` | Backend | Allowed CORS origin | `http://localhost:3000` |
| `ARTIFACTS_DIR` | Backend | Path to serving artifacts | `artifacts/serve` |
| `PORT` | Backend | API server port | `8100` |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend URL | `http://localhost:8100` |
| `NEXT_PUBLIC_API_KEY` | Frontend | Frontend auth header | `secret_api_key_here` |
| `HOST_PORT` | Docker | Host port for API | `8100` |
| `WEB_HOST_PORT` | Docker | Host port for Web UI | `8200` |

---

## Run Commands

### Docker Compose (Production)
```bash
docker compose up --build -d
```

### Local Development
```bash
# 1. Pipeline: simulate -> detect -> recover -> forecast -> plan -> export
make data && make pipeline

# 2. Start Backend API
PORT=8100 make api

# 3. Start Frontend UI
cd web && NEXT_PUBLIC_API_URL=http://localhost:8100 npm run dev
```

---

## Testing & Verification

```bash
# Python API tests (7 tests passing)
make test

# Frontend contract & verification tests (11 tests passing)
npm --prefix web test
```

### UI Verification
- `/agent`: Check opening cash update across 80%/90%/95% risk tiers, SHAP impact tags, and feedback.
- `/area`: Check area risk table, red high-risk indicator ($\ge 30\%$), and lost demand chart.
- `/evidence`: Check 4 KPI summary cards and recovery chart with x-axis starting at 0.

---

## Synthetic Data & Assumptions

Due to MFS customer privacy, data is generated via `cashready/simulate.py` using Bangladesh retail parameters:
- **Topology:** 300 agents, 12 areas (25% urban market, 35% peri-urban, 40% rural), 14 operating hours (8:00–22:00).
- **Calendar Shocks:** Salary window (1st/2nd, 1.4x), weekly remittances (~10k BDT), Haat days, Eid surge (1.2x–1.5x on days 60–64).
- **Economics:** Cash-out commission 1.8%, cash-in commission 0.25%.
- **Censoring:** Frustrated customers leave without records; 15% spill over to neighbors, up to 15% substitute via digital payment.

---

## Responsible AI & Limitations

- **Demographic Fairness:** Validated across urban, peri-urban, and rural areas to avoid liquidity starvation.
- **Algorithmic Integrity:** Cash amounts, risk intervals, and metrics are computed algorithmically via newsvendor optimization; LLMs are decoupled from mathematical logic.
- **Limitations:** Cold-start agents (<7 days) fall back to cluster averages; informal shop-to-shop borrowing is unobserved; severe telecom outages are treated as store closures.
- **External Resources:** LightGBM, SHAP, FastAPI, Next.js, Antigravity IDE.

---

## Team

- **Masud Rana** — ML Pipeline, Statistical Modeling & Architecture Lead
- **Ajmine Adil** — Frontend Architecture, UI/UX Engineering & Integration Lead
- **Farhana Nasrin** — Backend Engineering, Testing & Deployment Lead
