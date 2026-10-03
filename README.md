# CashReady — AI Liquidity Planner for MFS Agents

> **Track 05 (DIU CPC × upay):** Automated Liquidity Management for Mobile Financial Services Agents.

CashReady is an intelligent liquidity planning and demand recovery engine designed for Mobile Financial Services (MFS) retail agents across Bangladesh.

When an MFS agent runs out of physical cash or digital float, walk-in customers are turned away without a transaction record. The central platform never directly observes this unserved volume (**censored demand**). CashReady leverages only platform transaction telemetry to detect stock-out states, recover hidden demand, forecast hourly quantile cash requirements, recommend calibrated morning opening balances, and explain recommendations through SHAP drivers in clear Bangla.

---

## 1. Features

- **Unobserved Stock-Out Detection**: Differentiates normal operations, cash stock-outs, float stock-outs, and store closures directly from transaction flow anomalies without dedicated hardware.
- **Censored Demand Recovery**: Recovers unobserved customer demand using LightGBM regression calibrated on verified clean operating windows, protected by an automatic digital demand-shift guard.
- **Strict Causal Day-Ahead Quantile Forecasting**: Generates P10, P50, and P90 hourly cash-out projections using strictly causal features known the evening prior (calendar shocks, agent-hour historical lags, regional velocities).
- **Calibrated Morning Opening Cash Allocation**: Implements a continuous newsvendor optimization model recommending opening cash across 3 distinct service levels:
  - **80% Service Level**: *"ঝুঁকি বেশি"* (Higher capital turnover, moderate stock-out risk).
  - **90% Service Level**: *"ভারসাম্য"* (Balanced default operational safety).
  - **95% Service Level**: *"সবচেয়ে নিরাপদ"* (Maximal stock-out protection for high-volume agents).
- **Deterministic SHAP Explanations**: Extracts top-3 feature attribution factors per agent-day and converts them into natural Bangla and English advisory messages. Zero generative hallucination in the mathematical path.
- **Bilingual Production Dashboard**: Responsive Next.js interface providing dedicated views for field agents, area distribution managers, and executive audit evidence.

---

## 2. How the AI Works

```
Raw Transaction Stream (e-Money Logs)
          │
          ▼
1. Feature Panel ──────────► Lags, Rolling Means, Calendar Shocks, Area Clustering
          │
          ▼
2. Stock-Out Detector ─────► Multiclass Classifier (Normal / Cash Stockout / Float / Closed)
          │
          ▼
3. Demand Recovery ────────► Censored Hours Uplift: Rec = Obs + P(Stockout) × (Pred - Obs)
          │
          ▼
4. Quantile Forecast ──────► Day-Ahead Pinball Loss (P10 / P50 / P90) on Recovered Demand
          │
          ▼
5. Business Optimizer ─────► Cumulative Day Need → Morning Opening Cash (80%, 90%, 95%)
          │
          ▼
6. SHAP Explainer ─────────► Feature Attributions → Deterministic Bangla Advisory Template
```

1. **Detection**: Extracts hourly arrival densities and transaction failure spikes. LightGBM detects unannounced stock-outs and separates them from genuine shop closures.
2. **Recovery**: Identifies clean historical operating hours ($P(\text{normal}) \ge 0.8$) to train an unconstrained demand estimator. Uplift is applied selectively where cash stock-outs occur ($P \ge 0.5$) with a digital payment migration cap.
3. **Forecast**: Constructs a full agent $\times$ day $\times$ hour grid with historical lags (lag 1d, lag 7d, trailing 7d/28d means). Quantile regression estimates upper and lower bounds of cash velocity.
4. **Optimization**: Integrates quantile distributions across the 14-hour operating day to compute cumulative daily cash needs at each target service level, rounded to BDT 1,000 increments.
5. **Explainability**: Evaluates TreeExplainer SHAP values on day-ahead features and maps top drivers to pre-compiled linguistic explanations.

---

## 3. Technology Stack

- **Machine Learning & Pipeline**: Python 3.11, LightGBM, SHAP, Scikit-Learn, NumPy, Pandas, PyArrow, SciPy.
- **Backend Serving API**: FastAPI, Uvicorn, Pydantic, Starlette.
- **Frontend Application**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Infrastructure & Containerization**: Docker, Docker Compose, NextDeploy CLI (`nd`).

---

