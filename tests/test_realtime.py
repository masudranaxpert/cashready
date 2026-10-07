import pytest
import pandas as pd
from cashready.realtime import LiveEngine, LIMITATION_NOTE


def test_live_engine_init_and_snapshot():
    engine = LiveEngine()
    snap = engine.snapshot()
    assert len(snap) == 300
    first = snap[0]
    assert "agent_id" in first
    assert "area_id" in first
    assert "runway_hours" in first
    assert "alert_level" in first
    assert "message_bn" in first
    assert "message_en" in first
    assert first["limitation"] == LIMITATION_NOTE


def test_live_engine_ingest_and_score():
    engine = LiveEngine()
    agent_id = "T0039"

    # Initial score
    res_init = engine.score(agent_id)
    assert 0.0 <= res_init["p_cash_stockout"] <= 1.0
    assert 0.0 <= res_init["p_normal"] <= 1.0
    assert 0.0 <= res_init["p_float_stockout"] <= 1.0
    assert res_init["model_version"] == "v1.2-temporal"

    # Simulate ingesting a cash_out transaction
    txn = {
        "ts": "2026-09-03 08:15:00",
        "agent_id": agent_id,
        "type": "cash_out",
        "amount": 5000.0,
        "status": "success",
    }
    engine.ingest(txn)

    st = engine.agent_state[agent_id]
    assert st["counts"]["cash_out"] == 1
    assert st["counts"]["cash_out_amt"] == 5000.0
    assert st["cum_cash_out"] == 5000.0


def test_live_engine_cash_runway_and_alerts():
    engine = LiveEngine()
    agent_id = "T0039"

    # Set opening cash
    engine.set_opening_cash(agent_id, 30000.0)
    assert engine.agent_state[agent_id]["confirmed_opening"] is True

    runway = engine.get_cash_runway(agent_id)
    assert runway["confirmed_opening"] is True
    assert runway["opening_cash"] == 30000.0
    assert runway["alert_level"] in ("normal", "uncertain", "warning", "critical")

    # Ingest large cash_outs to deplete runway
    for _ in range(6):
        engine.ingest({
            "ts": "2026-09-03 08:30:00",
            "agent_id": agent_id,
            "type": "cash_out",
            "amount": 5000.0,
            "status": "success",
        })

    depleted_runway = engine.get_cash_runway(agent_id)
    assert depleted_runway["estimated_cash"] == 0.0
    assert depleted_runway["runway_hours"] == 0.0
    assert depleted_runway["alert_level"] in ("warning", "critical")
    assert depleted_runway["suggested_topup"] > 0
    assert "নগদ" in depleted_runway["message_bn"]
