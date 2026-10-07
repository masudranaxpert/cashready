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
    from scipy.stats import norm
    fc = forecasts.copy()
    # cumulative demand across the day (forecast is per-hour)
    fc = fc.sort_values(["agent_id", "day_idx", "hour"])
    for q in ("q10", "q50", "q90"):
        fc[f"cum_{q}"] = fc.groupby(["agent_id", "day_idx"])[f"pred_{q}"].cumsum()

    # z-score factor relative to q90 (z_90 = 1.28155157)
    z_sl = float(norm.ppf(service_level))
    factor = z_sl / 1.28155157

    rows = []
    for (a, d), g in fc.groupby(["agent_id", "day_idx"]):
        last = g.iloc[-1]
        sigma = max(last.cum_q90 - last.cum_q50, 0.0)
        need = max(last.cum_q50 + factor * sigma, 0.0)
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

    # Intraday cash-in flow from panel
    if "cash_in_amt" in panel.columns:
        in_flow = panel[key + ["cash_in_amt"]]
        hours = hours.merge(in_flow, on=key, how="left").fillna({"cash_in_amt": 0.0})
    else:
        hours["cash_in_amt"] = 0.0

    # Agent habit policy: opening = trailing mean of observed out over 7d
    daily_obs = compute_daily_habit(panel)

    plan = plan_opening(forecasts, 0.90)
    plan = plan.merge(daily_obs[["agent_id", "day_idx", "habit", "habit_std"]],
                      on=["agent_id", "day_idx"], how="left")
    plan["opening_cash_habit"] = (plan.habit * config.OPEN_BUFFER).fillna(0.0)

    # CashReady opening capital with rounding and minimum cash constraint
    plan["opening_cash_cr"] = plan.opening_cash.round(0).clip(lower=config.AMOUNT_MIN).fillna(config.AMOUNT_MIN)
    total_cr_capital = float(plan.opening_cash_cr.sum())

    # Baseline habit scaled so total capital matches CashReady exactly
    raw_habit = plan.opening_cash_habit.clip(lower=config.AMOUNT_MIN)
    raw_habit_sum = float(raw_habit.sum())
    if raw_habit_sum > 0:
        scaled = (raw_habit * (total_cr_capital / raw_habit_sum)).round(0).clip(lower=config.AMOUNT_MIN)
        diff = int(total_cr_capital - scaled.sum())
        if diff != 0 and len(scaled) > 0:
            scaled.loc[scaled.idxmax()] += diff
        plan["opening_cash_habit_scaled"] = scaled
    else:
        plan["opening_cash_habit_scaled"] = plan.opening_cash_cr.copy()

    merged = hours.merge(plan, on=["agent_id", "day_idx"], how="left")
    merged = merged.sort_values(["agent_id", "day_idx", "hour"])

    def simulate_policy(opening_col: str):
        tmp = merged[["agent_id", "day_idx", "hour", "demand", "cash_in_amt", opening_col]].copy()
        total_served = 0.0
        total_lost = 0.0
        stockout_hours = 0
        rebalance_trips = 0
        idle_cash_list = []

        for _, g in tmp.groupby(["agent_id", "day_idx"], sort=False):
            open_cash = float(g[opening_col].iloc[0])
            c = open_cash
            for row in g.itertuples():
                d = float(row.demand) if np.isfinite(row.demand) else 0.0
                cin = float(row.cash_in_amt) if np.isfinite(row.cash_in_amt) else 0.0
                c += cin
                if c >= d:
                    served = d
                    c -= d
                else:
                    served = c
                    lost = d - c
                    total_lost += lost
                    c = 0.0
                    stockout_hours += 1
                    rebalance_trips += 1
                    c += open_cash * config.REBALANCE_FRAC
                total_served += served
            idle_cash_list.append(c)

        tot_demand = total_served + total_lost
        lost_pct = round(100.0 * total_lost / tot_demand, 2) if tot_demand > 0 else 0.0
        return {
            "total_opening_cash": round(float(plan[opening_col].sum()), 2),
            "stockout_hours": int(stockout_hours),
            "completed_cashouts_bdt": round(float(total_served), 2),
            "lost_cashout_pct": lost_pct,
            "agent_commission_bdt": round(float(total_served * COMMISSION_RATE), 2),
            "avg_idle_cash_bdt": round(float(np.mean(idle_cash_list)), 2),
            "rebalance_trips": int(rebalance_trips),
            "rebalance_cost_bdt": round(float(rebalance_trips * config.REBALANCE_TRIP_COST), 2),
        }

    base_sim = simulate_policy("opening_cash_habit_scaled")
    cr_sim = simulate_policy("opening_cash_cr")
    unscaled_sim = simulate_policy("opening_cash_habit")

    total_demand = float(merged.demand.fillna(0).sum())

    # Stock-out probability comparison
    plan_rows = plan[plan.habit > 0]
    so_prob = {
        "habit_mean_opening": round(float(plan_rows.opening_cash_habit.mean()), 0),
        "cashready_mean_opening": round(float(plan_rows.opening_cash_cr.mean()), 0),
        "opening_ratio": round(float(plan_rows.opening_cash_cr.mean()
                                     / max(plan_rows.opening_cash_habit.mean(), 1)), 3),
    }

    metrics = {
        "test_days": list(te_days),
        "total_true_demand_bdt": round(total_demand, 0),
        "habit_policy": {
            "lost_bdt": round(unscaled_sim["total_opening_cash"] * unscaled_sim["lost_cashout_pct"] / 100.0, 0),
            "lost_pct": unscaled_sim["lost_cashout_pct"],
        },
        "cashready_policy": {
            "lost_bdt": round(cr_sim["total_opening_cash"] * cr_sim["lost_cashout_pct"] / 100.0, 0),
            "lost_pct": cr_sim["lost_cashout_pct"],
        },
        "lost_commission_bdt": {
            "habit": round(unscaled_sim["completed_cashouts_bdt"] * (unscaled_sim["lost_cashout_pct"] / 100.0) * COMMISSION_RATE, 0),
            "cashready": round(cr_sim["completed_cashouts_bdt"] * (cr_sim["lost_cashout_pct"] / 100.0) * COMMISSION_RATE, 0),
        },
        "commission_saved_bdt": round(cr_sim["agent_commission_bdt"] - unscaled_sim["agent_commission_bdt"], 0),
        "opening_comparison": so_prob,
        "same_capital_comparison": {
            "total_opening_cash": {
                "baseline": base_sim["total_opening_cash"],
                "cashready": cr_sim["total_opening_cash"],
                "difference": round(cr_sim["total_opening_cash"] - base_sim["total_opening_cash"], 2),
            },
            "stockout_hours": {
                "baseline": base_sim["stockout_hours"],
                "cashready": cr_sim["stockout_hours"],
                "difference": cr_sim["stockout_hours"] - base_sim["stockout_hours"],
            },
            "completed_cashouts_bdt": {
                "baseline": base_sim["completed_cashouts_bdt"],
                "cashready": cr_sim["completed_cashouts_bdt"],
                "difference": round(cr_sim["completed_cashouts_bdt"] - base_sim["completed_cashouts_bdt"], 2),
            },
            "lost_cashout_pct": {
                "baseline": base_sim["lost_cashout_pct"],
                "cashready": cr_sim["lost_cashout_pct"],
                "difference": round(cr_sim["lost_cashout_pct"] - base_sim["lost_cashout_pct"], 2),
            },
            "agent_commission_bdt": {
                "baseline": base_sim["agent_commission_bdt"],
                "cashready": cr_sim["agent_commission_bdt"],
                "difference": round(cr_sim["agent_commission_bdt"] - base_sim["agent_commission_bdt"], 2),
            },
            "avg_idle_cash_bdt": {
                "baseline": base_sim["avg_idle_cash_bdt"],
                "cashready": cr_sim["avg_idle_cash_bdt"],
                "difference": round(cr_sim["avg_idle_cash_bdt"] - base_sim["avg_idle_cash_bdt"], 2),
            },
            "rebalance_trips": {
                "baseline": base_sim["rebalance_trips"],
                "cashready": cr_sim["rebalance_trips"],
                "difference": cr_sim["rebalance_trips"] - base_sim["rebalance_trips"],
            },
            "rebalance_cost_bdt": {
                "baseline": base_sim["rebalance_cost_bdt"],
                "cashready": cr_sim["rebalance_cost_bdt"],
                "difference": round(cr_sim["rebalance_cost_bdt"] - base_sim["rebalance_cost_bdt"], 2),
            },
            "habit_lost_pct": base_sim["lost_cashout_pct"],
            "cashready_lost_pct": cr_sim["lost_cashout_pct"],
            "habit_mean_opening_scaled": round(base_sim["total_opening_cash"] / max(len(plan), 1), 0),
        },
        "idle_cash_at_close_bdt": {
            "habit_mean": round(unscaled_sim["avg_idle_cash_bdt"], 0),
            "habit_scaled_mean": round(base_sim["avg_idle_cash_bdt"], 0),
            "cashready_mean": round(cr_sim["avg_idle_cash_bdt"], 0),
        },
    }
    Path("artifacts/eval").mkdir(parents=True, exist_ok=True)
    with open("artifacts/eval/business_sim_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    return metrics
