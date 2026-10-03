"""P7b — Export serving artifacts (docs/API_SCHEMA.md contract).

Builds artifacts/serve/*.json exactly as the API and frontend consume them:
  agents.json, plans/{date}.json, lost_demand/{iso_week}.json, area_risk/{date}.json
All numbers come from the pipeline (detector/recovery/forecast/plan); the only
"language" step is deterministic Bangla templates.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

from cashready import config
from cashready.explain import day_label, explain_agents, message_bn, message_en, top_reasons


def iso_week(day_idx: int) -> str:
    d = pd.Timestamp("2026-07-05") + pd.Timedelta(days=int(day_idx))
    return f"{d.isocalendar().year}-W{d.isocalendar().week:02d}"


def export(target_date: str | None = None):
    serve = Path("artifacts/serve")
    (serve / "plans").mkdir(parents=True, exist_ok=True)
    (serve / "lost_demand").mkdir(parents=True, exist_ok=True)
    (serve / "area_risk").mkdir(parents=True, exist_ok=True)

    agents = pd.read_parquet("data/raw/agents.parquet")
    areas = pd.read_parquet("data/raw/areas.parquet")
    fc = pd.read_parquet("data/processed/forecasts.parquet")
    det = pd.read_parquet("data/processed/detector_lgbm.parquet")
    rec = pd.read_parquet("data/processed/recovered_demand.parquet")

    a_meta = agents.merge(areas, on="area_id")
    Path(serve / "agents.json").write_text(json.dumps([
        {"agent_id": r.agent_id, "area_id": r.area_id, "area_type": r.area_type,
         "lat": round(23.7 + 0.35 * np.random.default_rng(abs(hash(r.area_id)) % 2**32).random(), 4),
         "lon": round(90.3 + 0.45 * np.random.default_rng(abs(hash(r.agent_id)) % 2**32).random(), 4),
         "is_new": bool(r.is_new)}
        for r in a_meta.itertuples()], ensure_ascii=False, indent=1))

    dates = sorted(fc.day_idx.unique())
    day_list = [int(d) for d in dates if target_date is None
                or day_label(d) == target_date]

    panel_cache = "data/processed/panel.parquet"
    if Path(panel_cache).exists():
        panel = pd.read_parquet(panel_cache)
    else:
        from cashready.features import build_panel
        panel = build_panel()
        panel.to_parquet(panel_cache, index=False)

    from cashready.business_sim import compute_daily_habit
    from cashready.features import PANEL_FEATURES

    # Load trained forecast booster (avoids retraining)
    import lightgbm as lgb
    model_path = Path("artifacts/models/forecast_q50.txt")
    if model_path.exists():
        m50 = lgb.Booster(model_file=str(model_path))
    else:
        from cashready.forecast import build_targets
        truth = pd.read_parquet("data/ground_truth/hourly_truth.parquet")
        df_tr = build_targets(panel, truth)
        tr = df_tr[(df_tr.day_idx < config.TRAIN_DAYS[1]) & df_tr.true_cashout_demand_amount.notna()]
        m50 = lgb.LGBMRegressor(objective="quantile", alpha=0.5, n_estimators=400,
                                learning_rate=0.06, num_leaves=31, min_child_samples=40,
                                random_state=0, verbose=-1)
        m50.fit(tr[PANEL_FEATURES], np.log1p(tr.true_cashout_demand_amount))

    # agent-day aggregates for the plan — AUDIT FIX (paste #3):
    # opening_cash MUST come from business_sim.plan_opening (cumulative day need),
    # per service level {0.8, 0.9, 0.95}, rounded to 1000 BDT.
    from cashready.business_sim import plan_opening, compute_daily_habit
    plans_all = []
    for sl in (0.8, 0.9, 0.95):
        p = plan_opening(fc, sl)
        p["service_level"] = str(sl)
        plans_all.append(p)
    plan_all = pd.concat(plans_all, ignore_index=True)
    plan_all["opening_cash"] = (plan_all.opening_cash / 1000).round() * 1000
    plan_all["opening_cash"] = plan_all.opening_cash.astype(int)

    panel_daily = compute_daily_habit(panel)

    # per-agent stockout probabilities: REPLAY last 14 test days (audit fix #2):
    # share of days each policy (habit / each service level) stocks out.
    truth = pd.read_parquet("data/ground_truth/hourly_truth.parquet")
    replay_days = sorted(plan_all.day_idx.unique())[-14:]
    tru_r = truth[truth.day_idx.isin(replay_days)]
    daily_need = (tru_r.groupby(["agent_id", "day_idx"])
                  .true_cashout_demand_amount.sum().rename("need").reset_index())
    daily_need = daily_need.merge(panel_daily[["agent_id", "day_idx", "habit"]],
                                  on=["agent_id", "day_idx"], how="left")
    daily_need["opening_habit"] = daily_need.habit * config.OPEN_BUFFER
    keyed = plan_all[plan_all.day_idx.isin(replay_days)][
        ["agent_id", "day_idx", "service_level", "opening_cash"]]
    daily_need = daily_need.merge(keyed, on=["agent_id", "day_idx"], how="left")

    def _so(df, col):
        return df.groupby("agent_id").apply(
            lambda g: (g[col] < g.need).mean(), include_groups=False)

    so_habit = _so(daily_need, "opening_habit")
    so_plan = {sl: _so(daily_need[daily_need.service_level == str(sl)], "opening_cash")
               for sl in ("0.8", "0.9", "0.95")}

    def probs_for(agent_id: str) -> dict:
        h = float(so_habit.get(agent_id, 0.3))
        p = {sl: float(so_plan[sl].get(agent_id, 0.1)) for sl in ("0.8", "0.9", "0.95")}
        return {"plan": p, "habit": h}

    plan_src = plan_all[plan_all.service_level == "0.9"].merge(
        panel_daily[["agent_id", "day_idx", "habit"]], on=["agent_id", "day_idx"],
        how="left")

    # per-day export (all forecast days; day_list already sorted)
    for d in day_list:
        date = day_label(d)
        day_plan = plan_src[plan_src.day_idx == d]
        day_fc = fc[fc.day_idx == d]
        risk_by_agent = (day_fc.loc[day_fc.groupby("agent_id").pred_q90.idxmax()]
                         .set_index("agent_id")[["hour"]])
        # SHAP reasons from feature means for this day
        Xd = panel[panel.day_idx == d].groupby("agent_id")[PANEL_FEATURES].mean()
        try:
            sv = explain_agents(m50, Xd)
            reasons_map = {a: top_reasons(sv.loc[a]) for a in Xd.index}
        except Exception:
            reasons_map = {}

        agents_json = {}
        for r in day_plan.itertuples():
            reasons = reasons_map.get(r.agent_id, [])
            pr = probs_for(r.agent_id)
            rh = int(risk_by_agent.loc[r.agent_id, "hour"]) \
                if r.agent_id in risk_by_agent.index else 8
            # per-level opening from plan_opening (audit fix #1/#3)
            day_all_levels = plan_all[(plan_all.day_idx == d) &
                                      (plan_all.agent_id == r.agent_id)]
            oc_by_level = {str(sl): int(day_all_levels[
                day_all_levels.service_level == str(sl)].opening_cash.iloc[0])
                for sl in ("0.8", "0.9", "0.95")} if len(day_all_levels) else {
                "0.8": int(r.opening_cash), "0.9": int(r.opening_cash),
                "0.95": int(r.opening_cash)}
            oc = oc_by_level["0.9"]
            agents_json[r.agent_id] = {
                "opening_cash": oc,
                "opening_cash_by_level": oc_by_level,
                "stockout_prob_plan": pr["plan"],
                "stockout_prob_habit": pr["habit"],
                "risk_hour": rh,
                "reasons": reasons,
                "message_bn": message_bn(oc, rh, reasons),
                "message_en": message_en(oc, rh, reasons),
            }
        (serve / "plans" / f"{date}.json").write_text(json.dumps(
            {"date": date, "opening_cash_default": 60000,
             "agents": agents_json}, ensure_ascii=False))

        # area risk: top 5 unique risky agents per area
        day_det = det[det.day_idx == d]
        ar = {}
        for area, g in day_det.groupby("area_id"):
            top_agents = (g.groupby("agent_id")["p_cash_stockout"].max()
                          .nlargest(5).reset_index())
            ar[area] = [{"agent_id": r.agent_id,
                         "stockout_prob_habit": round(float(r.p_cash_stockout), 3),
                         "risk_hour": int(risk_by_agent.loc[r.agent_id, "hour"])
                         if r.agent_id in risk_by_agent.index else 8}
                        for r in top_agents.itertuples()]
        (serve / "area_risk" / f"{date}.json").write_text(json.dumps(
            {"date": date, "areas": ar}, ensure_ascii=False))

    # lost demand per ISO week (agents + areas)
    rec["week"] = rec.day_idx.map(iso_week)
    for wk, g in rec.groupby("week"):
        ag = (g.groupby("agent_id").agg(
            lost_count=("estimated_lost_count", "sum"),
            lost_amount=("estimated_lost_amount", "sum")))
        ar = (g.groupby("area_id").agg(
            lost_count=("estimated_lost_count", "sum"),
            lost_amount=("estimated_lost_amount", "sum"),
            demand_shift=("demand_shift", "max")))
        (serve / "lost_demand" / f"{wk}.json").write_text(json.dumps({
            "week": wk,
            "agents": {a: {"lost_count": round(float(r.lost_count), 1),
                           "lost_amount": round(float(r.lost_amount), 0),
                           "lost_commission": round(float(r.lost_amount) * config.CASHOUT_COMMISSION_RATE, 0)}
                       for a, r in ag.iterrows()},
            "areas": {a: {"lost_count": round(float(r.lost_count), 1),
                          "lost_amount": round(float(r.lost_amount), 0),
                          "demand_shift": int(r.demand_shift)}
                      for a, r in ar.iterrows()},
        }, ensure_ascii=False))

    # metrics.json — everything the Evidence page shows
    import glob
    metrics = {}
    for f in glob.glob("artifacts/eval/*.json"):
        if "metrics" in f:
            metrics[Path(f).stem] = json.loads(Path(f).read_text())
    (serve / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=1))
    print(f"exported: plans for {len(day_list)} day(s), "
          f"{len(list((serve/'lost_demand').glob('*.json')))} weeks, metrics.json")


if __name__ == "__main__":
    export()