## 4. Requirements & Environment

- **Python**: `3.11+`
- **Node.js**: `20+` (npm 10+)
- **Operating System**: Linux (Ubuntu 22.04 LTS recommended), macOS, or Windows via WSL2.

### Environment Variables Table

| Variable | Scope | Description | Sample / Placeholder |
|---|---|---|---|
| `API_KEY` | Backend | Shared secret key for API authorization | `your_backend_api_key_here` |
| `FRONTEND_ORIGIN` | Backend | Permitted CORS origin for frontend | `http://localhost:3000` |
| `ARTIFACTS_DIR` | Backend | Path to generated serving artifacts | `artifacts/serve` |
| `PORT` | Backend | Internal container binding port | `8100` |
| `NEXT_PUBLIC_API_URL` | Frontend | Base URL of the FastAPI backend service | `http://localhost:8100` |
| `NEXT_PUBLIC_API_KEY` | Frontend | Public API key matching backend | `your_backend_api_key_here` |
| `HOST_PORT` | Docker | Host port mapped to backend API | `8100` |
| `WEB_HOST_PORT` | Docker | Host port mapped to frontend UI | `8200` |

---

## 5. Installation & Setup

### Clone Repository
```bash
git clone https://github.com/masudranax/cashready.git
cd cashready
```

### Python Backend & Pipeline Setup
```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend Setup
```bash
cd web
npm install
cd ..
```

---

## 6. Execution & Build Commands

### Running with Docker Compose (Recommended for Production)
```bash
# Build and run both backend API and frontend UI containers
docker compose up --build -d

# Check running status and health
docker compose ps
```

### Running Locally (Development Mode)
```bash
# 1. Generate synthetic transaction logs and ground truth
make data

# 2. Execute full ML pipeline (detect, recover, forecast, optimize, export)
make pipeline

# 3. Start backend API service (runs on http://localhost:8100)
PORT=8100 make api

# 4. In a separate terminal, run the Next.js frontend
cd web
NEXT_PUBLIC_API_URL=http://localhost:8100 npm run dev
```

---

## 7. Live URLs

- **Frontend Application (Bilingual Next.js)**: [http://204.136.10.31:8200/agent](http://204.136.10.31:8200/agent)
- **Backend Serving API (FastAPI Healthcheck)**: [http://204.136.10.31:8100/health](http://204.136.10.31:8100/health)
- **Area Distribution View**: [http://204.136.10.31:8200/area](http://204.136.10.31:8200/area)
- **Audit & Evidence View**: [http://204.136.10.31:8200/evidence](http://204.136.10.31:8200/evidence)

---

## 8. Automated Testing & Verification

### Running Automated Test Suites

```bash
# Run Python backend API & schema tests
make test
# or: .venv/bin/python -m pytest tests/ -v

