"""Compute economic impact metrics from simulation artifacts.

Calculates preserved commission, idle capital cost, net value per agent-day
and per 1,000 agents per month under configurable interest/opportunity cost.
"""

import json
from pathlib import Path


def compute_economics(
    metrics_path: str = "artifacts/serve/metrics.json",
    annual_opportunity_cost_rate: float = 0.09,
    test_days_count: int = 30,
    agent_count: int = 300,
):
    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)

    bs = metrics.get("business_sim_metrics", {})
    total_true_demand = bs.get("total_true_demand_bdt", 352735370.0)
    habit_lost_bdt = bs.get("habit_policy", {}).get("lost_bdt", 63830138.0)
    cashready_lost_bdt = bs.get("cashready_policy", {}).get("lost_bdt", 698857.0)
    commission_saved_total = bs.get("commission_saved_bdt", 1136363.0)

    habit_mean_open = bs.get("opening_comparison", {}).get("habit_mean_opening", 40047.0)
    cr_mean_open = bs.get("opening_comparison", {}).get("cashready_mean_opening", 83750.0)
    habit_scaled_mean_open = bs.get("same_capital_comparison", {}).get("habit_mean_opening_scaled", 81370.0)

    habit_close_idle = bs.get("idle_cash_at_close_bdt", {}).get("habit_mean", 6661.0)
    habit_scaled_close_idle = bs.get("idle_cash_at_close_bdt", {}).get("habit_scaled_mean", 40180.0)
    cr_close_idle = bs.get("idle_cash_at_close_bdt", {}).get("cashready_mean", 42255.0)

    total_agent_days = agent_count * test_days_count

    # Commission preserved
    comm_saved_per_agent_day = commission_saved_total / total_agent_days
    comm_saved_per_1000_month = comm_saved_per_agent_day * 1000 * 30

    # Opportunity cost of idle capital at close (daily rate = annual_rate / 365)
    daily_cost_rate = annual_opportunity_cost_rate / 365.0
    idle_diff_vs_habit = cr_close_idle - habit_close_idle
    idle_cost_per_agent_day = idle_diff_vs_habit * daily_cost_rate
    idle_cost_per_1000_month = idle_cost_per_agent_day * 1000 * 30

    # Net value created for agent
    net_value_per_agent_day = comm_saved_per_agent_day - idle_cost_per_agent_day
    net_value_per_1000_month = comm_saved_per_1000_month - idle_cost_per_1000_month

    # Capital-matched scenario (same capital allocation)
    idle_diff_scaled = cr_close_idle - habit_scaled_close_idle
    idle_cost_scaled_per_agent_day = idle_diff_scaled * daily_cost_rate
    net_value_scaled_per_agent_day = comm_saved_per_agent_day - idle_cost_scaled_per_agent_day
    net_value_scaled_per_1000_month = comm_saved_per_1000_month - (idle_cost_scaled_per_agent_day * 1000 * 30)

    # Customer & upay value metrics
    recovered_demand_volume = habit_lost_bdt - cashready_lost_bdt
    avg_txn_size = 1000.0  # assumed (illustrative); see cashready/config.py
    completed_txns_preserved = int(recovered_demand_volume / avg_txn_size)
    completed_txns_per_agent_day = completed_txns_preserved / total_agent_days
    completed_txns_per_1000_month = completed_txns_per_agent_day * 1000 * 30

    # upay revenue preserved (assuming upay share is ~0.4% platform margin)
    upay_margin_rate = 0.004
    upay_revenue_preserved_total = recovered_demand_volume * upay_margin_rate
    upay_revenue_per_1000_month = (upay_revenue_preserved_total / total_agent_days) * 1000 * 30

    results = {
        "assumptions": {
            "annual_opportunity_cost_rate": annual_opportunity_cost_rate,
            "daily_opportunity_cost_rate": daily_cost_rate,
            "test_window_days": test_days_count,
            "agent_count": agent_count,
            "total_agent_days": total_agent_days,
            "cashout_commission_rate": 0.018,
            "avg_txn_size_bdt": avg_txn_size,
            "upay_platform_margin_rate": upay_margin_rate,
        },
        "per_agent_day": {
            "commission_preserved_bdt": round(comm_saved_per_agent_day, 2),
            "idle_capital_cost_bdt": round(idle_cost_per_agent_day, 2),
            "net_economic_value_bdt": round(net_value_per_agent_day, 2),
            "completed_cashouts_count": round(completed_txns_per_agent_day, 1),
        },
        "per_1000_agents_month": {
            "commission_preserved_bdt": round(comm_saved_per_1000_month, 2),
            "idle_capital_cost_bdt": round(idle_cost_per_1000_month, 2),
            "net_economic_value_bdt": round(net_value_per_1000_month, 2),
            "completed_cashouts_count": int(completed_txns_per_1000_month),
            "upay_revenue_retained_bdt": round(upay_revenue_per_1000_month, 2),
        },
        "capital_matched_scenario": {
            "idle_cost_per_agent_day_bdt": round(idle_cost_scaled_per_agent_day, 2),
            "net_value_per_agent_day_bdt": round(net_value_scaled_per_agent_day, 2),
            "net_value_per_1000_month_bdt": round(net_value_scaled_per_1000_month, 2),
        },
    }
    return results


if __name__ == "__main__":
    res = compute_economics()
    print(json.dumps(res, indent=2))
