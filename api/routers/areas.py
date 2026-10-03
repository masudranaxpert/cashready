from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Path as FPath, Query, status

from api.dependencies import verify_api_key
from api.schemas import (
    AreaItem,
    AreaRiskResponse,
    AreaLostDemandResponse,
)
from api.services.plan_service import (
    load_artifact,
    ensure_area_risk,
    ensure_lost_demand,
)

router = APIRouter(prefix="/areas", tags=["Areas"], dependencies=[Depends(verify_api_key)])


@router.get("", response_model=List[AreaItem], summary="List distinct areas and area types")
def list_areas() -> List[AreaItem]:
    rows = load_artifact("agents.json")
    seen = {}
    for r in rows:
        seen.setdefault(r["area_id"], r["area_type"])
    return [AreaItem(area_id=a, area_type=t) for a, t in sorted(seen.items())]


@router.get("/{area_id}/risk", response_model=AreaRiskResponse, summary="Area-level agent stockout risks")
def get_area_risk(
    area_id: Annotated[str, FPath(max_length=32, pattern=r"^[A-Za-z0-9_-]+$")],
    date: Annotated[str, Query(pattern=r"^\d{4}-\d{2}-\d{2}$")],
) -> dict:
    doc = ensure_area_risk(date)
    if area_id not in doc["areas"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"area {area_id} not in risk for {date}")
    return {"date": date, "area_id": area_id, "agents": doc["areas"][area_id]}


@router.get("/lost-demand", response_model=AreaLostDemandResponse, summary="Area-wide weekly unserved demand")
def get_area_lost_demand(
    week: Annotated[str, Query(pattern=r"^\d{4}-W\d{2}$")],
) -> dict:
    doc = ensure_lost_demand(week)
    return {"week": week, "areas": doc["areas"]}
