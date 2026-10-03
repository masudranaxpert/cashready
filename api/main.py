import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from api.schemas import (
    HealthResponse,
    FeedbackRequest,
    FeedbackResponse,
    AgentItem,
    PlanResponse,
    AgentLostDemandResponse,
    AreaItem,
    AreaRiskResponse,
    AreaLostDemandResponse,
    MetricsResponse,
)

ARTIFACTS = Path(os.environ.get("ARTIFACTS_DIR", "artifacts/serve"))
API_KEY = os.environ.get("API_KEY")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "*")

tags_metadata = [
    {"name": "System", "description": "Healthcheck and runtime readiness probes."},
    {"name": "Agents", "description": "Agent profiles, day-ahead liquidity plans, unserved demand, and feedback."},
    {"name": "Areas", "description": "Area classifications, agent risk distributions, and weekly aggregations."},
    {"name": "Metrics", "description": "Comprehensive pipeline metrics, detector F1, recovery MAE, and business impact."},
]

app = FastAPI(
    title="CashReady API",
    version="1.0.0",
    description="Automated Liquidity Management & Decision Support for MFS Agents (AI DEV FEST 2026, Track 05).",
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)
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


@app.get("/health", response_model=HealthResponse, tags=["System"], summary="Service health status")
def health():
    ok = (ARTIFACTS / "metrics.json").exists()
    return {"status": "ok" if ok else "degraded", "artifacts_dir": str(ARTIFACTS)}


@app.get("/agents", response_model=List[AgentItem], tags=["Agents"], summary="List agents filtered by area")
def agents(area_id: str | None = None, x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    rows = load("agents.json")
    return [r for r in rows if area_id is None or r["area_id"] == area_id]


@app.get("/areas", response_model=List[AreaItem], tags=["Areas"], summary="List distinct areas and area types")
def areas(x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    rows = load("agents.json")
    seen = {}
    for r in rows:
        seen.setdefault(r["area_id"], r["area_type"])
    return [{"area_id": a, "area_type": t} for a, t in sorted(seen.items())]


@app.get("/metrics", response_model=MetricsResponse, tags=["Metrics"], summary="Model evaluation metrics & baselines")
def metrics(x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    return load("metrics.json")


@app.get("/agents/{agent_id}/plan", response_model=PlanResponse, tags=["Agents"], summary="Day-ahead liquidity plan & SHAP reasons")
def agent_plan(agent_id: str, date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
               risk: str = Query("0.9", pattern=r"^(0\.8|0\.9|0\.95)$"),
               x_api_key: str | None = Header(None)):
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


@app.post("/agents/{agent_id}/feedback", response_model=FeedbackResponse, tags=["Agents"], summary="Submit agent advisory feedback")
def agent_feedback(agent_id: str, payload: FeedbackRequest, x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    out_file = ARTIFACTS / "feedback.jsonl"
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_id": agent_id,
        **payload.model_dump(),
    }
    with open(out_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return {"ok": True}


@app.get("/agents/{agent_id}/lost-demand", response_model=AgentLostDemandResponse, tags=["Agents"], summary="Weekly unserved demand & lost commission")
def agent_lost(agent_id: str, week: str = Query(..., pattern=r"^\d{4}-W\d{2}$"),
               x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    doc = load(f"lost_demand/{week}.json")
    a = doc["agents"].get(agent_id, {"lost_count": 0, "lost_amount": 0,
                                     "lost_commission": 0})
    return {"week": week, "agent_id": agent_id, **a}


@app.get("/areas/{area_id}/risk", response_model=AreaRiskResponse, tags=["Areas"], summary="Area-level agent stockout risks")
def area_risk(area_id: str, date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
              x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    doc = load(f"area_risk/{date}.json")
    if area_id not in doc["areas"]:
        raise HTTPException(404, f"area {area_id} not in risk for {date}")
    return {"date": date, "area_id": area_id, "agents": doc["areas"][area_id]}


@app.get("/areas/lost-demand", response_model=AreaLostDemandResponse, tags=["Areas"], summary="Area-wide weekly unserved demand")
def area_lost(week: str = Query(..., pattern=r"^\d{4}-W\d{2}$"),
              x_api_key: str | None = Header(None)):
    check_key(x_api_key)
    doc = load(f"lost_demand/{week}.json")
    return {"week": week, "areas": doc["areas"]}
