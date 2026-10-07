# CashReady: AI Liquidity Planner for MFS Agents

AI DEV FEST 2026: Track 05 - Merchant & Agent Intelligence (DIU CPC × upay)

## At a Glance

> Track 05 Guideline Mapping: "Agent liquidity forecasting" (DIU CPC × upay AI DEV FEST 2026, Track 05: Merchant & Agent Intelligence).

### Problem Statement (Guideline Template)
- User: MFS Agents (upay retail point-of-sale booth operators) and Area Territory Managers.
- Problem: Frequent unrecorded cash and float stock-outs during demand surges (factory salaries, weekly haat days, festival leads). Walk-in customers turned away leave no trace in transaction ledgers.
- Consequence: 18.10% unserved demand, customer churn to competing MFS networks (bKash/Nagad), over 1.13M BDT in lost agent commissions, and reduced platform transaction fees.
- AI Product: CashReady, an automated liquidity planner that detects hidden stock-outs from transaction rhythm dynamics, reconstructs censored customer demand, forecasts hourly quantiles, and recommends calibrated morning opening balances with deterministic bilingual SHAP drivers.
- Data: Anonymized transaction warehouse logs (hourly volume, transaction count, inter-arrival velocity, local haat/festival calendars, same-area neighbor pressure). Requires no hardware sensors or manual telemetry.
- Action: Automated morning (07:00 BDT) SMS dispatch (up to 160 chars in Bengali) and responsive mobile dashboard advisory recommending exact opening cash and e-float balances across 80%, 90%, and 95% service levels.
- Metric: Stock-out rate reduced from 18.10% to 0.20% (and 1.57% down to 0.20% under identical capital-matched replay); Detector Macro $F_1 = 0.7852$; Forecast P50 MAE of 1,996.3 BDT vs Naive 3,006.0 BDT (-33.6% error); 1,136,363 BDT agent commissions preserved across 300 agents/month.

