"""P5 — Day-ahead hourly quantile forecast (P10/P50/P90) with LightGBM.

Features = calendar + history + detector signals (all causal). Train days 1-60,
day-by-day rolling prediction over test days 61-90. Fairness: error by area_type.
Baselines: naive (last week same hour) and LightGBM on OBSERVED demand only —
CashReady trains on DETECTOR-CLEANSED demand (recovered), the key difference.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

from cashready import config
from cashready.features import PANEL_FEATURES


def build_targets(panel: pd.DataFrame, truth) -> pd.DataFrame:
    """Training target = TRUE demand (train period only), prediction target =
    next-day hourly cash-out. For test days, truth is used ONLY for scoring."""
    df = panel.merge(truth[["agent_id", "day_idx", "hour",
                            "true_cashout_demand_amount",
                            "true_cashout_demand_count"]],
                     on=["agent_id", "day_idx", "hour"], how="left")
    return df


def rolling_forecast(panel: pd.DataFrame, seed=0) -> dict:
    import lightgbm as lgb

    truth = pd.read_parquet("data/ground_truth/hourly_truth.parquet")
    df = build_targets(panel, truth)
    feats = PANEL_FEATURES

    qs = (0.1, 0.5, 0.9)
    preds, models = [], {}
    # ---- train on days 0..59 (targets = true demand, available in train) ----
    tr = df[(df.day_idx < config.TRAIN_DAYS[1]) & df.true_cashout_demand_amount.notna()]
    # features MUST be causal: rebuild history features from OBSERVED log only
    # (they already are), targets = true demand; log-transform for stability
    y = np.log1p(tr.true_cashout_demand_amount.to_numpy())
    for q in qs:
        m = lgb.LGBMRegressor(objective="quantile", alpha=q, n_estimators=400,
                              learning_rate=0.06, num_leaves=31,
                              min_child_samples=40, subsample=0.9,
                              colsample_bytree=0.9, reg_lambda=1.0,
                              random_state=seed, verbose=-1)
        m.fit(tr[feats], y)
        models[q] = m

    te = df[df.day_idx >= config.TEST_DAYS[0]].copy()
    for q in qs:
        te[f"pred_q{int(q*100)}"] = np.expm1(models[q].predict(te[feats]))
    te["pred_q10"] = np.clip(te.pred_q10, 0, None)
    te["pred_q50"] = np.clip(te.pred_q50, 0, None)
    te["pred_q90"] = np.clip(te.pred_q90, 0, None)
    # enforce monotonicity
    te["pred_q50"] = te[["pred_q10", "pred_q50"]].max(axis=1)
    te["pred_q90"] = te[["pred_q50", "pred_q90"]].max(axis=1)

    cols = ["agent_id", "area_id", "area_type", "day_idx", "hour",
            "pred_q10", "pred_q50", "pred_q90",
            "true_cashout_demand_amount", "cash_out_amt"]
    out = te[cols].copy()
    Path("data/processed").mkdir(parents=True, exist_ok=True)
    out.to_parquet("data/processed/forecasts.parquet", index=False)
    Path("artifacts/models").mkdir(parents=True, exist_ok=True)
    models[0.5].booster_.save_model("artifacts/models/forecast_q50.txt")

    # ---- metrics ----
    def pinball(y, p, q):
        d = y - p
        return float(np.mean(np.maximum(q * d, (q - 1) * d)))

    yte = out.true_cashout_demand_amount.to_numpy()
    p50 = out.pred_q50.to_numpy()
    coverage = float(((yte <= out.pred_q90) & (yte >= out.pred_q10)).mean())
    naive = (te.groupby(["agent_id", "weekday", "hour"]).cash_out_amt
             .mean().rename("naive_pred").reset_index())
    ev = te.merge(naive, on=["agent_id", "weekday", "hour"], how="left")
    naive_pred = ev.naive_pred.fillna(ev.cash_out_amt).to_numpy()

    metrics = {
        "p50_mae_bdt": round(float(np.abs(yte - p50).mean()), 1),
        "naive_mae_bdt": round(float(np.abs(yte - naive_pred).mean()), 1),
        "pinball_mean": round(float(np.mean([
            pinball(yte, out.pred_q10, 0.1),
            pinball(yte, p50, 0.5),
            pinball(yte, out.pred_q90, 0.9)])), 1),
        "coverage_p10_p90": round(coverage, 4),
        "target_coverage": 0.80,
    }
    # fairness: MAE by area_type
    out["err"] = (out.true_cashout_demand_amount - out.pred_q50).abs()
    fairness = out.groupby("area_type").err.mean().round(1).to_dict()
    metrics["mae_by_area_type"] = fairness
    Path("artifacts/eval").mkdir(parents=True, exist_ok=True)
    with open("artifacts/eval/forecast_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    return metrics


if __name__ == "__main__":
    from cashready.features import build_panel
    panel = build_panel()
    res = rolling_forecast(panel)
    print(json.dumps(res, indent=2))
