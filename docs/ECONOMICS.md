# CashReady Unit Economics & Business Value Model

This document details the financial model, unit economics, and multi-stakeholder value creation of CashReady for the **upay** MFS ecosystem. All figures are programmatically computed from production evaluation artifacts (`artifacts/serve/metrics.json`) via `scripts/compute_economics.py`.

---

## 1. Executive Summary & Key Results

| Metric | Per Agent-Day | Per 1,000 Agents / Month | Notes / Methodology |
|---|---|---|---|
| **Commission Preserved** | **126.26 BDT** | **3,787,877 BDT** | 1.8% cash-out commission on recovered walk-in demand |
| **Cost of Idle Capital (9% p.a.)** | **8.78 BDT** | **263,298 BDT** | Opportunity cost on incremental closing cash buffer |
| **Net Economic Value to Agent** | **117.49 BDT** | **3,524,579 BDT** | Preserved commission minus idle capital holding cost |
| **Net Value (Capital-Matched)** | **125.75 BDT** | **3,772,527 BDT** | Under equal opening capital (scaled habit vs CashReady) |
| **Value to Customers** | **7.0 visits/day** | **210,436 visits/mo** | Completed first-visit cash-outs prevented from stock-out failure |
| **Direct upay Retained Margin** | **28.06 BDT** | **841,750 BDT** | Based on 0.40% upay platform net revenue cut |

---

## 2. Core Economic Assumptions

The financial simulation is parameterized with empirical constants from the Bangladesh retail MFS sector:

| Parameter | Value | Description / Source |
|---|---|---|
| `CASHOUT_COMMISSION_RATE` | `1.80%` | Official agent commission per completed customer cash-out |
| `OPPORTUNITY_COST_ANNUAL` | `9.00%` | Commercial bank micro-loan or treasury deposit yield in Bangladesh |
| `OPPORTUNITY_COST_DAILY` | `0.02466%` | Daily opportunity cost rate ($9.00\% / 365$) |
| `AVG_TRANSACTION_SIZE` | `1,000 BDT` | Empirical mean ticket size for walk-in retail cash-out |
| `UPAY_PLATFORM_MARGIN` | `0.40%` | Net platform revenue retention per cash-out transaction volume |
| `TEST_HORIZON_DAYS` | `30 days` | Days 60 to 89 held-out evaluation window |
| `TEST_AGENT_COUNT` | `300 agents` | 9,000 total agent-days evaluated |

---

## 3. Mathematical Derivations

### 3.1 Preserved Agent Commission
In the baseline habit policy, agents experience a $18.10\%$ unserved demand rate due to premature cash exhaustion during demand surges (salary days, haat days, festival leads):
$$\text{Lost Demand}_{\text{habit}} = 63,830,138\text{ BDT}$$
$$\text{Lost Demand}_{\text{CashReady}} = 698,857\text{ BDT}$$
$$\Delta \text{Recovered Volume} = 63,830,138 - 698,857 = 63,131,281\text{ BDT}$$

$$\text{Total Commission Saved} = \Delta \text{Recovered Volume} \times 0.018 = 1,136,363\text{ BDT}$$

Divided across 9,000 agent-days ($300 \times 30$):
$$\text{Commission Preserved}_{\text{agent-day}} = \frac{1,136,363}{9,000} = 126.26\text{ BDT / day}$$
$$\text{Commission Preserved}_{1000\text{ agents/mo}} = 126.26 \times 1,000 \times 30 = 3,787,877\text{ BDT / month}$$

### 3.2 Cost of Idle Capital
CashReady recommends calibrated morning opening balances to absorb demand shocks. At the end of the day (22:00 close), unspent cash represents idle capital:
- Mean closing cash (Habit): $6,661\text{ BDT}$
- Mean closing cash (CashReady): $42,255\text{ BDT}$
- Incremental idle cash: $\Delta \text{Idle} = 42,255 - 6,661 = 35,594\text{ BDT}$

With an annual opportunity cost of $9.0\%$:
$$\text{Daily Holding Cost} = 35,594\text{ BDT} \times \left(\frac{0.09}{365}\right) = 8.78\text{ BDT / agent-day}$$
$$\text{Monthly Holding Cost}_{1000\text{ agents}} = 8.78 \times 1,000 \times 30 = 263,298\text{ BDT / month}$$

### 3.3 Net Value to Agent
$$\text{Net Value}_{\text{agent-day}} = 126.26 - 8.78 = \mathbf{117.49\text{ BDT / day}}$$
$$\text{Net Value}_{1000\text{ agents/mo}} = 3,787,877 - 263,298 = \mathbf{3,524,579\text{ BDT / month}}$$

### 3.4 Capital-Matched Scenario
When comparing the habit policy scaled to identical opening capital ($81,370\text{ BDT}$ habit vs $83,750\text{ BDT}$ CashReady):
- Habit still fails on $1.57\%$ of volume ($5,537,945\text{ BDT}$) due to flat, static timing allocation.
- Incremental idle cash is only $42,255 - 40,180 = 2,075\text{ BDT}$.
- Idle holding cost drops to $0.51\text{ BDT / agent-day}$.
- **Net Value created**: **$125.75\text{ BDT / agent-day}$** (**$3,772,527\text{ BDT / 1,000 agents/mo}$**).

---

## 4. Multi-Stakeholder Value Proposition

### 4.1 Value to Customers (Financial Inclusion & Trust)
- **Zero Wasted Trips:** Over the 30-day evaluation, CashReady completed **210,436 first-visit cash-outs** per 1,000 agents that would have otherwise ended in agent refusal ("টাকা নাই").
- **Time and Travel Savings:** Customers in peri-urban and rural areas avoid walking to secondary agents or waiting 1–2 hours for agent rebalancing.
- **Reliability for Urgent Needs:** Critical remittances, medical bill payments, and factory salary withdrawals succeed on the first attempt.

### 4.2 Value to upay (Platform Revenue & Network Defensibility)
- **Retained Platform Margin:** At a 0.40% net revenue retention, upay directly secures **841,750 BDT / month per 1,000 active agents** in fees that would have otherwise evaporated.
- **Defense Against Competitor Substitution:** When an upay agent runs out of cash, customers immediately cross over to adjacent bKash or Nagad agents, causing permanent customer churn. CashReady protects upay market share at the retail point of presence.
- **Agent Loyalty & Active Ratio:** Higher agent earnings (+3,788 BDT/month commission) directly improve agent retention, boosting the percentage of monthly active agents across the country.

---

## 5. Reproducibility Script

To recompute these figures dynamically whenever evaluation artifacts are regenerated:
```bash
python scripts/compute_economics.py
```
Outputs complete JSON breakdown with parameterized sensitivity analysis.
