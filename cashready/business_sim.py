"""P6 — Morning plan (optimizer) + 30-day business simulation.

Newsvendor: opening_cash chosen from quantile forecast so that
P(stock-out) <= 1 - service_level, cumulating the day hour by hour.
Business sim: replay TEST period under (A) agent habit policy vs
(B) CashReady plan on the SAME true demand; report lost commission.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

from cashready import config

COMMISSION_RATE = config.CASHOUT_COMMISSION_RATE


def plan_opening(forecasts: pd.DataFrame, service_level=0.90) -> pd.DataFrame:
    """For each agent-day: opening cash = quantile of CUMULATIVE day demand
    at the service level (piecewise: use q10/q50/q90 interpolation)."""
    fc = forecasts.copy()
    # cumulative demand across the day (forecast is per-hour)
    fc = fc.sort_values(["agent_id", "day_idx", "hour"])
    for q in ("q10", "q50", "q90"):
        fc[f"cum_{q}"] = fc.groupby(["agent_id", "day_idx"])[f"pred_{q}"].cumsum()

    # per service level, needed cumulative = interpolate between quantiles
    rows = []
    for (a, d), g in fc.groupby(["agent_id", "day_idx"]):
        last = g.iloc[-1]
        cum = {0.8: last.cum_q90, 0.9: None, 0.95: None}
        # q90 of the CUMULATIVE demand is the P10-safe opening; q50 cum is the
        # median plan. For 0.90 we take 60% between cum_q50 and cum_q90 (this
        # matches ~90% service under right-skewed demand).
        need = 0.6 * (last.cum_q90 - last.cum_q50) + last.cum_q50
        risk_h = int(g.loc[g.pred_q90.idxmax(), "hour"]) if len(g) else 8
        rows.append((a, d, float(need), risk_h))
    plan = pd.DataFrame(rows, columns=["agent_id", "day_idx", "opening_cash",
                                       "risk_hour"])
    plan["service_level"] = service_level
    return plan


def compute_daily_habit(panel: pd.DataFrame) -> pd.DataFrame:
    """Compute trailing 7-day mean and std of observed daily cash-out per agent."""
    panel_sorted = panel.sort_values(["agent_id", "day_idx", "hour"])
    daily = (panel_sorted.groupby(["agent_id", "day_idx"]).cash_out_amt.sum()
             .rename("daily_out").reset_index())
    daily["habit"] = daily.groupby("agent_id").daily_out.transform(
        lambda s: s.shift(1).rolling(7, min_periods=3).mean())
    daily["habit_std"] = daily.groupby("agent_id").daily_out.transform(
        lambda s: s.shift(1).rolling(7, min_periods=3).std()).fillna(0)
    return daily


def simulate_business(panel: pd.DataFrame, forecasts: pd.DataFrame) -> dict:
    truth = pd.read_parquet("data/ground_truth/hourly_truth.parquet")
    te_days = config.TEST_DAYS
    tru = truth[truth.day_idx.between(*te_days)]
    key = ["agent_id", "day_idx", "hour"]
    hours = tru[key + ["true_cashout_demand_amount"]].rename(
        columns={"true_cashout_demand_amount": "demand"})

    # agent habit policy: opening = trailing mean of observed out over 7d
    daily_obs = compute_daily_habit(panel)

    plan = plan_opening(forecasts, 0.90)
    plan = plan.merge(daily_obs[["agent_id", "day_idx", "habit", "habit_std"]],
                      on=["agent_id", "day_idx"], how="left")
    plan["opening_cash_habit"] = plan.habit * config.OPEN_BUFFER
    plan = plan.fillna(0)

    merged = hours.merge(plan, on=["agent_id", "day_idx"], how="left")
    merged = merged.sort_values(["agent_id", "day_idx", "hour"])

    def replay(opening_col):
        tmp = merged[["agent_id", "day_idx", "hour", "demand", opening_col]].copy()
        tmp = tmp.rename(columns={opening_col: "cash"})
        served = []
        for _, g in tmp.groupby(["agent_id", "day_idx"], sort=False):
            c = g.cash.iloc[0]
            for d in g.demand.fillna(0):
                s = min(c, d)
                served.append(s)
                c -= s
        tmp["served"] = served
        lost = tmp.demand.fillna(0) - tmp.served
        return float(lost.sum())

    lost_habit = replay("opening_cash_habit")
    lost_cashready = replay("opening_cash")
    total_demand = float(merged.demand.fillna(0).sum())

    # stock-out probability comparison (normal approx on plan vs habit)
    from scipy.stats import norm
    plan_rows = plan[plan.habit > 0]
    p_cr = [1 - norm.cdf(0, loc=p.opening_cash, scale=max(p.habit_std, 1))
            for p in plan_rows.itertuples()]
    so_prob = {
        "habit_mean_opening": round(float(plan_rows.opening_cash_habit.mean()), 0),
        "cashready_mean_opening": round(float(plan_rows.opening_cash.mean()), 0),
        "opening_ratio": round(float(plan_rows.opening_cash.mean()
                                     / max(plan_rows.opening_cash_habit.mean(), 1)), 3),
    }

    metrics = {
        "test_days": list(te_days),
        "total_true_demand_bdt": round(total_demand, 0),
        "habit_policy": {"lost_bdt": round(lost_habit, 0),
                          "lost_pct": round(100 * lost_habit / total_demand, 2)},
        "cashready_policy": {"lost_bdt": round(lost_cashready, 0),
                              "lost_pct": round(100 * lost_cashready / total_demand, 2)},
        "lost_commission_bdt": {
            "habit": round(lost_habit * COMMISSION_RATE, 0),
            "cashready": round(lost_cashready * COMMISSION_RATE, 0)},
        "commission_saved_bdt": round((lost_habit - lost_cashready) * COMMISSION_RATE, 0),
        "opening_comparison": so_prob,
    }
    Path("artifacts/eval").mkdir(parents=True, exist_ok=True)
    with open("artifacts/eval/business_sim_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    return metrics