# Run Frontend contract and mock verification tests
npm --prefix web test
```

### Manual UI Verification Steps

1. **Agent Liquidity View (`/agent`)**:
   - Verify opening cash recommendation in large BDT currency format.
   - Switch 3-way risk toggle between **৮০% ঝুঁকি বেশি**, **৯০% ভারসাম্য**, and **৯৫% সবচেয়ে নিরাপদ**; observe opening cash and shortfall probabilities adapt dynamically.
   - Inspect SHAP explanation badges (positive impact in amber, mitigating impact in teal).
   - Test user feedback buttons (হ্যাঁ / না); confirm feedback submission or honest demo banner.
2. **Area Distribution View (`/area`)**:
   - Select different areas from the dropdown; observe agent risk ranking.
   - Confirm red border indicator on agents with shortfall risk $\ge 30\%$.
   - Review weekly lost customer demand bar charts and digital payment shift indicators.
3. **Evidence & Audit View (`/evidence`)**:
   - Verify KPI summary cards (F1 score, forecast calibration, lost demand reduction, commission saved).
   - Confirm censored demand recovery chart displays horizontal bars with x-axis starting strictly at 0.
   - Verify the 4-step explainability pipeline audit card.
4. **Bilingual Toggle**:
   - Toggle language button in top navigation between **বাং** and **EN**; confirm complete UI updates across all views.

---

## 9. Synthetic Data & Assumptions

Because production MFS transaction ledgers contain sensitive customer financial records, CashReady uses a mathematically rigorous simulator (`cashready/simulate.py`) parameterized by realistic Bangladesh retail characteristics:

- **Agent Topology**: 300 agents distributed across 12 geographic clusters (25% urban markets, 35% peri-urban hubs, 40% rural market points). 15 cold-start agents join midway.
- **Operating Hours**: 8:00 AM to 10:00 PM (14 trading hours daily).
- **Transaction Dynamics**: Non-homogeneous Poisson arrivals for cash-out, cash-in, and send-money. Transaction amounts follow lognormal distributions bounded by BDT 50 to 30,000.
- **Calendar & Seasonal Shocks**:
  - Weekly cycle multipliers (salary withdrawal spike of 1.4x on 1st/2nd of each month).
  - Weekly household remittance pulses (~BDT 10,000 cash-in injections).
  - Rural weekly Haat days (1.10x–1.35x transaction acceleration).
  - Severe festival stress test (Eid festival cash-out surge of 1.2x–1.5x on Days 60–64).
- **Censoring & Substitution**: Customers turned away due to cash exhaustion do not generate failed transactions. 15% attempt neighboring agents within 1 hour; up to 15% convert to merchant digital payments.
- **Economics**: MFS cash-out commission rate pegged at 1.8% (0.018); cash-in commission rate pegged at 0.25% (0.0025).

---

## 10. Honest Evaluation & Known Weaknesses

| Metric | CashReady Result | Baseline Comparison | Significance |
|---|---|---|---|
| **Detector Macro F1** | **0.7852** (all-hours: 0.6786) | Rule: 0.3989, HMM: 0.6553 | Outperforms heuristic detection by +96% |
| **Recovery MAE (Censored Amount)**| **67.76%** | Naive Observed: 71.87%, Mean: 69.74% | Reduces unobserved demand estimation error |
| **Quantile Forecast Coverage** | **84.74%** in P10–P90 | Target: 80.00% | Well-calibrated prediction interval |
| **Demand Loss (30-day simulation)**| **0.48%** lost demand | Habit Policy: 18.10% lost demand | 97.3% reduction in unserved customer demand |
| **Commission Preserved** | **BDT 1,118,330** saved | Baseline habit policy | Directly lifts agent earning potential |

### Known Limitations
1. **Cold-Start Sensitivity**: For new agents operating fewer than 7 days, historical lag features are sparse; the model reverts to area-type baseline means until trading history accumulates.
2. **Informal Cash Borrowing**: The model assumes agents rebalance through standard MFS distributor channels. Informal peer-to-peer cash borrowing between adjacent shopkeepers is unobserved in telemetry.
3. **Sudden Weather Events**: Monsoonal flooding or localized network outages that completely shut down cellular connectivity are treated as shop closures rather than liquidity crises.

---

## 11. Responsible AI & Ethical Considerations

- **Fairness Across Demographics**: Models are validated across urban, peri-urban, and rural tiers to avoid liquidity starvation in remote regions.
- **Explainability Over Black-Box Decisions**: Agents are never presented arbitrary numbers without natural-language justification. Every recommendation specifies the estimated peak risk hour and top driving factors.
- **Zero Generative Hallucination**: Large Language Models are strictly decoupled from numerical computation. All liquidity figures, probabilities, and thresholds are calculated by deterministic algorithms.
- **Agent Financial Agency**: CashReady acts as an advisory decision-support system. Agents retain complete autonomy to select conservative, balanced, or aggressive cash strategies.

---

## 12. External Resources Disclosure

- **Machine Learning & Analytics Libraries**: `lightgbm`, `shap`, `scikit-learn`, `numpy`, `pandas`, `scipy`, `pyarrow`.
- **API & Web Frameworks**: `fastapi`, `uvicorn`, `pydantic`, `next`, `react`, `tailwindcss`, `recharts`, `lucide-react`.
- **AI Coding Assistance**: Google DeepMind Antigravity IDE (agentic code assistance, refactoring, documentation structuring).

---

## 13. Team Members

- **Masud Rana** (`masudranaxpert@gmail.com`) — ML Pipeline, Statistical Modeling & Architecture Lead
- **Ajmine Adil** (`ajmineadil@gmail.com`) — Frontend Architecture, UI/UX Engineering & Integration Lead
- **Farhana Nasrin** (`farhana52@users.noreply.github.com`) — Backend Engineering, Testing & Deployment Lead
