import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("ARTIFACTS_DIR", "artifacts/serve")

from api.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] in ("ok", "degraded")


def test_agents_schema(client):
    r = client.get("/agents")
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list) and len(rows) >= 100
    assert {"agent_id", "area_id", "area_type", "lat", "lon", "is_new"} <= set(rows[0])


def test_plan_endpoint(client):
    agents = client.get("/agents").json()
    aid = agents[0]["agent_id"]
    plans = sorted(Path("artifacts/serve/plans").glob("*.json"))
    assert plans, "no plan artifacts — run make pipeline first"
    date = plans[-1].stem
    r = client.get(f"/agents/{aid}/plan", params={"date": date})
    assert r.status_code == 200
    body = r.json()
    assert body["agent_id"] == aid
    assert "opening_cash" in body and "message_bn" in body

    # Verify advisory message cash synchronization across risk levels
    for risk in ("0.8", "0.9", "0.95"):
        r_risk = client.get(f"/agents/{aid}/plan", params={"date": date, "risk": risk})
        assert r_risk.status_code == 200
        b_risk = r_risk.json()
        assert f"{b_risk['opening_cash']:,}" in b_risk["message_bn"]
        if b_risk.get("message_en"):
            assert f"{b_risk['opening_cash']:,}" in b_risk["message_en"]


def test_area_risk_and_lost(client):
    areas = client.get("/areas").json()
    aid = areas[0]["area_id"]
    plans = sorted(Path("artifacts/serve/plans").glob("*.json"))
    date = plans[-1].stem
    r = client.get(f"/areas/{aid}/risk", params={"date": date})
    assert r.status_code == 200
    weeks = sorted(Path("artifacts/serve/lost_demand").glob("*.json"))
    assert weeks
    wk = weeks[-1].stem
    r2 = client.get("/areas/lost-demand", params={"week": wk})
    assert r2.status_code == 200


def test_metrics(client):
    r = client.get("/metrics")
    assert r.status_code == 200
    m = r.json()
    assert any("detector" in k or "recovery" in k or "forecast" in k for k in m)


def test_plan_risk_levels(client):
    agents = client.get("/agents").json()
    aid = agents[0]["agent_id"]
    plans = sorted(Path("artifacts/serve/plans").glob("*.json"))
    date = plans[-1].stem
    r80 = client.get(f"/agents/{aid}/plan", params={"date": date, "risk": "0.8"}).json()
    r90 = client.get(f"/agents/{aid}/plan", params={"date": date, "risk": "0.9"}).json()
    r95 = client.get(f"/agents/{aid}/plan", params={"date": date, "risk": "0.95"}).json()
    assert r80["opening_cash"] <= r90["opening_cash"] <= r95["opening_cash"]
    assert "opening_cash_by_level" in r90
    assert "stockout_prob_plan" in r90
    assert "stockout_prob_habit" in r90


def test_feedback_endpoint(client):
    r = client.post("/agents/T0000/feedback", json={"helpful": True, "comment": "test feedback"})
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_security_input_validation(client):
    # Reject path traversal / invalid agent_id format
    r_bad_id = client.get("/agents/../plan", params={"date": "2026-10-02"})
    assert r_bad_id.status_code in (404, 422)

    # Reject malformed date parameter
    r_bad_date = client.get("/agents/T0000/plan", params={"date": "not-a-date"})
    assert r_bad_date.status_code == 422

    # Reject oversized comment payload (> 500 chars)
    r_bad_comment = client.post("/agents/T0000/feedback", json={"helpful": True, "comment": "x" * 501})
    assert r_bad_comment.status_code == 422
