"""P3b — Stock-out detector: rule baseline vs HMM vs LightGBM.

All three return the SAME columns (p_cash_stockout, p_float_stockout,
p_closed, state) so downstream stages can swap methods freely.
Trained/evaluated on the hourly panel; labels come from ground truth but
features never do. Train = days 0-59, test = days 60-89.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

from cashready import config
from cashready.features import PANEL_FEATURES

STATES = ["normal", "cash_stockout", "float_stockout", "closed"]
# closed is directly observable from zero activity; we model the two
# stock-out states explicitly and keep a separate closedness flag.


def add_closed_flag(panel: pd.DataFrame) -> pd.DataFrame:
    panel["closed_flag"] = ((panel.act_count == 0) & (panel.cash_out == 0)).astype(int)
    return panel


def rule_detector(panel: pd.DataFrame) -> pd.DataFrame:
    """Transparent baseline: failed cash-ins -> float stock-out;
    payment conversion + zero cash-out despite activity -> cash stock-out."""
    out = pd.DataFrame(index=panel.index)
    act = (panel.act_count + panel.fail_count) > 0
    # float stock-out: failed cash-ins exist (platform logs them)
    pf = np.clip(panel.fail_count / 3.0, 0, 1)
    # cash stock-out: payment appears while cash_out suppressed, OR failures
    conv = np.clip(panel.payment / 2.0, 0, 1)
    suppression = ((panel.cash_out == 0) & act).astype(float)
    pc = np.clip(0.7 * conv + 0.5 * suppression, 0, 1)
    out["p_cash_stockout"] = np.where(act, pc, 0.0)
    out["p_float_stockout"] = np.where(act, np.maximum(pf, 0.3 * pc), 0.0)
    out["p_normal"] = np.clip(1 - out.p_cash_stockout - out.p_float_stockout, 0, 1)
    return out


def hmm_detector(train: pd.DataFrame, panel: pd.DataFrame, seed=0) -> pd.DataFrame:
    """GaussianHMM (2 hidden states: normal / stressed) fit on log-flow
    features per agent-day sequence; posteriors mapped to stock-out probs
    via state-to-label agreement on train."""
    from hmmlearn.hmm import GaussianHMM

    feat = ["cash_out_amt", "payment_amt", "fail_count", "cash_in_amt"]
    X = np.log1p(train[feat].to_numpy())

    def fit_columns(Xa):
        mu, sd = Xa.mean(0), Xa.std(0) + 1e-9
        return (Xa - mu) / sd, mu, sd

    Xn, mu, sd = fit_columns(X)
    hmm = GaussianHMM(n_components=2, covariance_type="diag", n_iter=60,
                      random_state=seed, min_covar=1e-3)
    try:
        hmm.fit(Xn)
    except ValueError:
        hmm = GaussianHMM(n_components=2, covariance_type="full", n_iter=80,
                          random_state=seed, min_covar=1e-2)
        hmm.fit(Xn)

    def posterior(df):
        Z = (np.log1p(df[feat].to_numpy()) - mu) / sd
        P = hmm.predict_proba(Z)
        # which hidden state means "stressed"? the one with higher payment+
        # failure mass on THIS data
        stress_score = P.T @ np.clip(df.payment_amt.to_numpy() / 2000.0, 0, 3
                                     ) + P.T @ np.clip(df.fail_count.to_numpy(), 0, 3)
        stressed = int(np.argmax(stress_score))
        p_stress = P[:, stressed]
        return p_stress

    tr_p = posterior(train)
    # calibrate: stressed posterior -> P(cash stock-out) via train quintile map
    y = (train.state == "cash_stockout").astype(int).to_numpy()
    qs = np.quantile(tr_p, [0.5, 0.8, 0.92, 0.97])
    def map_probs(p):
        pc = np.digitize(p, qs) / 4.0 * (1 if y.mean() > 0 else 1)
        # scale by base rate so probabilities are roughly calibrated
        pc = pc * max(y.mean() * 4, 0.05)
        return np.clip(pc, 0, 0.98)
    out = pd.DataFrame(index=panel.index)
    p_all = posterior(panel)
    out["p_cash_stockout"] = map_probs(p_all)
    # float stock-out rides on stress + failures (HMM sees them)
    fails = np.clip(panel.fail_count.to_numpy() / 3.0, 0, 1)
    out["p_float_stockout"] = np.clip(0.6 * p_all + 0.4 * fails, 0, 0.98)
    out["p_normal"] = np.clip(1 - out.p_cash_stockout - out.p_float_stockout, 0, 1)
    return out


def ml_detector(train: pd.DataFrame, panel: pd.DataFrame, seed=0) -> pd.DataFrame:
    """LightGBM multiclass on PANEL_FEATURES -> probabilities."""
    import lightgbm as lgb

    y = pd.Categorical(train.state, categories=STATES).codes
    Xtr, Xpa = train[PANEL_FEATURES], panel[PANEL_FEATURES]
    clf = lgb.LGBMClassifier(
        objective="multiclass", num_class=3, n_estimators=300,
        learning_rate=0.08, num_leaves=31, min_child_samples=40,
        subsample=0.9, colsample_bytree=0.9, reg_lambda=1.0,
        class_weight={0: 1.0, 1: 4.0, 2: 2.0},  # normal, cash, float
        random_state=seed, verbose=-1,
    )
    mask = train.state != "closed"          # closed handled by closed_flag
    clf.fit(Xtr[mask], y[mask])
    P = clf.predict_proba(Xpa)
    out = pd.DataFrame(index=panel.index)
    out["p_cash_stockout"] = P[:, STATES.index("cash_stockout")]
    out["p_float_stockout"] = P[:, STATES.index("float_stockout")]
    out["p_normal"] = P[:, STATES.index("normal")]
    return out


def finalize(panel: pd.DataFrame, probs: pd.DataFrame) -> pd.DataFrame:
    """Attach closedness + argmax state; EXACT same columns for every method."""
    out = probs.copy()
    closed = panel.closed_flag.to_numpy() == 1
    for c in ("p_cash_stockout", "p_float_stockout", "p_normal"):
        out.loc[closed, c] = 0.0
    out["p_closed"] = closed.astype(float)
    out["state"] = out[["p_normal", "p_cash_stockout",
                        "p_float_stockout", "p_closed"]].idxmax(axis=1).str[2:]
    keys = [k for k in ("agent_id", "area_id", "area_type", "day_idx", "hour")
            if k in panel.columns]
    return panel[keys].reset_index(drop=True).join(out.reset_index(drop=True))


def evaluate(det_states: pd.Series, truth: pd.Series) -> dict:
    from sklearn.metrics import f1_score, precision_score, recall_score
    m = det_states != "closed"                 # evaluate the 3 open states
    yt, yp = truth[m].astype(str), det_states[m].astype(str)
    return {
        "f1_macro": round(float(f1_score(yt, yp, average="macro", zero_division=0)), 4),
        "f1_cash_stockout": round(float(f1_score(yt, yp, labels=["cash_stockout"],
                                                 average="macro", zero_division=0)), 4),
        "precision_cash_stockout": round(float(precision_score(
            yt, yp, labels=["cash_stockout"], average="macro", zero_division=0)), 4),
        "recall_cash_stockout": round(float(recall_score(
            yt, yp, labels=["cash_stockout"], average="macro", zero_division=0)), 4),
        "n_evaluated": int(m.sum()),
    }


def evaluate_all_hours(det_states: pd.Series, truth: pd.Series) -> dict:
    """AUDIT FIX: score on ALL test agent-hours — missing panel rows count as
    predicted 'closed'. No exclusion flattering."""
    from sklearn.metrics import f1_score, precision_score, recall_score
    yt, yp = truth.astype(str), det_states.astype(str)
    labels = ["normal", "cash_stockout", "float_stockout", "closed"]
    f1_per = f1_score(yt, yp, labels=labels, average=None, zero_division=0)
    per_class_f1 = {lbl: round(float(val), 4) for lbl, val in zip(labels, f1_per)}
    return {
        "f1_macro_all": round(float(f1_score(yt, yp, average="macro",
                                             zero_division=0)), 4),
        "f1_per_class_all": per_class_f1,
        "f1_cash_stockout_all": per_class_f1.get("cash_stockout", 0.0),
        "precision_cash_stockout_all": round(float(precision_score(
            yt, yp, labels=["cash_stockout"], average="macro", zero_division=0)), 4),
        "recall_cash_stockout_all": round(float(recall_score(
            yt, yp, labels=["cash_stockout"], average="macro", zero_division=0)), 4),
        "n_all": int(len(yt)),
    }


def run(panel: pd.DataFrame, seed=0) -> dict:
    add_closed_flag(panel)
    truth = pd.read_parquet("data/ground_truth/hourly_truth.parquet")
    key = ["agent_id", "day_idx", "hour"]
    tr = panel[panel.day_idx < config.TRAIN_DAYS[1]].merge(
        truth[key + ["state"]], on=key)
    te = panel[panel.day_idx >= config.TEST_DAYS[0]].merge(
        truth[key + ["state"]].rename(columns={"state": "true_state"}), on=key)

    # AUDIT FIX: choose 'best' on a VALIDATION slice of train (last 10 train days),
    # never on test.
    val_hi = config.TRAIN_DAYS[1]
    val_lo = val_hi - 10
    val = panel[panel.day_idx.between(val_lo, val_hi - 1)].merge(
        truth[key + ["state"]], on=key)

    results = {}
    dets = {}
    for name, fn in [("rule", lambda df: rule_detector(df)),
                     ("hmm", lambda df: hmm_detector(tr, df, seed)),
                     ("lgbm", lambda df: ml_detector(tr, df, seed))]:
        det = finalize(panel.copy(), fn(panel))
        dets[name] = det
        det_te = det[det.day_idx >= config.TEST_DAYS[0]].reset_index(drop=True)
        m = evaluate(det_te.state, te.true_state)
        results[name] = m
        det.to_parquet(f"data/processed/detector_{name}.parquet", index=False)

    # validation-based model choice
    val_results = {}
    for name, fn in [("rule", lambda df: rule_detector(df)),
                     ("hmm", lambda df: hmm_detector(tr, df, seed)),
                     ("lgbm", lambda df: ml_detector(tr, df, seed))]:
        det_v = finalize(val.copy(), fn(val))
        val_results[name] = evaluate(det_v.state, val.state)

    # AUDIT FIX: ALL test agent-hours evaluation (missing panel hours = closed)
    truth_te = truth[truth.day_idx >= config.TEST_DAYS[0]]
    for name, det in dets.items():
        det_keyed = det.set_index(key)
        all_states = det_keyed.state.reindex(
            pd.MultiIndex.from_frame(truth_te[key], names=key))
        all_states = all_states.fillna("closed")
        results[name].update(evaluate_all_hours(all_states, truth_te.state.values))

    # 10%-labels variant (simulated agent one-tap feedback)
    rng = np.random.default_rng(seed)
    sample_days = rng.choice(np.arange(0, config.TRAIN_DAYS[1]),
                             size=max(1, config.TRAIN_DAYS[1] // 10), replace=False)
    tr_fb = tr[tr.day_idx.isin(sample_days)]
    det_fb = finalize(te.copy(), ml_detector(tr_fb, te, seed))
    fb_eval = evaluate(det_fb.state, te.true_state)
    det_fb_keyed = det_fb.set_index(key)
    fb_all_states = det_fb_keyed.state.reindex(
        pd.MultiIndex.from_frame(truth_te[key], names=key)).fillna("closed")
    fb_eval.update(evaluate_all_hours(fb_all_states, truth_te.state.values))
    fb_eval["train_days_used"] = int(len(sample_days))
    results["lgbm_10pct_feedback"] = fb_eval
    det_fb.to_parquet("data/processed/detector_lgbm_10pct.parquet", index=False)

    # consensus states used downstream: best method by VALIDATION f1_macro
    best = max(val_results, key=lambda k: val_results[k]["f1_macro"])
    results["best"] = best
    results["best_by"] = "validation_f1_macro"
    results["validation_f1_macro"] = {k: v["f1_macro"] for k, v in val_results.items()}
    Path("artifacts/eval").mkdir(parents=True, exist_ok=True)
    with open("artifacts/eval/detector_metrics.json", "w") as f:
        json.dump(results, f, indent=2)
    return results


if __name__ == "__main__":
    from cashready.features import build_panel
    panel = build_panel()
    res = run(panel)
    print(json.dumps(res, indent=2))
