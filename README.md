# CashReady

AI liquidity planner for mobile-money (MFS) agents of upay, Bangladesh —
AI DEV FEST 2026, Track 05 (DIU CPC × upay).

When an agent runs out of physical cash, customers are turned away and the
platform never sees that demand (**censored demand**). CashReady uses ONLY the
platform's e-money transaction log to (1) detect hourly agent states
(normal / cash stock-out / float stock-out / closed), (2) recover the lost
demand, (3) forecast next-day hourly cash-in/cash-out (quantile LightGBM),
(4) recommend each morning's opening cash & e-float (newsvendor-style), and
(5) explain every recommendation with SHAP + a short Bangla message.

All data is synthetic (`cashready/simulate.py`), with a hidden ground truth so
every claim is measurable. An LLM never produces numbers — it only rephrases
structured outputs.

## Quickstart

```bash
pip install -r requirements.txt
python -m cashready.simulate          # builds data/raw + data/ground_truth
```

## Status

- [x] P1 synthetic data simulator (300 agents, 12 areas, 90 days, 4 states, censored demand)
- [ ] P2 EDA sanity plots
- [ ] P3 stock-out detector (rule vs HMM)
- [ ] P4 censored-demand recovery
- [ ] P5 quantile forecast
- [ ] P6 optimizer + business simulation
- [ ] P7 SHAP explanations + serving artifacts
- [ ] P8 FastAPI · P9 Next.js UI · P10 deployment

## Team

- Masud — ML lead (pipeline: simulate → detect → recover → forecast → plan → explain)
- (teammate) — Engineering (FastAPI, Next.js, deployment)
