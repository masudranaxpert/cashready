"""P3a — Hourly panel built from the PLATFORM LOG ONLY (no ground truth).

One row per agent-hour that the agent exists. These features are shared by
detector (P3), recovery (P4) and forecast (P5): downstream never sees truth.
"""

from pathlib import Path

import numpy as np
import pandas as pd

from cashready import config

EPOCH = pd.Timestamp("2026-07-05")


def build_panel(tx_path="data/raw/transactions.parquet",
                agents_path="data/raw/agents.parquet",
                areas_path="data/raw/areas.parquet") -> pd.DataFrame:
    tx = pd.read_parquet(tx_path) if isinstance(tx_path, (str, Path)) else tx_path.copy()
    agents = pd.read_parquet(agents_path) if isinstance(agents_path, (str, Path)) else agents_path.copy()
    areas = pd.read_parquet(areas_path) if isinstance(areas_path, (str, Path)) else areas_path.copy()

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

    # 1. Cumulative net cash outflow since 08:00 opening & drawdown ratio vs trailing 7d median
    panel["cum_net_out"] = panel.groupby(["agent_id", "day_idx"])["cash_out_amt"].cumsum() - \
                           panel.groupby(["agent_id", "day_idx"])["cash_in_amt"].cumsum()
    daily_out = panel.groupby(["agent_id", "day_idx"]).cash_out_amt.sum().reset_index()
    daily_out["med7"] = daily_out.groupby("agent_id").cash_out_amt.transform(
        lambda s: s.shift(1).rolling(7, min_periods=1).median()).fillna(10000.0)
    panel = panel.merge(daily_out[["agent_id", "day_idx", "med7"]], on=["agent_id", "day_idx"], how="left")
    panel["drawdown_ratio"] = np.clip(panel.cum_net_out / panel.med7.replace(0, 1.0), -2.0, 5.0)
    panel.drop(columns=["med7"], inplace=True)

    # 2. Hours since last cash_out & zero-cashout streak while active
    zero_streak = []
    hrs_since = []
    curr_s = 0
    curr_h = 0
    last_k = None
    for row in panel.itertuples():
        k = (row.agent_id, row.day_idx)
        if k != last_k:
            curr_s = 0
            curr_h = 0
            last_k = k
        if row.cash_out > 0:
            curr_s = 0
            curr_h = 0
        else:
            curr_h += 1
            if row.cash_in > 0 or row.payment > 0:
                curr_s += 1
        zero_streak.append(curr_s)
        hrs_since.append(curr_h)
    panel["zero_out_streak"] = zero_streak
    panel["hrs_since_out"] = hrs_since

    # 3. Rolling 3-hour sums of flows and neighbour pressure
    panel["cash_out_sum_3h"] = by_agent.cash_out_amt.transform(lambda s: s.rolling(3, min_periods=1).sum()).fillna(0.0)
    panel["cash_in_sum_3h"] = by_agent.cash_in_amt.transform(lambda s: s.rolling(3, min_periods=1).sum()).fillna(0.0)
    panel["payment_sum_3h"] = by_agent.payment_amt.transform(lambda s: s.rolling(3, min_periods=1).sum()).fillna(0.0)
    panel["nbr_z_mean_3h"] = by_agent.nbr_z_out.transform(lambda s: s.rolling(3, min_periods=1).mean()).fillna(0.0)

    # 4. Previous hour cash_out vs expected and change
    panel["out_amt_drop"] = panel.out_amt_lag1 - panel.cash_out_amt
    panel["out_z_lag1"] = (panel.out_amt_lag1 - panel.out_mean_7d) / (panel.out_mean_7d * 0.5 + 1.0)
    return panel


PANEL_FEATURES = [
    "hour", "weekday", "day_of_month", "salary_window", "eid_window", "haat_day",
    "cash_in", "cash_in_amt", "send_money", "send_money_amt", "payment",
    "payment_amt", "fail_count", "fail_amount", "act_count",
    "out_mean_7d", "out_mean_28d", "in_mean_7d", "in_mean_28d",
    "nbr_out_amt", "nbr_z_out", "is_new",
    "out_amt_lag1", "out_cnt_lag1", "out_vel_3h", "net_vel_3h",
    "cum_net_out", "drawdown_ratio", "zero_out_streak", "hrs_since_out",
    "cash_out_sum_3h", "cash_in_sum_3h", "payment_sum_3h", "nbr_z_mean_3h",
    "out_amt_drop", "out_z_lag1",
]
