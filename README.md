# CashReady


AI liquidity planner for mobile-money (MFS) agents of upay, Bangladesh —
AI DEV FEST 2026, Track 05 (DIU CPC × upay).

When an agent runs out of physical cash, customers are turned away and the
platform never sees that demand (**censored demand**). CashReady uses ONLY
the platform's e-money transaction log to (1) detect hourly agent states
(normal / cash stock-out / float stock-out / closed), (2) recover the lost
demand, (3) forecast next-day hourly cash-in/cash-out (quantile LightGBM),
(4) recommend each morning's opening cash & e-float (newsvendor-style), and
(5) explain every recommendation with SHAP + a short Bangla message.

All data is synthetic (`cashready/simulate.py`), with a hidden ground truth
so every claim is measurable. An LLM never produces numbers — it only
rephrases structured outputs.

## Quickstart

```bash
python -m venv .venv && source .venv/bin/activate   # Python 3.11
pip install -r requirements.txt
python -m cashready.simulate        # 1. builds data/ (32s, 1.15M transactions)
python scripts/eda.py               # 2. sanity plots -> artifacts/eval/eda/
python -m cashready.detector        # 3. stock-out detector (rule vs HMM vs LightGBM)
python -m cashready.recovery        # 4. censored-demand recovery
python -m cashready.forecast        # 5. day-ahead quantile forecast
python scripts/run_pipeline.py      # 6. FULL pipeline: 1-5 + business sim + serving artifacts
```

After step 6, `artifacts/serve/` contains the JSON contract the API serves
(`agents.json`, `plans/{date}.json`, `lost_demand/{week}.json`,
`area_risk/{date}.json`, `metrics.json`).

## Results (synthetic data, 30-day test period — all reproducible)

| Component | Result | Evidence |
|---|---|---|
| Stock-out detector | **LightGBM F1 0.79** vs HMM 0.66 vs rule 0.40 | `artifacts/eval/detector_metrics.json` |
| Censored-demand recovery | **68.3% MAE** vs naive 71.9% (censored hours, amount) | `artifacts/eval/recovery_metrics.json` |
| Forecast calibration | 82.6% coverage in P10–P90 (target 80%) | `artifacts/eval/forecast_metrics.json` |
| Business impact (30 days) | habit policy loses **18.1%** of demand vs **CashReady 1.4%**; **1.06M BDT** commission saved | `artifacts/eval/business_sim_metrics.json` |

## How the AI works

1. **Detect** — hourly panel from the transaction log; LightGBM classifier
   (features: calendar, rolling history, neighbour pressure, lags) vs
   HMM and rule baselines, all sharing one output schema.
2. **Recover** — regression trained on clean hours of the train period,
   applied to censored hours to estimate demand the platform never saw;
   a demand-shift guard caps recovery where digital migration is flagged.
3. **Forecast** — LightGBM quantile regression (P10/P50/P90) for next-day
   hourly cash-out.
4. **Plan** — newsvendor-style opening cash from the cumulative demand
   quantiles; replayed against the agent's habit policy on identical true
   demand for the business simulation.
5. **Explain** — SHAP top-3 drivers per agent-day mapped to deterministic
   Bangla template messages. No LLM in the number path.

## Status

- [x] P1 synthetic data simulator (300 agents, 12 areas, 90 days, 4 states, censored demand)
- [x] P2 EDA sanity plots (`artifacts/eval/eda/`)
- [x] P3 stock-out detector — rule vs HMM vs LightGBM (best F1 0.79)
- [x] P4 censored-demand recovery + demand-shift guard
- [x] P5 day-ahead quantile forecast (P10/P50/P90)
- [x] P6 newsvendor plan + 30-day business simulation
- [x] P7 SHAP explanations + Bangla messages + serving artifacts
- [ ] P8 FastAPI serving layer *(in progress — separate branch/teammate)*
- [x] P9 Next.js UI (Bangla-first soft-shell admin for Agent, Area, and Evidence views)
- [ ] P10 deployment (Render + Vercel)
- [ ] P11 full Rulebook 6.2 README (Environment variables, Testing, Deployment URL, Responsible AI...)

## Frontend (Next.js 14 Web UI)

The frontend is located in `web/` and built with Next.js 14 App Router, TypeScript (strict), Tailwind CSS, Hind Siliguri typography, and Recharts.

### Setup and Running Locally

```bash
cd web
npm install
npm run dev        # Starts local development server at http://localhost:3000
npm run build      # Produces optimized production build
npm test           # Runs automated contract and mock verification tests
npm run lint       # Runs ESLint checks
npm run typecheck  # Verifies TypeScript types
```

### Mock Mode vs Real API

- **Standalone Mock Mode (Default)**: When `NEXT_PUBLIC_API_URL` is unset, the UI runs offline using realistic mock fixtures (20 agents across 4 areas, fixed demo date `2026-10-02`, demo week `2026-W40`, and exact evaluation metrics).
- **Real API Mode**: Set `NEXT_PUBLIC_API_URL` in `web/.env.local` to point to the FastAPI serving layer (e.g. `NEXT_PUBLIC_API_URL=http://localhost:8000`).
- *Note on backend integration*: Real backend integration connects to the teammate-owned FastAPI service (`api/main.py`), which serves artifacts from `artifacts/serve/`. Note that the feedback POST endpoint was removed in backend commit `15ca5ad` ("not needed for demo") and is handled gracefully in the frontend adapter. Real backend integration must be verified separately when the service is active.

### Available Routes

- `/agent`: Hero demo — opening cash recommendation, 3-way risk control (80%/90%/95%), SHAP reasons, lost demand, and inline feedback.
- `/area`: Area manager view — sortable risk table with red high-risk indicator (>= 0.3), weekly lost-demand bar chart, and digital migration warning badge.
- `/evidence`: Model evaluation — 4 KPI cards, recovery comparison bar chart, forecast MAE by area type, 4-step ML pipeline strip, and synthetic data disclosures.

## Project structure

```
cashready/          ML package (config, simulate, features, detector,
                    recovery, forecast, business_sim, explain, export)
scripts/            run_pipeline.py (make pipeline), eda.py
api/                FastAPI serving layer (in progress)
web/                Next.js frontend (in progress)
data/               gitignored — regenerate with python -m cashready.simulate
artifacts/eval/     committed metrics + EDA plots
artifacts/serve/    committed serving JSON (API contract)
```

## Team

- Masud — ML lead (pipeline: simulate → detect → recover → forecast → plan → explain)
- Teammate — Engineering (FastAPI serving, deployment)
- Teammate — Frontend (Next.js UI)
