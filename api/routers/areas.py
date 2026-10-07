from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Path as FPath, Query, status

from api.dependencies import AuthUser, get_current_user, verify_api_key
from api.schemas import (
    AreaItem,
    AreaRiskResponse,
    AreaLostDemandResponse,
    StockoutConfirmationResponse,
    AreaImpactResponse,
)
from api.services.plan_service import (
    load_artifact,
    ensure_area_risk,
    ensure_lost_demand,
    get_confirmations,
    get_area_impact,
)

router = APIRouter(prefix="/areas", tags=["Areas"], dependencies=[Depends(verify_api_key)])


@router.get("", response_model=List[AreaItem], summary="List distinct areas and area types")
def list_areas(current_user: AuthUser = Depends(get_current_user)) -> List[AreaItem]:
    if current_user.role == "agent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: agent cannot access area endpoints",
        )

    rows = load_artifact("agents.json")
    seen = {}
    for r in rows:
        aid = r.get("area_id")
        atype = r.get("area_type")
        if current_user.role == "manager" and aid != current_user.area_id:
            continue
        if aid:
            seen.setdefault(aid, atype)
    return [AreaItem(area_id=a, area_type=t) for a, t in sorted(seen.items())]


@router.get("/{area_id}/risk", response_model=AreaRiskResponse, summary="Area-level agent stockout risks")
def get_area_risk(
    area_id: Annotated[str, FPath(max_length=32, pattern=r"^[A-Za-z0-9_-]+$")],
    date: Annotated[str, Query(pattern=r"^\d{4}-\d{2}-\d{2}$")],
    current_user: AuthUser = Depends(get_current_user),
) -> dict:
    if current_user.role == "agent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: agent cannot access area endpoints",
        )
    if current_user.role == "manager" and current_user.area_id != area_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: manager cannot access area {area_id}",
        )

    doc = ensure_area_risk(date)
    if area_id not in doc["areas"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"area {area_id} not in risk for {date}")
    return {"date": date, "area_id": area_id, "agents": doc["areas"][area_id]}


@router.get("/lost-demand", response_model=AreaLostDemandResponse, summary="Area-wide weekly unserved demand")
def get_area_lost_demand(
    week: Annotated[str, Query(pattern=r"^\d{4}-W\d{2}$")],
    current_user: AuthUser = Depends(get_current_user),
) -> dict:
    if current_user.role == "agent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: agent cannot access area endpoints",
        )

    doc = ensure_lost_demand(week)
    if current_user.role == "manager":
        filtered = {k: v for k, v in doc["areas"].items() if k == current_user.area_id}
        return {"week": week, "areas": filtered}
    return {"week": week, "areas": doc["areas"]}


@router.get("/{area_id}/confirmations", response_model=List[StockoutConfirmationResponse], summary="Get area agents stock-out confirmations")
def list_area_confirmations(
    area_id: Annotated[str, FPath(max_length=32, pattern=r"^[A-Za-z0-9_-]+$")],
    days: Annotated[int, Query(ge=1, le=90)] = 30,
    current_user: AuthUser = Depends(get_current_user),
) -> List[StockoutConfirmationResponse]:
    if current_user.role == "agent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: agent cannot access area confirmations",
        )
    if current_user.role == "manager" and current_user.area_id != area_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: manager cannot access area {area_id}",
        )

    results = get_confirmations(area_id=area_id, days=days)
    return [StockoutConfirmationResponse(**r) for r in results]


@router.get("/{area_id}/impact", response_model=AreaImpactResponse, summary="Area business impact aggregated server-side")
def get_area_business_impact(
    area_id: Annotated[str, FPath(max_length=32, pattern=r"^[A-Za-z0-9_-]+$")],
    days: Annotated[int, Query(ge=1, le=90)] = 30,
    current_user: AuthUser = Depends(get_current_user),
) -> AreaImpactResponse:
    if current_user.role == "agent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: agent cannot access area impact",
        )
    if current_user.role == "manager" and current_user.area_id != area_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: manager cannot access area {area_id}",
        )

    res = get_area_impact(area_id=area_id, days=days)
    return AreaImpactResponse(**res)


