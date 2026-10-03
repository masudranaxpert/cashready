# CashReady: AI Liquidity Planner for MFS Agents

AI DEV FEST 2026 — Track 05: Merchant & Agent Intelligence (DIU CPC × upay)

---

## 1. Project Overview

CashReady addresses the hidden liquidity crisis in Mobile Financial Services (MFS). When an agent runs out of physical cash or e-float, transactions halt and customers leave without leaving an entry in the ledger. Because standard forecasting models train only on completed transactions, they miss this unobserved demand and consistently under-predict cash requirements during peak periods such as salary disbursements, weekly haat days, and festivals.

CashReady solves this by:
1. Detecting unrecorded stock-out periods from sudden volume drops using transaction rhythm analysis.
2. Reconstructing censored customer demand through regression over clean operational hours.
3. Forecasting day-ahead quantile demand (P10, P50, P90) using strictly causal lag features.
4. Calculating calibrated morning opening balances via newsvendor loss-ratio optimization.
5. Providing deterministic SHAP explanations in Bengali and English without generative hallucinations.

---

## 2. Features and AI Component Usage

- **Stock-Out Detection (LightGBM Classifier):** Identifies normal operation, cash stock-outs, float stock-outs, and closures without requiring hardware IoT sensors ($F_1 = 0.7852$, a 96% improvement over baseline rule heuristics).
- **Censored Demand Reconstruction:** Restores unserved walk-in transaction volume during confirmed stock-out hours ($P \ge 0.5$) using non-depleted hour regressions and digital payment substitution adjustments.
- **Day-Ahead Quantile Forecasts:** Generates P10, P50, and P90 cash demand curves for the next business day using historical lags, moving averages, and local market calendars.
- **Newsvendor Cash Calibration:** Calculates the recommended morning cash balance across three operational risk preferences: 80% (Higher Risk), 90% (Balanced), and 95% (Conservative).
- **Transparent SHAP Drivers:** Uses TreeExplainer to compute exact feature attributions for each recommendation, translated into clear technical guidance. Financial amounts are never delegated to LLMs.
- **Bilingual Operator Dashboard:** Next.js mobile-first interface featuring agent-level advisory, area-wide shortfall monitoring, and evaluation charts with instant English and Bengali language switching.

---

## 3. Technology Stack

- **Machine Learning & Pipeline:** Python 3.11, LightGBM, SHAP, Scikit-learn, PyArrow, NumPy, Pandas, SciPy.
- **Backend API:** FastAPI, Uvicorn, Pydantic v2.
- **Frontend Dashboard:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Containerization & Deployment:** Docker, Docker Compose, NextDeploy.

---

## 4. Requirements

- Python 3.11+
- Node.js 20+ and npm 10+ (for local frontend development)
- Docker Engine 24+ and Docker Compose v2 (for production deployment)
- Minimum 2 GB RAM and 2 vCPUs

---

## 5. Installation and Setup

### 5.1 Clone the Repository
```bash
git clone https://github.com/masudranaxpert/cashready.git
cd cashready
```

### 5.2 Python Environment Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 5.3 Web Dashboard Setup
```bash
cd web
npm install
cd ..
```

---

## 6. Environment Variables

Create `.env` files using the examples below. No secrets or production keys are required for evaluation.

### Backend (`.env` or process environment)
| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `8100` | Port for the FastAPI server |
| `ARTIFACTS_DIR` | `artifacts/serve` | Directory storing precomputed plans and metrics |
| `FRONTEND_ORIGIN` | `*` | Allowed CORS origins (comma-separated or `*`) |
| `API_KEY` | *(empty)* | Optional API token for header verification (`x-api-key`) |

### Frontend (`web/.env.local`)
| Variable | Default Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8100` | URL of the CashReady backend API |
| `NEXT_PUBLIC_API_KEY` | *(empty)* | Optional API key matching the backend |

---

## 7. Run and Build Commands

### Option A: Docker Compose (Single-Command Production Run)
```bash
docker compose up --build -d
```
- Web Dashboard: `http://localhost:8200`
- API & Docs: `http://localhost:8100/docs`

### Option B: Local Development Workflow
```bash
# 1. Run simulation and ML pipeline to generate artifacts
make data && make pipeline

# 2. Start FastAPI Backend Server (:8100)
PORT=8100 make api

# 3. Start Next.js Frontend Server (:3000)
cd web && NEXT_PUBLIC_API_URL=http://localhost:8100 npm run dev
```

---

## 8. Live Deployment URLs

The project is hosted and accessible at the following live endpoints:

| Service | Address | Notes |
|---|---|---|
| **Production Domain** | [https://cashready.masud-rana.me](https://cashready.masud-rana.me) | Primary custom domain |
| **Web Dashboard (Direct)** | [http://204.136.10.31:8200/agent](http://204.136.10.31:8200/agent) | Next.js interactive web app |
| **API Documentation (Swagger)** | [http://204.136.10.31:8100/docs](http://204.136.10.31:8100/docs) | Interactive OpenAPI testing |
| **API Reference (ReDoc)** | [http://204.136.10.31:8100/redoc](http://204.136.10.31:8100/redoc) | Detailed schema reference |
| **OpenAPI Schema (JSON)** | [http://204.136.10.31:8100/openapi.json](http://204.136.10.31:8100/openapi.json) | Raw OpenAPI v3.1 specification |

---

## 9. Testing Instructions

All functional layers include automated test verification suites:

```bash
# Run backend API and security validation tests (8/8 tests)
make test

# Run frontend verification and contract tests (11/11 tests)
npm --prefix web test

# Run frontend TypeScript type safety verification (0 errors)
npm --prefix web run typecheck
```

### Manual UI Verification Steps
1. Navigate to `/agent`: select an agent (e.g., `A001`), toggle risk levels between 80%, 90%, and 95%, and observe the dynamic balance adjustment and top-3 SHAP driver tags.
2. Navigate to `/area`: inspect area-level stock-out risk distributions and the high-risk threshold flag ($\ge 30\%$).
3. Navigate to `/evidence`: review the four model evaluation cards and the recovered versus observed demand chart.

---

## 10. Synthetic Data & Operational Assumptions

Because actual MFS client records are protected by strict financial privacy regulations, all training and evaluation datasets are generated by `cashready/simulate.py` using empirical parameters from Bangladesh retail banking:
- **Topology:** 300 agents distributed across 12 geographic clusters (urban markets, peri-urban centers, and rural haats) operating 14 hours daily (8:00 to 22:00).
- **Calendar Shocks:** Monthly salary windows (1st and 2nd of each month, 1.4x cash-out surge), weekly remittance cycles, and festival demand multipliers.
- **Economics:** 1.8% cash-out commission, 0.25% cash-in commission, and 15% spillover to neighboring agents during local cash depletion.
- **Evaluation:** Evaluated on a held-out 30-day partition (days 60 to 89). The model reduces unserved demand from 18.10% down to 0.48%, saving an estimated 1,118,330 BDT in agent commissions.

---

## Core Team

- **Masud Rana** — ML Pipeline, Statistical Modeling & Architecture Lead
- **Ajmine Adil** — Frontend Architecture, UI/UX Engineering & Integration Lead
- **Farhana Nasrin** — Backend Engineering, Testing & Deployment Lead
