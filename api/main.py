import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from fastapi import Depends, FastAPI, Header, HTTPException, Path as FPath, Query, status
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
cors_origins = [o.strip() for o in FRONTEND_ORIGIN.split(",") if o.strip()] if FRONTEND_ORIGIN != "*" else ["*"]

tags_metadata = [
    {"name": "System", "description": "Healthcheck and runtime readiness probes."},
    {"name": "Agents", "description": "Agent profiles, day-ahead liquidity plans, unserved demand, and feedback."},
    {"name": "Areas", "description": "Area classifications, agent risk distributions, and weekly aggregations."},
    {"name": "Metrics", "description": "Pipeline metrics, detector F1, recovery MAE, and business impact."},
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
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

_CACHE: Dict[str, tuple[float, Any]] = {}


def verify_api_key(x_api_key: str | None = Header(None)):
    """Constant-time token verification protecting against side-channel timing attacks."""
    if API_KEY and (not x_api_key or not secrets.compare_digest(x_api_key, API_KEY)):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")


def load(rel: str) -> dict:
    """Load JSON artifact with safe path boundary check and mtime caching."""
    p = (ARTIFACTS / rel).resolve()
    if not p.is_relative_to(ARTIFACTS.resolve()) or not p.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"artifact not found: {rel}")

    mtime = p.stat().st_mtime
    cached = _CACHE.get(rel)
    if cached and cached[0] == mtime:
        return cached[1]

    data = json.loads(p.read_text(encoding="utf-8"))
    _CACHE[rel] = (mtime, data)
    return data


@app.get("/health", response_model=HealthResponse, tags=["System"], summary="Service health status")
def health():
    ok = (ARTIFACTS / "metrics.json").exists()
    return {"status": "ok" if ok else "degraded", "artifacts_dir": str(ARTIFACTS)}


@app.get("/agents", response_model=List[AgentItem], tags=["Agents"], summary="List agents filtered by area", dependencies=[Depends(verify_api_key)])
def agents(area_id: str | None = None):
    rows = load("agents.json")
    return [r for r in rows if area_id is None or r["area_id"] == area_id]


@app.get("/areas", response_model=List[AreaItem], tags=["Areas"], summary="List distinct areas and area types", dependencies=[Depends(verify_api_key)])
def areas():
    rows = load("agents.json")
    seen = {}
    for r in rows:
        seen.setdefault(r["area_id"], r["area_type"])
    return [{"area_id": a, "area_type": t} for a, t in sorted(seen.items())]


@app.get("/metrics", response_model=MetricsResponse, tags=["Metrics"], summary="Model evaluation metrics & baselines", dependencies=[Depends(verify_api_key)])
def metrics():
    return load("metrics.json")


@app.get("/agents/{agent_id}/plan", response_model=PlanResponse, tags=["Agents"], summary="Day-ahead liquidity plan & SHAP reasons", dependencies=[Depends(verify_api_key)])
def agent_plan(
    agent_id: str = FPath(..., max_length=32, pattern=r"^[A-Za-z0-9_-]+$"),
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    risk: str = Query("0.9", pattern=r"^(0\.8|0\.9|0\.95)$"),
):
    doc = load(f"plans/{date}.json")
    a = doc["agents"].get(agent_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"agent {agent_id} not in plan for {date}")
    res = dict(a)
    if isinstance(res.get("opening_cash"), dict):
        by_level = res["opening_cash"]
        res["opening_cash_by_level"] = by_level
        res["opening_cash"] = by_level.get(risk, by_level.get("0.9", 60000))
    return {"date": date, "agent_id": agent_id, **res}


@app.post("/agents/{agent_id}/feedback", response_model=FeedbackResponse, tags=["Agents"], summary="Submit agent advisory feedback", dependencies=[Depends(verify_api_key)])
def agent_feedback(
    agent_id: str = FPath(..., max_length=32, pattern=r"^[A-Za-z0-9_-]+$"),
    payload: FeedbackRequest = FeedbackRequest(helpful=True),
):
    out_file = ARTIFACTS / "feedback.jsonl"
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_id": agent_id,
        **payload.model_dump(),
    }
    with open(out_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return {"ok": True}


@app.get("/agents/{agent_id}/lost-demand", response_model=AgentLostDemandResponse, tags=["Agents"], summary="Weekly unserved demand & lost commission", dependencies=[Depends(verify_api_key)])
def agent_lost(
    agent_id: str = FPath(..., max_length=32, pattern=r"^[A-Za-z0-9_-]+$"),
    week: str = Query(..., pattern=r"^\d{4}-W\d{2}$"),
):
    doc = load(f"lost_demand/{week}.json")
    a = doc["agents"].get(agent_id, {"lost_count": 0, "lost_amount": 0, "lost_commission": 0})
    return {"week": week, "agent_id": agent_id, **a}


@app.get("/areas/{area_id}/risk", response_model=AreaRiskResponse, tags=["Areas"], summary="Area-level agent stockout risks", dependencies=[Depends(verify_api_key)])
def area_risk(
    area_id: str = FPath(..., max_length=32, pattern=r"^[A-Za-z0-9_-]+$"),
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
):
    doc = load(f"area_risk/{date}.json")
    if area_id not in doc["areas"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"area {area_id} not in risk for {date}")
    return {"date": date, "area_id": area_id, "agents": doc["areas"][area_id]}


@app.get("/areas/lost-demand", response_model=AreaLostDemandResponse, tags=["Areas"], summary="Area-wide weekly unserved demand", dependencies=[Depends(verify_api_key)])
def area_lost(
    week: str = Query(..., pattern=r"^\d{4}-W\d{2}$"),
):
    doc = load(f"lost_demand/{week}.json")
    return {"week": week, "areas": doc["areas"]}
