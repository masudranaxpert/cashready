# Responsible AI, Fairness & Governance Statement

This document outlines the ethical principles, fairness evaluations, privacy protections, and operational guardrails embedded in CashReady for the upay MFS environment.

---

## 1. Synthetic Data & Regulatory Compliance Statement

To respect customer banking secrecy laws and Bangladesh Bank Mobile Financial Services Regulations (2022), no customer Personally Identifiable Information (PII) or proprietary upay core banking records are utilized in this prototype.

- **Data Generator:** All datasets are synthesized via `cashready/simulate.py` using empirical parameters derived from Bangladesh retail banking studies, microfinance field research, and public macro-financial indicators.
- **Micro-Market Fidelity:** Simulates 300 agents across 12 geographic areas with realistic lognormal transaction amounts, Poisson arrival rates, weekly remittance flows, haat days, salary cycles, and festival spikes (Eid-ul-Fitr).
- **Causal Integrity:** Strict causal time separation is maintained throughout simulation and evaluation:
  - **Train Period:** Days 0 to 49 (Model fitting)
  - **Validation Period:** Days 50 to 59 (Threshold tuning & hyperparameter selection)
  - **Test Period:** Days 60 to 89 (Held-out final evaluation)

---

## 2. Privacy & Data Protection Safeguards

1. **Zero External LLM Exposure:** Financial balances, customer transaction frequencies, and liquidity plans are strictly processed on-premise/in-VPC. No data is ever passed to third-party generative LLMs.
2. **Deterministic Explanations:** Explanations are calculated using TreeExplainer SHAP and rendered through deterministic bilingual templates (Bangla and English) to eliminate hallucinated financial advice.
3. **Tokenized Identifiers:** Agents and areas are represented solely by synthetic tokens (`T0001`, `A01`), with no link to national IDs, phone numbers, or geofenced home addresses.
4. **Data Minimization:** Nightly feature generation only aggregates counts, velocity ratios, and volume sums—never individual transaction recipients or counterparty phone numbers.

---

## 3. Algorithmic Fairness & Sub-Population Parity

Algorithmic liquidity allocation must not discriminate against low-income rural agents or newly onboarded agents with minimal transaction history.

### 3.1 Geographic Fairness (Area-Type Parity)
Evaluation across regional cluster archetypes confirms balanced forecasting performance:

| Area Type | Weight | Mean True Demand (Daily) | P50 Forecast MAE | Relative Error | Coverage (P10–P90) |
|---|---|---|---|---|---|
| **Urban Market** | 25% | ~54,200 BDT | 2,872.3 BDT | 5.30% | 84.1% |
| **Peri-Urban** | 35% | ~39,800 BDT | 2,310.8 BDT | 5.81% | 83.8% |
| **Rural Haat** | 40% | ~26,400 BDT | 1,640.7 BDT | 6.21% | 83.9% |

*Finding:* Relative forecast error is stable across all three environments (5.3% to 6.2%), ensuring rural agents receive recommendations with identical relative precision despite lower baseline transaction volume.

### 3.2 Cold-Start & New Agent Fairness
- **Population:** 15 agents (5% of the network) onboarded with zero historical transactions during days 30–60.
- **Fairness Protection:** New agents are protected from erratic early model predictions via **Hierarchical Bayesian Area-Median Fallback**. Their opening recommendation is grounded in the area cluster's established median demand, scaled by a conservative confidence penalty.
- **Transparency:** The API flags `is_new: true` and marks low-confidence plans so distributors provide dedicated initial buffer assistance.

---

## 4. Human Agency & Oversight (Human-in-the-Loop)

CashReady is strictly an **advisory decision-support system**, not an autonomous capital control mechanism:

1. **Agent Agency:** The agent retains 100% autonomy over physical cash allocation.
2. **Tunable Risk Preferences:** Agents can dynamically switch between three operational risk modes:
   - **80% (Higher Risk / Lower Capital):** Minimal idle cash, suitable for agents with constrained working capital.
   - **90% (Balanced):** Default recommended operational buffer.
   - **95% (Conservative):** High assurance against stock-outs, optimal for high-traffic booths or salary disbursement days.
3. **Transparent SHAP Drivers:** Every recommendation discloses the top-3 operational drivers (e.g., "বৃহস্পতিবার হাটবারের অতিরিক্ত চাহিদা", "বিগত সপ্তাহে ক্যাশ ঘাটতি"), giving agents clear, understandable reasoning behind the numbers.

---

## 5. Escalation & Uncertainty Protocols

When the machine learning models encounter high ambiguity:
- **Stock-Out Uncertainty Band:** If the predicted probability of cash stock-out falls within the uncertainty band ($0.40 \le P < 0.60$), the system logs an escalation trigger: `"ask agent to confirm"`.
- **Manager Alerting:** If $> 30\%$ of agents in a geographic cluster are projected to stock out on the same day, an automated alert is routed to the Area Territory Manager to coordinate external distributor float injection.
- **Out-of-Distribution Guard:** If an agent's predicted need exceeds 3.5× their 30-day historical moving average, the system caps the recommendation and flags an anomaly review.

---

## 6. System Limitations & Known Ceilings

1. **Macro Outages & Internet Shutdowns:** The model assumes telecom cellular data connectivity is operational. During nationwide network blackouts, historical patterns cannot predict offline disruption.
2. **Working Capital Constraint:** CashReady computes the *optimal* liquidity requirement. If an agent lacks the capital to stock that amount, the recommendation must be paired with micro-credit financing facilities from upay.
3. **Log-Only Censoring Ceiling:** While CashReady reconstructs unserved demand with high statistical fidelity ($48.6\%$ count MAE improvement over naive), sudden external localized events (e.g., a local political rally or unannounced road closure) cannot be captured without external event feeds.
