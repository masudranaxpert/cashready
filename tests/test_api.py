import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("ARTIFACTS_DIR", "artifacts/serve")

from api.config import settings  # noqa: E402
from api.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    # Admin client by default to preserve all baseline contract tests
    return TestClient(app, headers={"Authorization": "Bearer demo-admin-token"})


@pytest.fixture(scope="module")
def unauthed_client():
    return TestClient(app)


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] in ("ok", "degraded")


def test_version(client):
    r = client.get("/version")
    assert r.status_code == 200
    body = r.json()
    assert "app_version" in body and "model_version" in body


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
    r = client.post("/agents/T0039/feedback", json={"helpful": True, "comment": "test feedback"})
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_security_input_validation(client):
    # Reject path traversal / invalid agent_id format
    r_bad_id = client.get("/agents/../plan", params={"date": "2026-10-02"})
    assert r_bad_id.status_code in (404, 422)

    # Reject malformed date parameter
    r_bad_date = client.get("/agents/T0039/plan", params={"date": "not-a-date"})
    assert r_bad_date.status_code == 422

    # Reject oversized comment payload (> 500 chars)
    r_bad_comment = client.post("/agents/T0039/feedback", json={"helpful": True, "comment": "x" * 501})
    assert r_bad_comment.status_code == 422


def test_production_auth_required_401(monkeypatch, unauthed_client):
    monkeypatch.setattr(settings, "env", "production")
    # Health and version remain accessible
    assert unauthed_client.get("/health").status_code == 200
    assert unauthed_client.get("/version").status_code == 200

    # Protected endpoints return 401 without token
    r_no_auth = unauthed_client.get("/agents")
    assert r_no_auth.status_code == 401

    # Protected endpoints return 401 with invalid token
    r_bad_token = unauthed_client.get(
        "/agents", headers={"Authorization": "Bearer completely-invalid-token"}
    )
    assert r_bad_token.status_code == 401


def test_agent_role_scoping_403(unauthed_client):
    agent_headers = {"Authorization": "Bearer demo-agent-token"}
    plans = sorted(Path("artifacts/serve/plans").glob("*.json"))
    date = plans[-1].stem

    # Agent T0039 can access own plan
    r_own = unauthed_client.get("/agents/T0039/plan", params={"date": date}, headers=agent_headers)
    assert r_own.status_code == 200

    # Agent T0039 is forbidden from reading T0040 plan
    r_other = unauthed_client.get("/agents/T0040/plan", params={"date": date}, headers=agent_headers)
    assert r_other.status_code == 403

    # Agent T0039 is forbidden from area endpoints
    r_area = unauthed_client.get("/areas/A01/risk", params={"date": date}, headers=agent_headers)
    assert r_area.status_code == 403

    # Agent listing returns only self
    r_list = unauthed_client.get("/agents", headers=agent_headers)
    assert r_list.status_code == 200
    rows = r_list.json()
    assert len(rows) == 1 and rows[0]["agent_id"] == "T0039"


def test_manager_role_scoping_403(unauthed_client):
    manager_headers = {"Authorization": "Bearer demo-manager-token"}  # Area A01
    plans = sorted(Path("artifacts/serve/plans").glob("*.json"))
    date = plans[-1].stem

    # Manager can access own area A01 risk
    r_own_area = unauthed_client.get("/areas/A01/risk", params={"date": date}, headers=manager_headers)
    assert r_own_area.status_code == 200

    # Manager forbidden from reading other area A02 risk
    r_other_area = unauthed_client.get("/areas/A02/risk", params={"date": date}, headers=manager_headers)
    assert r_other_area.status_code == 403

    # Manager can access agent T0039 in area A01
    r_own_agent = unauthed_client.get("/agents/T0039/plan", params={"date": date}, headers=manager_headers)
    assert r_own_agent.status_code == 200

    # Manager forbidden from reading agent T0040 in area A05
    r_other_agent = unauthed_client.get("/agents/T0040/plan", params={"date": date}, headers=manager_headers)
    assert r_other_agent.status_code == 403

    # Manager forbidden from global metrics
    r_metrics = unauthed_client.get("/metrics", headers=manager_headers)
    assert r_metrics.status_code == 403
