import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("ARTIFACTS_DIR", "artifacts/serve")

from api.main import app
from api.config import settings


@pytest.fixture(scope="module")
def client():
    return TestClient(app, headers={"Authorization": "Bearer demo-admin-token"})


@pytest.fixture(scope="module")
def unauthed_client():
    return TestClient(app)


def test_confirmation_validation(client):
    # Valid submission
    payload_valid = {
        "date": "2026-10-02",
        "cash_ran_out": True,
        "from_hour": 13,
        "to_hour": 15,
        "customers_turned_away": 4,
        "kept_recommended_cash": "yes",
        "opening_cash_kept": 60000.0,
    }
    r = client.post("/agents/T0039/confirmations", json=payload_valid)
    assert r.status_code == 200
    data = r.json()
    assert data["agent_id"] == "T0039"
    assert data["cash_ran_out"] is True
    assert data["from_hour"] == 13
    assert data["to_hour"] == 15
    assert data["kept_recommended_cash"] == "yes"
    assert "id" in data
    assert "timestamp" in data
    assert "model_version" in data

    # Validation: invalid date format
    r_bad_date = client.post("/agents/T0039/confirmations", json={**payload_valid, "date": "not-a-date"})
    assert r_bad_date.status_code == 422

    # Validation: from_hour > to_hour
    r_bad_hours = client.post("/agents/T0039/confirmations", json={**payload_valid, "from_hour": 17, "to_hour": 14})
    assert r_bad_hours.status_code == 422

    # Validation: invalid kept_recommended_cash
    r_bad_adherence = client.post("/agents/T0039/confirmations", json={**payload_valid, "kept_recommended_cash": "maybe"})
    assert r_bad_adherence.status_code == 422

    # Validation: negative customers_turned_away
    r_neg_cust = client.post("/agents/T0039/confirmations", json={**payload_valid, "customers_turned_away": -1})
    assert r_neg_cust.status_code == 422


def test_confirmation_role_scoping(unauthed_client):
    agent_headers = {"Authorization": "Bearer demo-agent-token"}  # Agent T0039 (Area A01)
    manager_headers = {"Authorization": "Bearer demo-manager-token"}  # Manager Area A01
    admin_headers = {"Authorization": "Bearer demo-admin-token"}

    payload = {
        "date": "2026-10-02",
        "cash_ran_out": False,
        "kept_recommended_cash": "yes",
    }

    # 1. Agent can submit for own ID
    r_agent_own = unauthed_client.post("/agents/T0039/confirmations", json=payload, headers=agent_headers)
    assert r_agent_own.status_code == 200

    # 2. Agent cannot submit for other agent
    r_agent_other = unauthed_client.post("/agents/T0040/confirmations", json=payload, headers=agent_headers)
    assert r_agent_other.status_code == 403

    # 3. Manager can submit for agent in own area (T0039 in A01)
    r_mgr_own = unauthed_client.post("/agents/T0039/confirmations", json=payload, headers=manager_headers)
    assert r_mgr_own.status_code == 200

    # 4. Manager cannot submit for agent outside area (T0040 in A05)
    r_mgr_other = unauthed_client.post("/agents/T0040/confirmations", json=payload, headers=manager_headers)
    assert r_mgr_other.status_code == 403

    # 5. Admin can submit for any agent
    r_admin = unauthed_client.post("/agents/T0040/confirmations", json=payload, headers=admin_headers)
    assert r_admin.status_code == 200

    # 6. Agent query scoping
    r_q_agent_own = unauthed_client.get("/agents/T0039/confirmations", headers=agent_headers)
    assert r_q_agent_own.status_code == 200
    assert isinstance(r_q_agent_own.json(), list)

    r_q_agent_other = unauthed_client.get("/agents/T0040/confirmations", headers=agent_headers)
    assert r_q_agent_other.status_code == 403

    # 7. Area query scoping
    r_area_by_agent = unauthed_client.get("/areas/A01/confirmations", headers=agent_headers)
    assert r_area_by_agent.status_code == 403

    r_area_mgr_own = unauthed_client.get("/areas/A01/confirmations", headers=manager_headers)
    assert r_area_mgr_own.status_code == 200

    r_area_mgr_other = unauthed_client.get("/areas/A02/confirmations", headers=manager_headers)
    assert r_area_mgr_other.status_code == 403

    r_area_admin = unauthed_client.get("/areas/A01/confirmations", headers=admin_headers)
    assert r_area_admin.status_code == 200


def test_confirmation_persistence():
    conf_file = settings.artifacts_dir / "confirmations.jsonl"
    assert conf_file.exists()
    lines = conf_file.read_text(encoding="utf-8").strip().split("\n")
    assert len(lines) > 0
    import json
    last_record = json.loads(lines[-1])
    assert "timestamp" in last_record
    assert "model_version" in last_record
    assert "agent_id" in last_record
