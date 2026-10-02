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


def test_feedback_post(client):
    agents = client.get("/agents").json()
    aid = agents[0]["agent_id"]
    r = client.post(f"/agents/{aid}/feedback", json={"helpful": True, "comment": "ok"})
    assert r.status_code == 200 and r.json()["ok"] is True


def test_metrics(client):
    r = client.get("/metrics")
    assert r.status_code == 200
    m = r.json()
    assert any("detector" in k or "recovery" in k or "forecast" in k for k in m)
