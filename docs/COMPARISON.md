# Solution comparison and industry positioning

Mobile Financial Services (MFS) liquidity management typically relies on manual agent heuristics, field distributors, or uncorrected machine learning models.

## Comparative matrix

| Capability / Dimension | (a) Agent Habit / Last-Week Rule | (b) Manual Distributor Rebalancing (DSO/DSR) | (c) Peer Float Marketplace (e.g. IDEO.org × Tanda "Rebalance", Kenya) | (d) Plain Demand ML (No Censoring Correction) | CashReady (Track 05) |
|---|---|---|---|---|---|
| Approach Type | Naive rule-of-thumb heuristic | Reactive field logistics | Reactive peer-to-peer liquidity swapping | Supervised regression on raw logs (ARIMA / GBDT) | Causal stock-out detection, censoring correction, and quantile planning |
| Detection of Hidden Stock-outs | None (assumes 0 volume = 0 demand) | None (relies on agent phone calls) | None (agent manually registers shortage) | None (trains naively on truncated zeros) | LightGBM detector ($F_1 = 0.7852$) |
| Censored Demand Reconstruction | None | None | None | None (systematic downward bias) | Regressive recovery over clean operational hours |
| Capital Planning Nature | Static (yesterday's average × buffer) | Ad-hoc top-up during work hours | Peer search during work hours | Point forecast mean / median | Morning day-ahead quantile calibration (80%, 90%, 95%) |
| Operational Latency | 0 (but wrong amounts) | 1 to 3 hours physical travel delay | 30 to 90 min negotiation and travel | Batch daily | 07:00 AM plan delivery via SMS and web |
| Hardware / Sensor Requirements | None | Phone calls | Mobile app and GPS matching | None | None (transaction warehouse log analysis) |
| Handling Correlated Market Surges | Chronic depletion on salary/haat days | Distributors run dry or get overwhelmed | Peer agents are also empty (common shock trap) | Under-predicts recurring peaks | Area spatial features and calendar shock multipliers |
| Explainability | N/A | Subjective field intuition | None | Black-box regression | Deterministic SHAP drivers in Bengali and English |
| Stock-Out Rate in Evaluation | 18.10% (1.57% under matched capital) | > 10% in high-volume hours | Dependent on local network liquidity | ~8-12% under-forecast failures | 0.20% (98.9% stock-out reduction) |

## Comparison of alternatives

### (a) Agent habit / last-week rule
- Mechanism: The agent checks cash used on the same weekday last week or the rolling 7-day average, then adds a flat cushion (such as +5%).
- Failure mode: This approach is blind to stock-outs. If an agent stocked out at 14:00 last week and completed only 20,000 BDT before cash ran out, the habit rule records 20,000 BDT as the demand and stocks 21,000 BDT the following week, locking the booth into chronic under-stocking.
- CashReady difference: Detects the drop-off and reconstructs unobserved walk-in demand.

### (b) Manual distributor rebalancing (DSO / DSR routes)
- Mechanism: Field distributors (Distributor Sales Officers / Representatives) transport cash and e-float between agents when agents request emergency top-ups.
- Failure mode: Reactive and slow (1 to 3 hours latency). By the time the distributor arrives, walk-in customers have left or switched to a competitor. Distributors also face cash-in-transit security risks during late evening hours.
- CashReady difference: Day-ahead planning positions capital at 08:00 opening, reducing emergency mid-day rebalancing trips.

### (c) Peer float marketplaces (such as IDEO.org × Tanda in Kenya)
- Mechanism: Digital platforms match nearby agents to swap physical cash for digital e-float (such as a retail merchant with surplus cash swapping with an MFS booth with surplus float).
- Failure mode: Vulnerable to correlated liquidity shocks. On salary disbursement days or weekly rural haat days, all agents in a geographic cluster experience heavy cash-outs simultaneously. Peer matching fails when no local agent holds surplus cash.
- CashReady difference: Accounts for cluster shocks with area-level feature aggregation and flags external distributor rebalancing before markets open.

### (d) Supervised regression without censoring correction
- Mechanism: Time-series models (SARIMAX, Prophet, or standard LightGBM) trained on historical completed transaction volumes (`cashout_amount`).
- Failure mode: When cash reaches zero, recorded transactions halt. Standard regression penalizes predictions above zero during stock-out hours, training the model to predict low demand during peak periods.
- CashReady difference: Separates clean operational hours from depleted hours with a dedicated classifier, fitting demand estimation on uncensored data adjusted for cross-agent spillover.

## Log-only inference without external hardware

CashReady infers hidden stock-outs and corrects censored demand directly from transaction logs. It requires no counter cameras, hardware sensors, or manual agent telemetry.

The pipeline links transaction rhythm metrics (inter-arrival variance and velocity drop ratios) with cluster spatial spillover and asymmetric newsvendor loss calibration. This operates directly on existing telco and MFS ledger records.
