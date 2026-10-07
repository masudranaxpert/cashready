"""P8 — Real-time streaming detector and cash-runway engine.

Holds in-memory rolling state per agent and area, ingests events sequentially,
and scores stock-out risk using the exact same LightGBM model and temporal features
as the batch detector. Computes intraday cash runway and alert thresholds.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import lightgbm as lgb
import numpy as np
import pandas as pd

from cashready import config
from cashready.features import EPOCH, PANEL_FEATURES

MODEL_PATH = "artifacts/models/detector_lgbm.txt"
MODEL_VERSION = "v1.2-temporal"
DEFAULT_TUNED_THRESHOLD = 0.39
DEFAULT_UNCERTAIN_MIN = 0.30
LIMITATION_NOTE = (
    "Replay of synthetic test day — other store cash sales not included "
    "in e-money ledger (conservative estimate)."
)


class LiveEngine:
    """Incremental streaming state and scoring engine."""

    def __init__(
        self,
        model_path: str = MODEL_PATH,
        model_version: str = MODEL_VERSION,
        tuned_threshold: float = DEFAULT_TUNED_THRESHOLD,
        uncertain_min: float = DEFAULT_UNCERTAIN_MIN,
        history_panel_path: str = "data/processed/panel.parquet",
    ):
        self.model_version = model_version
        self.tuned_threshold = tuned_threshold
        self.uncertain_min = uncertain_min
        self.current_day: int = 60
        self.current_hour: int = 8

        # Load LightGBM booster
        m_path = Path(model_path)
        if not m_path.exists():
            raise FileNotFoundError(f"Model booster not found at {model_path}")
        self.booster = lgb.Booster(model_file=str(m_path))

        # Load agents and areas metadata
        agents_df = pd.read_parquet("data/raw/agents.parquet")
        areas_df = pd.read_parquet("data/raw/areas.parquet")
        meta = agents_df.merge(areas_df, on="area_id")
        self.agents_meta: Dict[str, Dict[str, Any]] = {
            r.agent_id: {
                "agent_id": r.agent_id,
                "area_id": r.area_id,
                "area_type": r.area_type,
                "is_new": int(r.is_new),
                "start_day": int(r.start_day),
                "haat_day": int(r.haat_day),
                "habit_scale": float(getattr(r, "habit_scale", 30000.0)),
            }
            for r in meta.itertuples()
        }

        # Area mapping and agent count per area
        self.area_peers: Dict[str, int] = {}
        for a_info in self.agents_meta.values():
            aid = a_info["area_id"]
            self.area_peers[aid] = self.area_peers.get(aid, 0) + 1

        # Historical baseline statistics precomputed from training panel
        self.agent_history: Dict[str, Dict[str, float]] = {}
        self._load_historical_baselines(history_panel_path)

        # Preloaded forecasts for cash runway estimation
        self.forecasts: Dict[Tuple[str, int, int], float] = {}
        self._load_dayahead_forecasts()

        # In-memory rolling states
        self.agent_state: Dict[str, Dict[str, Any]] = {}
        self.area_hour_out: Dict[str, float] = {aid: 0.0 for aid in self.area_peers}
        self.reset_day(self.current_day)

    def _load_historical_baselines(self, panel_path: str):
        """Precompute agent historical trailing means and standard deviations."""
        if Path(panel_path).exists():
            df = pd.read_parquet(panel_path)
            tr = df[df.day_idx < 60]
            if len(tr) > 0:
                for agent_id, g in tr.groupby("agent_id"):
                    last = g.iloc[-1]
                    self.agent_history[agent_id] = {
                        "out_mean_7d": float(last.get("out_mean_7d", 0.0)),
                        "out_mean_28d": float(last.get("out_mean_28d", 0.0)),
                        "in_mean_7d": float(last.get("in_mean_7d", 0.0)),
                        "in_mean_28d": float(last.get("in_mean_28d", 0.0)),
                        "drawdown_med7": float(
                            g.groupby("day_idx").cash_out_amt.sum().median() or 10000.0
                        ),
                        "nbr_out_amt_mean": float(g.nbr_out_amt.mean() if "nbr_out_amt" in g else 0.0),
                        "nbr_out_amt_std": float(g.nbr_out_amt.std() if "nbr_out_amt" in g else 1.0) or 1.0,
                    }
        # Fallback for any agents missing in history
        for a in self.agents_meta:
            if a not in self.agent_history:
                self.agent_history[a] = {
                    "out_mean_7d": 1500.0,
                    "out_mean_28d": 1500.0,
                    "in_mean_7d": 1000.0,
                    "in_mean_28d": 1000.0,
                    "drawdown_med7": 15000.0,
                    "nbr_out_amt_mean": 1500.0,
                    "nbr_out_amt_std": 500.0,
                }

    def _load_dayahead_forecasts(self):
        """Preload day-ahead q50 forecasts for test days."""
        fc_path = Path("data/processed/forecasts.parquet")
        if fc_path.exists():
            fc = pd.read_parquet(fc_path)
            for r in fc.itertuples():
                self.forecasts[(r.agent_id, int(r.day_idx), int(r.hour))] = float(r.pred_q50)

    def reset_day(self, day_idx: int):
        """Reset live states at the beginning of a calendar day (08:00)."""
        self.current_day = day_idx
        self.current_hour = 8
        self.area_hour_out = {aid: 0.0 for aid in self.area_peers}

        for agent_id, meta in self.agents_meta.items():
            hist = self.agent_history.get(agent_id, {})
            default_opening = max(hist.get("drawdown_med7", 30000.0) * config.OPEN_BUFFER, 10000.0)
            self.agent_state[agent_id] = {
                "opening_cash": default_opening,
                "confirmed_opening": False,
                "cum_cash_out": 0.0,
                "cum_cash_in": 0.0,
                "hrs_since_out": 0,
                "zero_out_streak": 0,
                "out_amt_lag1": hist.get("out_mean_7d", 0.0),
                "out_cnt_lag1": 1.0,
                "recent_out_amt": [hist.get("out_mean_7d", 0.0)],
                "recent_in_amt": [hist.get("in_mean_7d", 0.0)],
                "p_smooth_prev": 0.0,
                # Current hour counters
                "counts": {
                    "cash_out": 0,
                    "cash_out_amt": 0.0,
                    "cash_in": 0,
                    "cash_in_amt": 0.0,
                    "send_money": 0,
                    "send_money_amt": 0.0,
                    "payment": 0,
                    "payment_amt": 0.0,
                    "fail_count": 0,
                    "fail_amount": 0.0,
                    "act_count": 0,
                },
            }

    def _advance_hour(self, new_day: int, new_hour: int):
        """Roll hourly buffers when clock advances."""
        if new_day != self.current_day:
            self.reset_day(new_day)
            self.current_hour = new_hour
            return

        # Score all agents at end of completed hour to update temporal persistence
        for agent_id in self.agents_meta:
            st = self.agent_state[agent_id]
            res = self.score(agent_id)
            st["p_smooth_prev"] = res["p_cash_stockout"]

            # Roll lags and streaks
            c = st["counts"]
            st["out_amt_lag1"] = float(c["cash_out_amt"])
            st["out_cnt_lag1"] = float(c["cash_out"])
            st["recent_out_amt"].append(float(c["cash_out_amt"]))
            if len(st["recent_out_amt"]) > 3:
                st["recent_out_amt"].pop(0)
            st["recent_in_amt"].append(float(c["cash_in_amt"]))
            if len(st["recent_in_amt"]) > 3:
                st["recent_in_amt"].pop(0)

            if c["cash_out"] > 0:
                st["hrs_since_out"] = 0
                st["zero_out_streak"] = 0
            else:
                st["hrs_since_out"] += 1
                if c["cash_in"] > 0 or c["payment"] > 0:
                    st["zero_out_streak"] += 1

            # Reset hour counters
            for k in st["counts"]:
                st["counts"][k] = 0.0 if "amt" in k or "amount" in k else 0

        self.area_hour_out = {aid: 0.0 for aid in self.area_peers}
        self.current_hour = new_hour

    def ingest(self, txn: Union[Dict[str, Any], pd.Series]) -> None:
        """Ingest a single transaction event from stream."""
        ts = pd.to_datetime(txn["ts"])
        tx_day = int((ts - EPOCH).days)
        tx_hour = int(ts.hour)

        if tx_day != self.current_day or tx_hour != self.current_hour:
            self._advance_hour(tx_day, tx_hour)

        agent_id = txn["agent_id"]
        if agent_id not in self.agent_state:
            return

        st = self.agent_state[agent_id]
        c = st["counts"]
        t_type = txn["type"]
        amount = float(txn["amount"])
        status = txn.get("status", "success")

        if t_type == "cash_out":
            c["cash_out"] += 1
            c["cash_out_amt"] += amount
            st["cum_cash_out"] += amount
            aid = self.agents_meta[agent_id]["area_id"]
            self.area_hour_out[aid] = self.area_hour_out.get(aid, 0.0) + amount
        elif t_type == "cash_in":
            if status == "success":
                c["cash_in"] += 1
                c["cash_in_amt"] += amount
                st["cum_cash_in"] += amount
            else:
                c["fail_count"] += 1
                c["fail_amount"] += amount
        elif t_type == "payment":
            c["payment"] += 1
            c["payment_amt"] += amount
        elif t_type == "send_money":
            c["send_money"] += 1
            c["send_money_amt"] += amount

        c["act_count"] = c["cash_in"] + c["send_money"] + c["payment"]

    def set_opening_cash(self, agent_id: str, amount: float) -> None:
        """Agent confirms morning opening cash via one-tap prompt."""
        if agent_id in self.agent_state:
            self.agent_state[agent_id]["opening_cash"] = float(amount)
            self.agent_state[agent_id]["confirmed_opening"] = True

    def build_features(self, agent_id: str) -> np.ndarray:
        """Assemble exact feature vector matching PANEL_FEATURES."""
        meta = self.agents_meta[agent_id]
        hist = self.agent_history[agent_id]
        st = self.agent_state[agent_id]
        c = st["counts"]

        weekday = (self.current_day + EPOCH.weekday()) % 7
        dom = (EPOCH + pd.Timedelta(days=self.current_day)).day
        salary_window = int(dom in config.SALARY_DAYS)
        eid_window = int(config.EID_DAYS[0] <= self.current_day < config.EID_DAYS[1])
        haat_day = int(meta["haat_day"] == weekday)

        aid = meta["area_id"]
        peers = max(self.area_peers.get(aid, 1) - 1, 1)
        area_total = self.area_hour_out.get(aid, 0.0)
        nbr_out = max(0.0, (area_total - c["cash_out_amt"]) / peers)
        nbr_z = (nbr_out - hist["nbr_out_amt_mean"]) / max(hist["nbr_out_amt_std"], 1e-4)

        out_vel_3h = float(sum(st["recent_out_amt"]))
        net_vel_3h = float(sum(st["recent_out_amt"]) - sum(st["recent_in_amt"]))

        cum_net_out = float(st["cum_cash_out"] - st["cum_cash_in"])
        drawdown = float(np.clip(cum_net_out / max(hist["drawdown_med7"], 1.0), -2.0, 5.0))

        cash_out_3h = out_vel_3h + c["cash_out_amt"]
        cash_in_3h = float(sum(st["recent_in_amt"])) + c["cash_in_amt"]
        payment_3h = c["payment_amt"]
        nbr_z_mean_3h = nbr_z

        out_amt_drop = float(st["out_amt_lag1"] - c["cash_out_amt"])
        out_z_lag1 = float(
            (st["out_amt_lag1"] - hist["out_mean_7d"]) / (hist["out_mean_7d"] * 0.5 + 1.0)
        )

        f_dict = {
            "hour": self.current_hour,
            "weekday": weekday,
            "day_of_month": dom,
            "salary_window": salary_window,
            "eid_window": eid_window,
            "haat_day": haat_day,
            "cash_in": c["cash_in"],
            "cash_in_amt": c["cash_in_amt"],
            "send_money": c["send_money"],
            "send_money_amt": c["send_money_amt"],
            "payment": c["payment"],
            "payment_amt": c["payment_amt"],
            "fail_count": c["fail_count"],
            "fail_amount": c["fail_amount"],
            "act_count": c["act_count"],
            "out_mean_7d": hist["out_mean_7d"],
            "out_mean_28d": hist["out_mean_28d"],
            "in_mean_7d": hist["in_mean_7d"],
            "in_mean_28d": hist["in_mean_28d"],
            "nbr_out_amt": nbr_out,
            "nbr_z_out": nbr_z,
            "is_new": meta["is_new"],
            "out_amt_lag1": st["out_amt_lag1"],
            "out_cnt_lag1": st["out_cnt_lag1"],
            "out_vel_3h": out_vel_3h,
            "net_vel_3h": net_vel_3h,
            "cum_net_out": cum_net_out,
            "drawdown_ratio": drawdown,
            "zero_out_streak": st["zero_out_streak"],
            "hrs_since_out": st["hrs_since_out"],
            "cash_out_sum_3h": cash_out_3h,
            "cash_in_sum_3h": cash_in_3h,
            "payment_sum_3h": payment_3h,
            "nbr_z_mean_3h": nbr_z_mean_3h,
            "out_amt_drop": out_amt_drop,
            "out_z_lag1": out_z_lag1,
        }
        return np.array([[f_dict[col] for col in PANEL_FEATURES]], dtype=np.float32)

    def score(self, agent_id: str) -> Dict[str, Any]:
        """Score agent stock-out risk with LightGBM and temporal smoothing."""
        st = self.agent_state[agent_id]
        meta = self.agents_meta[agent_id]
        X = self.build_features(agent_id)

        raw_probs = self.booster.predict(X)[0]
        p_normal_raw, p_cash_raw, p_float_raw = float(raw_probs[0]), float(raw_probs[1]), float(raw_probs[2])

        # Forward temporal smoothing
        s_prev = st["p_smooth_prev"]
        if self.current_hour == 8:
            p_smooth = p_cash_raw
        else:
            if st["counts"]["cash_out"] == 0 and s_prev > 0.25:
                p_smooth = 0.60 * s_prev + 0.40 * p_cash_raw
            else:
                p_smooth = 0.25 * s_prev + 0.75 * p_cash_raw

        p_cash = float(np.clip(p_smooth, 0.0, 1.0))
        p_float = float(np.clip(p_float_raw, 0.0, 1.0))
        p_normal = float(np.clip(1.0 - p_cash - p_float, 0.0, 1.0))

        # Check closed condition
        closed = (st["counts"]["act_count"] == 0) and (st["counts"]["cash_out"] == 0) and (self.current_hour in (8, 21))
        if closed:
            state = "closed"
        elif p_cash >= self.tuned_threshold:
            state = "cash_stockout"
        elif p_float > p_normal:
            state = "float_stockout"
        else:
            state = "normal"

        return {
            "agent_id": agent_id,
            "area_id": meta["area_id"],
            "area_type": meta["area_type"],
            "hour": self.current_hour,
            "day_idx": self.current_day,
            "p_normal": round(p_normal, 4),
            "p_cash_stockout": round(p_cash, 4),
            "p_float_stockout": round(p_float, 4),
            "state": state,
            "model_version": self.model_version,
        }

    def get_cash_runway(self, agent_id: str) -> Dict[str, Any]:
        """Compute estimated remaining cash, hours of runway, and alert levels."""
        st = self.agent_state[agent_id]
        score_info = self.score(agent_id)
        p_cash = score_info["p_cash_stockout"]

        # Intraday balance tracking
        est_cash = max(0.0, st["opening_cash"] + st["cum_cash_in"] - st["cum_cash_out"])

        # Projected upcoming demand from day-ahead forecasts
        burn_rates = []
        for h in range(self.current_hour, min(self.current_hour + 4, 22)):
            q50 = self.forecasts.get((agent_id, self.current_day, h), 2000.0)
            burn_rates.append(q50)
        avg_burn = float(np.mean(burn_rates)) if burn_rates else 2000.0

        runway_hours = round(est_cash / max(avg_burn, 100.0), 1)

        # Alert level determination
        topup_needed = max(10000.0, round((avg_burn * 3.0 - est_cash) / 5000.0) * 5000.0)
        if runway_hours < 2.0 or p_cash >= self.tuned_threshold:
            alert_level = "warning" if runway_hours >= 1.0 else "critical"
            msg_bn = f"{agent_id}: নগদ আনুমানিক {runway_hours} ঘণ্টায় ফুরাবে, ৳{topup_needed:,.0f} আনুন"
            msg_en = f"{agent_id}: Cash will run out in ~{runway_hours}h, bring ৳{topup_needed:,.0f}"
        elif p_cash >= self.uncertain_min:
            alert_level = "uncertain"
            msg_bn = f"{agent_id}: নগদ কি কমে গেছে? ট্যাপ করে নিশ্চিত করুন"
            msg_en = f"{agent_id}: Low cash suspected. Tap to confirm"
        else:
            alert_level = "normal"
            msg_bn = "স্বাভাবিক অবস্থা"
            msg_en = "Normal liquidity"

        return {
            "agent_id": agent_id,
            "area_id": score_info["area_id"],
            "current_hour": self.current_hour,
            "day_idx": self.current_day,
            "estimated_cash": round(est_cash, 2),
            "opening_cash": round(st["opening_cash"], 2),
            "confirmed_opening": st["confirmed_opening"],
            "cum_cash_in": round(st["cum_cash_in"], 2),
            "cum_cash_out": round(st["cum_cash_out"], 2),
            "runway_hours": runway_hours,
            "p_cash_stockout": p_cash,
            "state": score_info["state"],
            "alert_level": alert_level,
            "suggested_topup": topup_needed if alert_level in ("warning", "critical") else 0.0,
            "message_bn": msg_bn,
            "message_en": msg_en,
            "model_version": self.model_version,
            "limitation": LIMITATION_NOTE,
        }

    def snapshot(self) -> List[Dict[str, Any]]:
        """Return full fleet state snapshot for polling fallback."""
        return [self.get_cash_runway(aid) for aid in sorted(self.agents_meta.keys())]
