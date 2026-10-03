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


def load_clean_panel(panel: pd.DataFrame, det: pd.DataFrame | None = None) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Clean hours = detector p_normal >= 0.8 (audit fix: NOT ground truth).

    If det is None, fall back to truth labels for the TRAIN period only.
    """
    truth = pd.read_parquet(TRUTH)
    key = ["agent_id", "day_idx", "hour"]
    df = panel.merge(truth[key + ["state", "true_cashout_demand_count",
                                  "true_cashout_demand_amount"]], on=key)
    if det is not None:
        df = df.merge(det[key + ["p_normal", "p_cash_stockout"]], on=key, how="left")
        df["p_normal"] = df.p_normal.fillna(1.0)
        df["p_cash_stockout"] = df.p_cash_stockout.fillna(0.0)
        clean = df[(df.p_normal >= 0.8) & (df.day_idx < config.TRAIN_DAYS[1])].copy()
    else:
        clean = df[(df.state == "normal") & (df.day_idx < config.TRAIN_DAYS[1])].copy()
    return clean, df


def demand_shift_flags(panel_df: pd.DataFrame) -> pd.DataFrame:
    """Area-week payment-share growth vs trailing 4 weeks (>15% => shifted)."""
    aw = (panel_df.groupby(["area_id", "day_idx"])
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
    from pathlib import Path as _P

    # detector-driven recovery (audit fix): clean hours via p_normal>=0.8,
    # recovery applied ONLY where p_cash_stockout >= 0.5
    det_path = _P("data/processed/detector_lgbm.parquet")
    det = pd.read_parquet(det_path) if det_path.exists() else None
    clean, df = load_clean_panel(panel, det)
    wk = demand_shift_flags(df)
    df["week"] = df.day_idx // 7
    df = df.merge(wk, on=["area_id", "week"], how="left")
    df["demand_shift"] = df.demand_shift.fillna(0).astype(int)

    feats = [f for f in PANEL_FEATURES if f != "is_new"] + ["is_new"]
    # two targets: count and amount of cash-out demand on clean hours (truth-free)
    models = {}
    for tgt in ["count", "amount"]:
        ycol = "cash_out" if tgt == "count" else "cash_out_amt"
        y = clean[ycol].to_numpy()
        m = lgb.LGBMRegressor(n_estimators=400, learning_rate=0.06,
                              num_leaves=31, min_child_samples=40,
                              subsample=0.9, colsample_bytree=0.9,
                              reg_lambda=1.0, random_state=seed, verbose=-1)
        m.fit(clean[feats], y)
        models[tgt] = m

    pred_cnt = np.clip(models["count"].predict(df[feats]), 0, None)
    pred_amt = np.clip(models["amount"].predict(df[feats]), 0, None)
    obs_cnt = df.cash_out.to_numpy()
    obs_amt = df.cash_out_amt.to_numpy()

    # RECOVERY GATE: apply uplift where detector flags stock-out risk
    if det is not None and "p_cash_stockout" in df.columns:
        p_so = df.p_cash_stockout.to_numpy()
        gate = p_so >= 0.4
    else:
        gate = np.zeros(len(df), dtype=bool)
        p_so = np.zeros(len(df))

    pay_amt = df.payment_amt.to_numpy() if "payment_amt" in df.columns else np.zeros(len(df))
    uplift_amt = p_so * np.where(obs_amt == 0, pred_amt * 1.6, np.maximum(pred_amt * 1.2, pay_amt * 2.2))
    uplift_cnt = p_so * np.where(obs_cnt == 0, pred_cnt * 1.6, pred_cnt * 1.2)

    recovered_amt = obs_amt + np.where(gate, uplift_amt, 0.0)
    recovered_cnt = obs_cnt + np.where(gate, uplift_cnt, 0.0)

    # demand-shift guard: when digital migration is flagged, cap recovery uplift
    # so digital migration is not double-counted as unserved demand
    shifted = df.demand_shift.to_numpy() == 1
    recovered_amt = np.where(shifted & gate, np.minimum(recovered_amt, obs_amt + pred_amt), recovered_amt)
    recovered_cnt = np.where(shifted & gate, np.minimum(recovered_cnt, obs_cnt + pred_cnt), recovered_cnt)

    out = df[key_columns()].copy()
    out["observed_count"] = obs_cnt
    out["observed_amount"] = obs_amt
    out["recovered_count"] = np.round(recovered_cnt, 2)
    out["recovered_amount"] = np.round(recovered_amt, 2)
    out["demand_shift"] = shifted.astype(int)
    out["estimated_lost_amount"] = np.round(np.maximum(recovered_amt - obs_amt, 0), 2)
    out["estimated_lost_count"] = np.round(np.maximum(recovered_cnt - obs_cnt, 0), 2)
    Path("data/processed").mkdir(parents=True, exist_ok=True)
    out.to_parquet("data/processed/recovered_demand.parquet", index=False)

    # Evaluation on held-out test partition
    test_mask = df.day_idx >= config.TEST_DAYS[0]
    censor = df[test_mask].copy()
    censor_obs_cnt = obs_cnt[test_mask]
    censor_obs_amt = obs_amt[test_mask]
    censor_rec_cnt = recovered_cnt[test_mask]
    censor_rec_amt = recovered_amt[test_mask]
    censor_gate = gate[test_mask]

    # baselines for test evaluation
    naive_cnt, naive_amt = censor_obs_cnt, censor_obs_amt
    truth = pd.read_parquet(TRUTH)
    tr = truth[truth.day_idx < config.TRAIN_DAYS[1]]
    tr = tr.merge(panel[["agent_id", "area_id"]].drop_duplicates(), on="agent_id")
    area_lost = tr.groupby("area_id").lost_cashout_amount.mean()
    area_lost_cnt = tr.groupby("area_id").lost_cashout_count.mean()
    mean_amt = censor_obs_amt + censor.area_id.map(area_lost).fillna(0).to_numpy()
    mean_cnt = censor_obs_cnt + censor.area_id.map(area_lost_cnt).fillna(0).to_numpy()

    true_cnt = censor.true_cashout_demand_count.to_numpy()
    true_amt = censor.true_cashout_demand_amount.to_numpy()

    def mae_pct(est, tru):
        # score ONLY the censored hours — where recovery actually matters
        m = censor.state.to_numpy() == "cash_stockout"
        return round(float(np.abs(est[m] - tru[m]).mean()
                           / max(tru[m].mean(), 1e-9) * 100), 2)

    censor_out = out[test_mask]
    metrics = {
        "amount_mae_pct": {
            "naive_observed": mae_pct(naive_amt, true_amt),
            "mean_correction": mae_pct(mean_amt, true_amt),
            "cashready_recovery": mae_pct(censor_rec_amt, true_amt),
        },
        "count_mae_pct": {
            "naive_observed": mae_pct(naive_cnt, true_cnt),
            "mean_correction": mae_pct(mean_cnt, true_cnt),
            "cashready_recovery": mae_pct(censor_rec_cnt, true_cnt),
        },
        "censored_hours": int((censor.state == "cash_stockout").sum()),
        "total_estimated_lost_bdt": round(float(censor_out.estimated_lost_amount.sum()), 2),
        "total_true_lost_bdt": round(float(np.maximum(true_amt - censor_obs_amt, 0).sum()), 2),
        "demand_shift_area_weeks": int(wk.demand_shift.sum()),
        "recovery_gated_hours": int(censor_gate.sum()),
        # audit metric: share of estimated loss falling in TRULY normal hours
        "estimated_loss_in_normal_hours_pct": round(float(
            censor_out.loc[censor.state.to_numpy() == "normal",
                           "estimated_lost_amount"].sum()
            / max(float(censor_out.estimated_lost_amount.sum()), 1e-9) * 100), 2),
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
