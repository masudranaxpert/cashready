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

    # Run threshold tuning on validation and evaluate on test
    th_res = tune_stockout_threshold(panel, truth, min_precision=0.40, seed=seed, save_artifacts=True)
    results["threshold_tuning"] = {
        "chosen_threshold": th_res["tuning_criteria"]["chosen_threshold"],
        "validation": th_res["validation_metrics"],
        "test_comparison": th_res["test_comparison_all_hours"],
        "uncertain_band": th_res["uncertain_band"],
    }

    Path("artifacts/eval").mkdir(parents=True, exist_ok=True)
    with open("artifacts/eval/detector_metrics.json", "w") as f:
        json.dump(results, f, indent=2)
    return results


def plot_pr_curve(val_curve: list[dict], te_curve: list[dict],
                  chosen_th: float, val_pt: dict, te_pt: dict,
                  min_precision: float,
                  out_path: str = "artifacts/eval/detector_pr_curve.png") -> None:
    """Plot validation and test precision-recall curves with operating points."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(8.5, 5.5), dpi=150)
    r_val = [p["recall"] for p in val_curve]
    p_val = [p["precision"] for p in val_curve]
    ax.plot(r_val, p_val, label="Validation PR Curve (Days 50-59)", color="#2563eb", linewidth=2.0)

    r_te = [p["recall"] for p in te_curve]
    p_te = [p["precision"] for p in te_curve]
    ax.plot(r_te, p_te, label="Test PR Curve (Days 60-89)", color="#059669", linewidth=2.0, linestyle="--")

    ax.axhline(min_precision, color="#dc2626", linestyle=":", alpha=0.7,
               label=f"Min Precision Constraint ({min_precision:.2f})")

    ax.scatter([val_pt["recall"]], [val_pt["precision"]], color="#2563eb", s=80, zorder=5,
               edgecolors="black", label=f"Chosen Val Point (th={chosen_th:.2f}, F1={val_pt['f1']:.3f})")
    ax.annotate(f"Val: th={chosen_th:.2f}\nP={val_pt['precision']:.3f}, R={val_pt['recall']:.3f}\nF1={val_pt['f1']:.3f}",
                (val_pt["recall"], val_pt["precision"]),
                textcoords="offset points", xytext=(12, 10),
                fontsize=9, bbox=dict(boxstyle="round,pad=0.3", fc="#eff6ff", ec="#2563eb", alpha=0.9))

    ax.scatter([te_pt["recall"]], [te_pt["precision"]], color="#059669", s=80, zorder=5,
               edgecolors="black", label=f"Test Operating Point (th={chosen_th:.2f}, F1={te_pt['f1']:.3f})")
    ax.annotate(f"Test: th={chosen_th:.2f}\nP={te_pt['precision']:.3f}, R={te_pt['recall']:.3f}\nF1={te_pt['f1']:.3f}",
                (te_pt["recall"], te_pt["precision"]),
                textcoords="offset points", xytext=(12, -28),
                fontsize=9, bbox=dict(boxstyle="round,pad=0.3", fc="#ecfdf5", ec="#059669", alpha=0.9))

    ax.set_xlabel("Recall (Cash Stock-out)", fontsize=11, fontweight="medium")
    ax.set_ylabel("Precision (Cash Stock-out)", fontsize=11, fontweight="medium")
    ax.set_title("LightGBM Stock-Out Detector: Precision-Recall Curve & Threshold Tuning",
                 fontsize=12, fontweight="bold", pad=12)
    ax.set_xlim(0.0, 1.0)
    ax.set_ylim(0.0, 1.0)
    ax.grid(True, linestyle="--", alpha=0.5)
    ax.legend(loc="upper right", framealpha=0.95, fontsize=8.5)

    plt.tight_layout()
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out_path, dpi=150)
    plt.close(fig)


def tune_stockout_threshold(panel: pd.DataFrame, truth: pd.DataFrame | None = None,
                            min_precision: float = 0.40, uncertain_min: float = 0.30,
                            seed: int = 0, save_artifacts: bool = True) -> dict:
    """Tune cash stock-out threshold on validation (days 50-59) and evaluate on test (days 60-89)."""
    add_closed_flag(panel)
    if truth is None:
        truth = pd.read_parquet("data/ground_truth/hourly_truth.parquet")
    key = ["agent_id", "day_idx", "hour"]

    # 1. Fit on days 0-49 and evaluate over thresholds on validation days 50-59
    tr_val = panel[panel.day_idx < 50].merge(truth[key + ["state"]], on=key)
    val_panel = panel[panel.day_idx.between(50, 59)].copy()
    val_truth = truth[truth.day_idx.between(50, 59)].copy()

    det_val_probs = ml_detector(tr_val, val_panel, seed=seed)
    det_val = finalize(val_panel, det_val_probs)

    det_keyed_v = det_val.set_index(key)
    val_all = det_keyed_v.reindex(pd.MultiIndex.from_frame(val_truth[key], names=key))
    p_cash_v = val_all["p_cash_stockout"].fillna(0.0).to_numpy()
    is_closed_v = (val_all["p_closed"].fillna(1.0) == 1.0).to_numpy()
    y_val = (val_truth["state"] == "cash_stockout").to_numpy()

    thresholds = np.linspace(0.05, 0.95, 91)
    def compute_curve(p_cash, is_closed, y_true):
        pts = []
        for th in thresholds:
            pred = (p_cash >= th) & (~is_closed)
            tp = int((pred & y_true).sum())
            fp = int((pred & (~y_true)).sum())
            fn = int(((~pred) & y_true).sum())
            p = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
            r = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
            f1 = float(2 * p * r / (p + r)) if (p + r) > 0 else 0.0
            pts.append({
                "threshold": round(float(th), 3),
                "precision": round(p, 4),
                "recall": round(r, 4),
                "f1": round(f1, 4),
                "tp": tp, "fp": fp, "fn": fn,
            })
        return pts

    val_curve = compute_curve(p_cash_v, is_closed_v, y_val)
    eligible = [pt for pt in val_curve if pt["precision"] >= min_precision]
    chosen_pt = max(eligible, key=lambda x: x["f1"]) if eligible else max(val_curve, key=lambda x: x["f1"])
    chosen_th = chosen_pt["threshold"]

    # 2. Retrain on days 0-59 and evaluate on all test hours (days 60-89)
    tr_te = panel[panel.day_idx < 60].merge(truth[key + ["state"]], on=key)
    te_panel = panel[panel.day_idx >= 60].copy()
    te_truth = truth[truth.day_idx >= 60].copy()

    det_te_probs = ml_detector(tr_te, te_panel, seed=seed)
    det_te = finalize(te_panel, det_te_probs)

    det_keyed_t = det_te.set_index(key)
    te_all = det_keyed_t.reindex(pd.MultiIndex.from_frame(te_truth[key], names=key))
    p_cash_t = te_all["p_cash_stockout"].fillna(0.0).to_numpy()
    is_closed_t = (te_all["p_closed"].fillna(1.0) == 1.0).to_numpy()
    y_te = (te_truth["state"] == "cash_stockout").to_numpy()

    te_curve = compute_curve(p_cash_t, is_closed_t, y_te)
    te_pt = next(pt for pt in te_curve if abs(pt["threshold"] - chosen_th) < 1e-4)

    # Default argmax on test
    pred_argmax = (te_all.state.fillna("closed") == "cash_stockout").to_numpy()
    tp_arg = int((pred_argmax & y_te).sum())
    fp_arg = int((pred_argmax & (~y_te)).sum())
    fn_arg = int(((~pred_argmax) & y_te).sum())
    p_arg = float(tp_arg / (tp_arg + fp_arg)) if (tp_arg + fp_arg) > 0 else 0.0
    r_arg = float(tp_arg / (tp_arg + fn_arg)) if (tp_arg + fn_arg) > 0 else 0.0
    f1_arg = float(2 * p_arg * r_arg / (p_arg + r_arg)) if (p_arg + r_arg) > 0 else 0.0

    # 3. Uncertain band analysis
    uncertain_mask = (p_cash_t >= uncertain_min) & (p_cash_t < chosen_th) & (~is_closed_t)
    n_agents = len(te_truth.agent_id.unique())
    n_weeks = len(te_truth.day_idx.unique()) / 7.0
    n_uncertain = int(uncertain_mask.sum())
    h_per_agent_week = round(n_uncertain / (n_agents * n_weeks), 2)

    pred_tuned = (p_cash_t >= chosen_th) & (~is_closed_t)
    tp_tuned = int((pred_tuned & y_te).sum())
    tp_uncertain = int((uncertain_mask & y_te).sum())
    total_pos = int(y_te.sum())
    rec_base = te_pt["recall"]
    rec_confirmed = round((tp_tuned + tp_uncertain) / max(total_pos, 1), 4)

    payload = {
        "tuning_criteria": {
            "train_days_val": [0, 49],
            "validation_days": [50, 59],
            "threshold_range": [0.05, 0.95],
            "min_precision_target": min_precision,
            "chosen_threshold": chosen_th,
        },
        "validation_metrics": {
            "chosen_threshold": chosen_th,
            "precision": chosen_pt["precision"],
            "recall": chosen_pt["recall"],
            "f1": chosen_pt["f1"],
            "tp": chosen_pt["tp"],
            "fp": chosen_pt["fp"],
            "fn": chosen_pt["fn"],
            "total_true_stockouts": int(y_val.sum()),
            "total_hours": len(y_val),
        },
        "test_comparison_all_hours": {
            "test_days": [60, 89],
            "train_days_test": [0, 59],
            "total_hours": len(y_te),
            "total_true_stockouts": total_pos,
            "default_argmax": {
                "precision": round(p_arg, 4),
                "recall": round(r_arg, 4),
                "f1": round(f1_arg, 4),
                "tp": tp_arg, "fp": fp_arg, "fn": fn_arg,
            },
            "tuned_threshold": {
                "threshold": chosen_th,
                "precision": te_pt["precision"],
                "recall": te_pt["recall"],
                "f1": te_pt["f1"],
                "tp": te_pt["tp"], "fp": te_pt["fp"], "fn": te_pt["fn"],
            },
            "delta": {
                "precision": round(te_pt["precision"] - p_arg, 4),
                "recall": round(te_pt["recall"] - r_arg, 4),
                "f1": round(te_pt["f1"] - f1_arg, 4),
                "tp_delta": te_pt["tp"] - tp_arg,
            },
        },
        "uncertain_band": {
            "band_range": [uncertain_min, chosen_th],
            "uncertain_hours_total": n_uncertain,
            "hours_per_agent_week": h_per_agent_week,
            "uncertain_true_positives": tp_uncertain,
            "uncertain_precision": round(tp_uncertain / max(n_uncertain, 1), 4),
            "recall_at_tuned_threshold": rec_base,
            "recall_if_confirmed": rec_confirmed,
            "recall_uplift_absolute": round(rec_confirmed - rec_base, 4),
            "recall_uplift_relative_pct": round(((rec_confirmed - rec_base) / max(rec_base, 1e-9)) * 100, 2),
        },
        "validation_pr_curve": val_curve,
        "test_pr_curve": te_curve,
    }

    if save_artifacts:
        Path("artifacts/eval").mkdir(parents=True, exist_ok=True)
        with open("artifacts/eval/detector_threshold.json", "w") as f:
            json.dump(payload, f, indent=2)
        plot_pr_curve(val_curve, te_curve, chosen_th, chosen_pt, te_pt, min_precision)

    return payload


if __name__ == "__main__":
    from cashready.features import build_panel
    panel = build_panel()
    res = run(panel)
    print(json.dumps(res, indent=2))

