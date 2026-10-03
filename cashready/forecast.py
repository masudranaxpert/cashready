"""P5 — Day-ahead hourly quantile forecast (P10/P50/P90) with LightGBM.

STRICT day-ahead causality (audit fix): every feature must be known the
EVENING BEFORE. Features = calendar (hour, weekday, day_of_month,
salary_window, eid_window, haat_day, area_type, is_new) + per agent-hour
lags of cash_out_amt on a FULL agent x day x hour grid (zero-filled):
lag 1 day, lag 7 days, trailing 7/28-day means. NO same-hour features.
Train target = RECOVERED demand (not ground truth). Naive baseline =
same hour last week (causal). Also reports the same model trained on
observed (censored) demand — the censored-demand story in numbers.
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


def build_dayahead_features(panel: pd.DataFrame) -> pd.DataFrame:
    """STRICT day-ahead grid: one row per agent x day x hour (zero-filled).

    All history features are lags of PREVIOUS DAYS on the same agent-hour
    (lag1, lag7, trailing 7/28-day means) — nothing from the same day.
    """
    agents = panel[["agent_id", "area_id", "area_type", "is_new"]].drop_duplicates()
    days = np.arange(panel.day_idx.min(), panel.day_idx.max() + 1)
    grid = pd.MultiIndex.from_product(
        [agents.agent_id, days, range(8, 22)], names=["agent_id", "day_idx", "hour"]
    ).to_frame(index=False)

    obs = (panel.groupby(["agent_id", "day_idx", "hour"]).cash_out_amt.sum()
           .rename("obs_out").reset_index())
    g = grid.merge(obs, on=["agent_id", "day_idx", "hour"], how="left")
    g["obs_out"] = g.obs_out.fillna(0.0)
    g = g.sort_values(["agent_id", "hour", "day_idx"])
    grp = g.groupby(["agent_id", "hour"], sort=False)
    g["lag1"] = grp.obs_out.shift(1).fillna(0.0)
    g["lag7"] = grp.obs_out.shift(7).fillna(0.0)
    g["mean7"] = grp.obs_out.transform(lambda s: s.shift(1).rolling(7, min_periods=1).mean()).fillna(0.0)
    g["mean28"] = grp.obs_out.transform(lambda s: s.shift(1).rolling(28, min_periods=1).mean()).fillna(0.0)

    cal = panel[["agent_id", "day_idx", "hour", "weekday", "day_of_month",
                 "salary_window", "eid_window", "haat_day"]].drop_duplicates()
    g = g.merge(cal, on=["agent_id", "day_idx", "hour"], how="left")
    g = g.merge(agents, on="agent_id", how="left")
    return g


DAYAHEAD_FEATURES = [
    "hour", "weekday", "day_of_month", "salary_window", "eid_window",
    "haat_day", "is_new",
    "lag1", "lag7", "mean7", "mean28",
]
# area_type one-hats are added dynamically in rolling_forecast


def rolling_forecast(panel: pd.DataFrame, seed=0) -> dict:
    import lightgbm as lgb
    from cashready.recovery import recover

    rec_res = recover(panel)
    recov = pd.read_parquet("data/processed/recovered_demand.parquet")
    truth = pd.read_parquet("data/ground_truth/hourly_truth.parquet")

    grid = build_dayahead_features(panel)
    # target: RECOVERED demand on the grid (now covering both train and test days).
    tgt = recov[["agent_id", "day_idx", "hour", "recovered_amount"]]
    g = grid.merge(tgt, on=["agent_id", "day_idx", "hour"], how="left")
    g["recovered_amount"] = g.recovered_amount.fillna(0.0)
    g = g.merge(truth[["agent_id", "day_idx", "hour", "true_cashout_demand_amount"]],
                on=["agent_id", "day_idx", "hour"], how="left")

    feats = list(DAYAHEAD_FEATURES)
    for at in ("urban_market", "peri_urban", "rural"):
        g[f"at_{at}"] = (g.area_type == at).astype(int)
        feats.append(f"at_{at}")

    qs = (0.1, 0.5, 0.9)
    tr = g[g.day_idx < config.TRAIN_DAYS[1]]
    te = g[g.day_idx >= config.TEST_DAYS[0]].copy()

    def fit_predict(target: pd.Series) -> pd.DataFrame:
        y = np.log1p(target.to_numpy())
        out = pd.DataFrame(index=te.index)
        for q in qs:
            m = lgb.LGBMRegressor(objective="quantile", alpha=q, n_estimators=400,
                                  learning_rate=0.06, num_leaves=31,
                                  min_child_samples=40, subsample=0.9,
                                  colsample_bytree=0.9, reg_lambda=1.0,
                                  random_state=seed, verbose=-1)
            m.fit(tr[feats], y)
            out[f"pred_q{int(q*100)}"] = np.expm1(m.predict(te[feats]))
        return out

    preds = fit_predict(tr.recovered_amount)
    for c in preds.columns:
        te[c] = np.clip(preds[c].to_numpy(), 0, None)
    te["pred_q50"] = te[["pred_q10", "pred_q50"]].max(axis=1)
    te["pred_q90"] = te[["pred_q50", "pred_q90"]].max(axis=1)

    # control: SAME model trained on OBSERVED (censored) demand
    obs_map = panel.groupby(["agent_id", "day_idx", "hour"]).cash_out_amt.sum()
    te_obs_target = [obs_map.get((r.agent_id, r.day_idx, r.hour), 0.0)
                     for r in te.itertuples()]
    tr_obs = [obs_map.get((r.agent_id, r.day_idx, r.hour), 0.0)
              for r in tr.itertuples()]
    preds_obs = fit_predict(pd.Series(tr_obs, index=tr.index))
    te["pred_obs_q50"] = np.clip(preds_obs["pred_q50"].to_numpy(), 0, None)

    cols = ["agent_id", "area_id", "area_type", "day_idx", "hour",
            "pred_q10", "pred_q50", "pred_q90", "pred_obs_q50",
            "true_cashout_demand_amount", "cash_out_amt"]
    # cash_out_amt may not exist on the grid; observed = same-hour truth fallback
    if "cash_out_amt" not in te.columns:
        te["cash_out_amt"] = te_obs_target
    out = te[cols].copy()
    out.to_parquet("data/processed/forecasts.parquet", index=False)
    Path("artifacts/models").mkdir(parents=True, exist_ok=True)
    # persist a q50 model trained on recovered demand for SHAP/export reuse
    m_final = lgb.LGBMRegressor(objective="quantile", alpha=0.5, n_estimators=400,
                                learning_rate=0.06, num_leaves=31,
                                min_child_samples=40, subsample=0.9,
                                colsample_bytree=0.9, reg_lambda=1.0,
                                random_state=seed, verbose=-1)
    m_final.fit(tr[feats], np.log1p(tr.recovered_amount.to_numpy()))
    m_final.booster_.save_model("artifacts/models/forecast_q50.txt")

    # ---- metrics ----
    def pinball(y, p, q):
        d = y - p
        return float(np.mean(np.maximum(q * d, (q - 1) * d)))

    yte = out.true_cashout_demand_amount.fillna(0).to_numpy()
    p50 = out.pred_q50.to_numpy()
    coverage = float(((yte <= out.pred_q90) & (yte >= out.pred_q10)).mean())

    # CAUSAL naive baseline: same agent-hour, one week earlier (lag7), zero-filled
    lag7_map = g.set_index(["agent_id", "day_idx", "hour"]).lag7
    naive_pred = np.array([lag7_map.get((r.agent_id, r.day_idx, r.hour), 0.0)
                           for r in te.itertuples()])

    metrics = {
        "p50_mae_bdt": round(float(np.abs(yte - p50).mean()), 1),
        "naive_mae_bdt": round(float(np.abs(yte - naive_pred).mean()), 1),
        "observed_target_mae_bdt": round(float(np.abs(
            yte - out.pred_obs_q50.to_numpy()).mean()), 1),
        "p50_pinball": round(float(pinball(yte, p50, 0.5)), 1),
        "pinball_mean": round(float(np.mean([
            pinball(yte, out.pred_q10, 0.1),
            pinball(yte, p50, 0.5),
            pinball(yte, out.pred_q90, 0.9)])), 1),
        "naive_pinball_mean": round(float(pinball(yte, naive_pred, 0.5)), 1),
        "observed_target_pinball_mean": round(float(pinball(
            yte, out.pred_obs_q50.to_numpy(), 0.5)), 1),
        "coverage_p10_p90": round(coverage, 4),
        "target_coverage": 0.80,
    }
    # fairness: MAE by area_type
    out["err"] = (out.true_cashout_demand_amount.fillna(0) - out.pred_q50).abs()
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
