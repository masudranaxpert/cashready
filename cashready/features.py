"""P3a — Hourly panel built from the PLATFORM LOG ONLY (no ground truth).

One row per agent-hour that the agent exists. These features are shared by
detector (P3), recovery (P4) and forecast (P5): downstream never sees truth.
"""

import numpy as np
import pandas as pd

from cashready import config

EPOCH = pd.Timestamp("2026-07-05")


def build_panel(tx_path="data/raw/transactions.parquet",
                agents_path="data/raw/agents.parquet",
                areas_path="data/raw/areas.parquet") -> pd.DataFrame:
    tx = pd.read_parquet(tx_path)
    agents = pd.read_parquet(agents_path)
    areas = pd.read_parquet(areas_path)

    tx["day_idx"] = (tx.ts - EPOCH).dt.days
    tx["hour"] = tx.ts.dt.hour

    g = tx.groupby(["agent_id", "day_idx", "hour", "type"])
    cnt = g.size().unstack(fill_value=0)
    amt = g.amount.sum().unstack(fill_value=0)
    fail = (tx[tx.status != "success"].groupby(["agent_id", "day_idx", "hour"])
            .amount.agg(["size", "sum"]).rename(
                columns={"size": "fail_count", "sum": "fail_amount"}))

    panel = cnt.join(amt, rsuffix="_amt", how="outer")
    panel = panel.join(fail, how="outer").fillna(0.0).reset_index()

    # normalize expected columns
    for c, dflt in [("cash_out", 0), ("cash_in", 0), ("send_money", 0),
                    ("payment", 0), ("cash_out_amt", 0.0), ("cash_in_amt", 0.0),
                    ("send_money_amt", 0.0), ("payment_amt", 0.0),
                    ("fail_count", 0), ("fail_amount", 0.0)]:
        if c not in panel:
            panel[c] = dflt

    panel = panel.merge(agents[["agent_id", "area_id", "is_new", "start_day"]],
                        on="agent_id")
    panel = panel.merge(areas, on="area_id")
    panel["weekday"] = (panel.day_idx + EPOCH.weekday()) % 7
    panel["day_of_month"] = (EPOCH + pd.to_timedelta(panel.day_idx, unit="D")).dt.day
    panel["salary_window"] = panel.day_of_month.isin(config.SALARY_DAYS).astype(int)
    panel["eid_window"] = panel.day_idx.between(*config.EID_DAYS).astype(int)
    panel["haat_day"] = (panel.haat_day == panel.weekday).astype(int)

    # activity & simple rolling history (per agent, causal: shift by one hour
    # within agent ordering by (day, hour))
    panel = panel.sort_values(["agent_id", "day_idx", "hour"]).reset_index(drop=True)
    by_agent = panel.groupby("agent_id", sort=False)
    panel["act_count"] = (panel.cash_in + panel.send_money + panel.payment)
    for w in (7, 28):
        panel[f"out_mean_{w}d"] = (
            by_agent.cash_out_amt.transform(lambda s: s.shift(1).rolling(12 * w, min_periods=12).mean())
        ).fillna(0.0)
        panel[f"in_mean_{w}d"] = (
            by_agent.cash_in_amt.transform(lambda s: s.shift(1).rolling(12 * w, min_periods=12).mean())
        ).fillna(0.0)
    # neighbour pressure: same area+hour cash-out from OTHER agents
    area_hour_out = (panel.groupby(["area_id", "day_idx", "hour"]).cash_out_amt
                     .transform("sum") - panel.cash_out_amt)
    peers = panel.groupby(["area_id", "day_idx", "hour"]).agent_id.transform("nunique") - 1
    panel["nbr_out_amt"] = area_hour_out / peers.replace(0, np.nan)
    panel["nbr_out_amt"] = panel.nbr_out_amt.fillna(0.0)
    panel["nbr_z_out"] = (
        (panel.nbr_out_amt - by_agent.nbr_out_amt.transform("mean"))
        / by_agent.nbr_out_amt.transform("std").replace(0, np.nan)
    ).fillna(0.0)
    panel["recent_stockouts_7d"] = 0.0  # filled by detector feedback loop
    # causal lags: last hour's activity and 3h velocity (shift(1) = safe)
    g2 = panel.groupby("agent_id", sort=False)
    panel["out_amt_lag1"] = g2.cash_out_amt.shift(1).fillna(0.0)
    panel["out_cnt_lag1"] = g2.cash_out.shift(1).fillna(0.0)
    panel["out_vel_3h"] = g2.cash_out_amt.transform(
        lambda s: s.shift(1).rolling(3, min_periods=1).sum()).fillna(0.0)
    panel["net_vel_3h"] = g2.cash_out_amt.transform(
        lambda s: s.shift(1).rolling(3, min_periods=1).sum()).fillna(0.0) - \
        g2.cash_in_amt.transform(
        lambda s: s.shift(1).rolling(3, min_periods=1).sum()).fillna(0.0)
    return panel


PANEL_FEATURES = [
    "hour", "weekday", "day_of_month", "salary_window", "eid_window", "haat_day",
    "cash_in", "cash_in_amt", "send_money", "send_money_amt", "payment",
    "payment_amt", "fail_count", "fail_amount", "act_count",
    "out_mean_7d", "out_mean_28d", "in_mean_7d", "in_mean_28d",
    "nbr_out_amt", "nbr_z_out", "is_new",
    "out_amt_lag1", "out_cnt_lag1", "out_vel_3h", "net_vel_3h",
]