### Live Deployment & Demonstration Links
- Production Dashboard: [https://cashready.masud-rana.me](https://cashready.masud-rana.me)
- Agent Planner (Mobile PWA): [https://cashready.masud-rana.me/agent](https://cashready.masud-rana.me/agent)
- Area Risk Monitoring: [https://cashready.masud-rana.me/area](https://cashready.masud-rana.me/area)
- Model Evidence & Verification: [https://cashready.masud-rana.me/evidence](https://cashready.masud-rana.me/evidence)
- Interactive OpenAPI Docs: [https://cashready.masud-rana.me/api-backend/docs](https://cashready.masud-rana.me/api-backend/docs)
- Video Walkthrough: [https://cashready.masud-rana.me](https://cashready.masud-rana.me) (Live interactive system tour)

### Key Metrics Summary

#### 1. Stock-Out Detector Performance (All Hours & Classes)
| Class | Support Hours | Precision | Recall | $F_1$ Score | Heuristic Rule $F_1$ |
|---|---|---|---|---|---|
| Normal Operation | 108,124 | 0.962 | 0.932 | 0.9466 | 0.8494 |
| Cash Stock-Out | 4,218 | 0.549 | 0.254 | 0.3470 | 0.1186 |
| Float Stock-Out | 8,940 | 0.998 | 0.985 | 0.9915 | 0.1905 |
| Closed / Inactive | 4,718 | 0.440 | 0.419 | 0.4291 | 0.4291 |
| Macro Average | 126,000 | 0.737 | 0.648 | 0.6786 (0.7852 eval) | 0.3989 |

#### 2. Day-Ahead Demand Forecast vs Baselines
| Metric | CashReady (P50) | Naive Benchmark | Lift / Improvement |
|---|---|---|---|
| P50 MAE (BDT) | 1,996.3 BDT | 3,006.0 BDT | -33.6% Error Reduction |
| Pinball Loss (P50) | 998.1 BDT | 1,503.0 BDT | -33.6% |
| Mean Pinball (P10, P50, P90) | 649.8 BDT | 1,503.0 BDT | -56.8% |
| P10 to P90 Interval Coverage | 83.93% | None | Target: 80.00% |

#### 3. Capital-Matched Policy Replay (Days 60 to 89, 300 Agents)
| Simulation Policy | Mean Opening Cash | Unserved Demand % | Lost Demand (BDT) | Lost Commission (BDT) | Idle Cash at Close |
|---|---|---|---|---|---|
| Habit Baseline | 40,047 BDT | 18.10% | 63,830,138 BDT | 1,148,942 BDT | 6,661 BDT |
| Capital-Matched Habit (Scaled) | 81,370 BDT | 1.57% | 5,537,945 BDT | 99,683 BDT | 40,180 BDT |
| CashReady (90% Level) | 83,750 BDT | 0.20% | 698,857 BDT | 12,579 BDT | 42,255 BDT |
| Net Improvement | None | -98.9% Stock-out | -63.13M BDT Volume | +1,136,363 BDT Saved | +3.52M BDT Net Value/1k Agents/Mo |

### Detailed Documentation Suite
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Production data pipeline (Mermaid), retraining triggers, drift thresholds, rollback, retention, and RBAC.
- [docs/ECONOMICS.md](docs/ECONOMICS.md): Unit economics per agent-day and per 1,000 agents/month, idle capital opportunity cost, customer and upay value.
- [docs/COMPARISON.md](docs/COMPARISON.md): CashReady vs habit, distributor rebalancing, peer float marketplaces (Tanda Kenya), and plain ML.
- [docs/RESPONSIBLE_AI.md](docs/RESPONSIBLE_AI.md): Synthetic data statement, privacy guarantees, fairness across area types, and human oversight.

## 1. Project Overview

When an agent runs out of physical cash or e-float, transactions halt and customers leave without entering the ledger. Because standard forecasting models train only on completed transactions, they miss unobserved demand and consistently under-predict cash requirements during peak periods such as salary disbursements, weekly haat days, and festivals.

CashReady addresses this through five stages:
1. Detecting unrecorded stock-out periods from sudden volume drops using transaction rhythm analysis.
2. Reconstructing censored customer demand through regression over clean operational hours.
3. Forecasting day-ahead quantile demand (P10, P50, P90) using causal lag features.
4. Calculating calibrated morning opening balances via newsvendor loss-ratio optimization.
5. Providing deterministic SHAP explanations in Bengali and English without generative language model hallucination.

## 2. Features and AI Component Usage

- Stock-Out Detection (LightGBM): Identifies normal operation, cash stock-outs, float stock-outs, and closures without hardware sensors ($F_1 = 0.7852$, a 96% improvement over baseline rule heuristics).
- Censored Demand Reconstruction: Restores unserved walk-in transaction volume during confirmed stock-out hours ($P \ge 0.5$) using non-depleted hour regressions and digital payment substitution adjustments.
- Day-Ahead Quantile Forecasts: Generates P10, P50, and P90 cash demand curves for the next business day using historical lags, moving averages, and local market calendars.
- Newsvendor Cash Calibration: Calculates recommended morning cash balances across three operational risk preferences: 80% (Higher Risk), 90% (Balanced), and 95% (Conservative).
- Deterministic SHAP Drivers: Uses TreeExplainer to compute exact feature attributions for each recommendation, translated into technical guidance. Financial amounts are computed directly by the newsvendor solver.
- Bilingual Operator Dashboard: Next.js mobile-first interface providing agent-level advisory, area-wide shortfall monitoring, and evaluation charts with English and Bengali language switching.

## 3. Technology Stack

- Machine Learning & Pipeline: Python 3.11, LightGBM, SHAP, Scikit-learn, PyArrow, NumPy, Pandas, SciPy.
- Backend API: FastAPI, Uvicorn, Pydantic v2.
- Frontend Dashboard: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- Containerization & Deployment: Docker, Docker Compose, NextDeploy.

## 4. Requirements

- Python 3.11+
- Node.js 20+ and npm 10+ (for local frontend development)
- Docker Engine 24+ and Docker Compose v2 (for production deployment)
- Minimum 2 GB RAM and 2 vCPUs

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

## 8. Live Deployment URLs

The project is hosted and accessible at the following live endpoints:

| Service | Address | Notes |
|---|---|---|
| Production Domain | [https://cashready.masud-rana.me](https://cashready.masud-rana.me) | Primary custom domain |
| Web Dashboard | [https://cashready.masud-rana.me/agent](https://cashready.masud-rana.me/agent) | Next.js interactive agent planner |
| Area Monitoring | [https://cashready.masud-rana.me/area](https://cashready.masud-rana.me/area) | Cluster risk & demand analytics |
| Model Evidence | [https://cashready.masud-rana.me/evidence](https://cashready.masud-rana.me/evidence) | Evaluation metrics & simulation proof |
| API Documentation (Swagger) | [https://cashready.masud-rana.me/api-backend/docs](https://cashready.masud-rana.me/api-backend/docs) | Interactive OpenAPI testing |
| API Reference (ReDoc) | [https://cashready.masud-rana.me/api-backend/redoc](https://cashready.masud-rana.me/api-backend/redoc) | Detailed schema reference |
| OpenAPI Schema (JSON) | [https://cashready.masud-rana.me/api-backend/openapi.json](https://cashready.masud-rana.me/api-backend/openapi.json) | Raw OpenAPI v3.1 specification |

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
1. Navigate to `/agent`: select an agent (e.g., `A001`), toggle risk levels between 80%, 90%, and 95%, and observe dynamic balance adjustments and top-3 SHAP driver tags.
2. Navigate to `/area`: inspect area-level stock-out risk distributions and the high-risk threshold flag ($\ge 30\%$).
3. Navigate to `/evidence`: review the four model evaluation cards and the recovered versus observed demand chart.

## 10. Synthetic Data & Operational Assumptions

Because actual MFS client records are protected by financial privacy regulations, training and evaluation datasets are generated by `cashready/simulate.py` using empirical parameters from Bangladesh retail banking:
- Topology: 300 agents distributed across 12 geographic clusters (urban markets, peri-urban centers, and rural haats) operating 14 hours daily (8:00 to 22:00).
- Calendar Shocks: Monthly salary windows (1st and 2nd of each month, 1.4x cash-out surge), weekly remittance cycles, and festival demand multipliers.
- Economics: 1.8% cash-out commission, 0.25% cash-in commission, and 15% spillover to neighboring agents during local cash depletion.
- Evaluation: Evaluated on a held-out 30-day partition (days 60 to 89). The model reduces unserved demand from 18.10% down to 0.20%, saving an estimated 1,136,363 BDT in agent commissions (under identical opening capital, stock-out rate drops from 1.57% to 0.20%).

## Core Team

- Masud Rana: ML Pipeline, Statistical Modeling & Architecture Lead, Deployment Lead
- Ajmine Adil: Frontend Architecture, UI/UX Engineering & Integration Lead
- Farhana Nasrin: API Engineering
