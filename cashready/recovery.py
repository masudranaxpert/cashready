"""P4 — Censored demand recovery: estimate cash-out demand the platform never saw.

Core: LightGBM regression on OBSERVED outcomes of clean (no stock-out) agent-hours,
applied to censored hours to predict what demand WOULD have been.
Baselines: (i) naive = observed (censoring ignored), (ii) mean correction
(trailing 28d average of lost amounts per area). Demand-shift guard: if an
area-week's digital payment share grew >15%, recovery is capped (shift is real
demand migration, not all censored).
Labels exist ONLY in ground truth for evaluation; features never include them.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

from cashready import config
from cashready.features import PANEL_FEATURES

TRUTH = "data/ground_truth/hourly_truth.parquet"


def load_clean_panel(panel: pd.DataFrame) -> pd.DataFrame:
    """Clean hours = no stock-out (from TRAIN period only, labels via truth)."""
    truth = pd.read_parquet(TRUTH)
    key = ["agent_id", "day_idx", "hour"]
    df = panel.merge(truth[key + ["state", "true_cashout_demand_count",
                                  "true_cashout_demand_amount"]], on=key)
    clean = df[(df.state == "normal") & (df.day_idx < config.TRAIN_DAYS[1])].copy()
    censor = df[df.day_idx >= config.TEST_DAYS[0]].copy()
    return clean, censor


def demand_shift_flags(censor: pd.DataFrame) -> pd.DataFrame:
    """Area-week payment-share growth vs trailing 4 weeks (>15% => shifted)."""
    aw = (censor.groupby(["area_id", "day_idx"])
          .agg(pay=("payment_amt", "sum"), out=("cash_out_amt", "sum"),
               sm=("send_money_amt", "sum")).reset_index())
    aw["week"] = aw.day_idx // 7
    wk = aw.groupby(["area_id", "week"])[["pay", "out", "sm"]].sum().reset_index()
    wk["digital"] = wk.pay + wk.sm
    wk["share"] = wk.digital / (wk.digital + wk.out).replace(0, np.nan)
    wk = wk.sort_values(["area_id", "week"])
    wk["share_prev4"] = (wk.groupby("area_id").share
                         .transform(lambda s: s.shift(1).rolling(4, min_periods=2).mean()))
    wk["demand_shift"] = (wk.share > 1.15 * wk.share_prev4).astype(int)
    return wk[["area_id", "week", "demand_shift"]]


def recover(panel: pd.DataFrame, seed=0) -> dict:
    import lightgbm as lgb

    clean, censor = load_clean_panel(panel)
    wk = demand_shift_flags(censor)
    censor["week"] = censor.day_idx // 7
    censor = censor.merge(wk, on=["area_id", "week"], how="left")
    censor["demand_shift"] = censor.demand_shift.fillna(0).astype(int)

    feats = [f for f in PANEL_FEATURES if f != "is_new"] + ["is_new"]
    # two targets: count and amount of true cash-out demand
    models, metrics = {}, {}
    for tgt, log in [("count", False), ("amount", True)]:
        ycol = ("true_cashout_demand_" + tgt)
        y = clean[ycol].to_numpy()
        ym = np.log1p(y) if log else y
        m = lgb.LGBMRegressor(n_estimators=400, learning_rate=0.06,
                              num_leaves=31, min_child_samples=40,
                              subsample=0.9, colsample_bytree=0.9,
                              reg_lambda=1.0, random_state=seed, verbose=-1)
        m.fit(clean[feats], ym)
        models[tgt] = m

    pred_cnt = np.clip(models["count"].predict(censor[feats]), 0, None)
    pred_amt = np.expm1(models["amount"].predict(censor[feats]))
    obs_cnt = censor.cash_out.to_numpy()
    obs_amt = censor.cash_out_amt.to_numpy()

    recovered_cnt = np.maximum(pred_cnt, obs_cnt)
    recovered_amt = np.maximum(pred_amt, obs_amt)

    # demand-shift guard: where digital shift flagged, cap recovery uplift
    # at +30% over observed (rest of the gap is migration, not censoring)
    cap = obs_amt * 1.30
    shifted = censor.demand_shift.to_numpy() == 1
    recovered_amt = np.where(shifted, np.minimum(recovered_amt, cap), recovered_amt)
    recovered_cnt = np.where(shifted, np.minimum(recovered_cnt, obs_cnt * 1.30),
                              recovered_cnt)

    # baselines
    naive_cnt, naive_amt = obs_cnt, obs_amt
    # mean correction: area trailing-28d average lost amount from TRAIN
    truth = pd.read_parquet(TRUTH)
    tr = truth[truth.day_idx < config.TRAIN_DAYS[1]]
    tr = tr.merge(panel[["agent_id", "area_id"]].drop_duplicates(), on="agent_id")
    area_lost = tr.groupby("area_id").lost_cashout_amount.mean()
    area_lost_cnt = tr.groupby("area_id").lost_cashout_count.mean()
    mean_amt = obs_amt + censor.area_id.map(area_lost).fillna(0).to_numpy()
    mean_cnt = obs_cnt + censor.area_id.map(area_lost_cnt).fillna(0).to_numpy()

    true_cnt = censor.true_cashout_demand_count.to_numpy()
    true_amt = censor.true_cashout_demand_amount.to_numpy()

    def mae_pct(est, tru):
        # score ONLY the censored hours — where recovery actually matters
        m = censor.state.to_numpy() == "cash_stockout"
        return round(float(np.abs(est[m] - tru[m]).mean()
                           / max(tru[m].mean(), 1e-9) * 100), 2)

    out = censor[key_columns()].copy()
    out["observed_count"] = obs_cnt
    out["observed_amount"] = obs_amt
    out["recovered_count"] = np.round(recovered_cnt, 2)
    out["recovered_amount"] = np.round(recovered_amt, 2)
    out["demand_shift"] = shifted.astype(int)
    out["estimated_lost_amount"] = np.round(np.maximum(recovered_amt - obs_amt, 0), 2)
    out["estimated_lost_count"] = np.round(np.maximum(recovered_cnt - obs_cnt, 0), 2)
    Path("data/processed").mkdir(parents=True, exist_ok=True)
    out.to_parquet("data/processed/recovered_demand.parquet", index=False)

    metrics = {
        "amount_mae_pct": {
            "naive_observed": mae_pct(naive_amt, true_amt),
            "mean_correction": mae_pct(mean_amt, true_amt),
            "cashready_recovery": mae_pct(recovered_amt, true_amt),
        },
        "count_mae_pct": {
            "naive_observed": mae_pct(naive_cnt, true_cnt),
            "mean_correction": mae_pct(mean_cnt, true_cnt),
            "cashready_recovery": mae_pct(recovered_cnt, true_cnt),
        },
        "censored_hours": int((censor.state == "cash_stockout").sum()),
        "total_estimated_lost_bdt": float(out.estimated_lost_amount.sum()),
        "demand_shift_area_weeks": int(wk.demand_shift.sum()),
    }
    Path("artifacts/eval").mkdir(parents=True, exist_ok=True)
    with open("artifacts/eval/recovery_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    return metrics


def key_columns():
    return ["agent_id", "area_id", "day_idx", "hour"]


if __name__ == "__main__":
    from cashready.features import build_panel
    panel = build_panel()
    res = recover(panel)
    print(json.dumps(res, indent=2))
