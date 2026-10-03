"""P8 — FastAPI serving layer (docs/API_SCHEMA.md contract).

Reads artifacts/serve/*.json; no ML in the request path. CORS open for the
frontend origin; optional X-API-Key via env ARTIFACTS_DIR/API_KEY/FRONTEND_ORIGIN.
"""

import json
import os
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

ARTIFACTS = Path(os.environ.get("ARTIFACTS_DIR", "artifacts/serve"))
API_KEY = os.environ.get("API_KEY")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "*")

app = FastAPI(title="CashReady API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN] if FRONTEND_ORIGIN != "*" else ["*"],
    allow_methods=["*"], allow_headers=["*"],
)


def check_key(x_api_key: str | None):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "bad api key")


def load(rel: str) -> dict:
    p = (ARTIFACTS / rel).resolve()
    if not p.is_relative_to(ARTIFACTS.resolve()) or not p.exists():
        raise HTTPException(404, f"artifact not found: {rel}")
    return json.loads(p.read_text())


@app.get("/health")
def health():
    ok = (ARTIFACTS / "metrics.json").exists()
    return {"status": "ok" if ok else "degraded", "artifacts_dir": str(ARTIFACTS)}


@app.get("/agents")
def agents(area_id: str | None = None, x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    rows = load("agents.json")
    return [r for r in rows if area_id is None or r["area_id"] == area_id]


@app.get("/areas")
def areas(x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    rows = load("agents.json")
    seen = {}
    for r in rows:
        seen.setdefault(r["area_id"], r["area_type"])
    return [{"area_id": a, "area_type": t} for a, t in sorted(seen.items())]


@app.get("/metrics")
def metrics(x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    return load("metrics.json")


@app.get("/agents/{agent_id}/plan")
def agent_plan(agent_id: str, date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
               risk: str = Query("0.9"), x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    doc = load(f"plans/{date}.json")
    a = doc["agents"].get(agent_id)
    if a is None:
        raise HTTPException(404, f"agent {agent_id} not in plan for {date}")
    res = dict(a)
    if isinstance(res.get("opening_cash"), dict):
        by_level = res["opening_cash"]
        res["opening_cash_by_level"] = by_level
        res["opening_cash"] = by_level.get(risk, by_level.get("0.9", 60000))
    return {"date": date, "agent_id": agent_id, **res}


@app.post("/agents/{agent_id}/feedback")
def agent_feedback(agent_id: str, payload: dict, x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    out_file = ARTIFACTS / "feedback.jsonl"
    record = {
        "timestamp": str(Path().stat().st_mtime),
        "agent_id": agent_id,
        **payload,
    }
    with open(out_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return {"ok": True}


@app.get("/agents/{agent_id}/lost-demand")
def agent_lost(agent_id: str, week: str = Query(..., pattern=r"^\d{4}-W\d{2}$"),
               x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    doc = load(f"lost_demand/{week}.json")
    a = doc["agents"].get(agent_id, {"lost_count": 0, "lost_amount": 0,
                                     "lost_commission": 0})
    return {"week": week, "agent_id": agent_id, **a}


@app.get("/areas/{area_id}/risk")
def area_risk(area_id: str, date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
              x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    doc = load(f"area_risk/{date}.json")
    if area_id not in doc["areas"]:
        raise HTTPException(404, f"area {area_id} not in risk for {date}")
    return {"date": date, "area_id": area_id, "agents": doc["areas"][area_id]}


@app.get("/areas/lost-demand")
def area_lost(week: str = Query(..., pattern=r"^\d{4}-W\d{2}$"),
              x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    doc = load(f"lost_demand/{week}.json")
    return {"week": week, "areas": doc["areas"]}
