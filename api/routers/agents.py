from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Path as FPath, Query, status

from api.dependencies import AuthUser, get_agent_area_id, get_current_user, verify_api_key
from api.schemas import (
    AgentItem,
    PlanResponse,
    FeedbackRequest,
    FeedbackResponse,
    AgentLostDemandResponse,
)
from api.services.plan_service import (
    load_artifact,
    ensure_plan,
    ensure_lost_demand,
    save_feedback,
)

router = APIRouter(prefix="/agents", tags=["Agents"], dependencies=[Depends(verify_api_key)])


@router.get("", response_model=List[AgentItem], summary="List agents filtered by area")
def list_agents(
    area_id: Annotated[str | None, Query()] = None,
    current_user: AuthUser = Depends(get_current_user),
) -> List[AgentItem]:
    rows = load_artifact("agents.json")
    if current_user.role == "agent":
        return [r for r in rows if r.get("agent_id") == current_user.agent_id]
    if current_user.role == "manager":
        if area_id is not None and area_id != current_user.area_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: manager cannot access area {area_id}",
            )
        return [r for r in rows if r.get("area_id") == current_user.area_id]
    return [r for r in rows if area_id is None or r.get("area_id") == area_id]


@router.get("/{agent_id}/plan", response_model=PlanResponse, summary="Day-ahead liquidity plan & SHAP reasons")
def get_agent_plan(
    agent_id: Annotated[str, FPath(max_length=32, pattern=r"^[A-Za-z0-9_-]+$")],
    date: Annotated[str, Query(pattern=r"^\d{4}-\d{2}-\d{2}$")],
    risk: Annotated[str, Query(pattern=r"^(0\.8|0\.9|0\.95)$")] = "0.9",
    current_user: AuthUser = Depends(get_current_user),
) -> dict:
    if current_user.role == "agent" and current_user.agent_id != agent_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: agent cannot access other agents' plans",
        )
    if current_user.role == "manager":
        agent_area = get_agent_area_id(agent_id)
        if agent_area != current_user.area_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: agent does not belong to manager area {current_user.area_id}",
            )

    doc = ensure_plan(date)
    a = doc["agents"].get(agent_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"agent {agent_id} not in plan for {date}")

    res = dict(a)
    if isinstance(res.get("opening_cash"), dict):
        by_level = res["opening_cash"]
        res["opening_cash_by_level"] = by_level
        res["opening_cash"] = by_level.get(risk, by_level.get("0.9", 60000))
    return {"date": date, "agent_id": agent_id, **res}


@router.post("/{agent_id}/feedback", response_model=FeedbackResponse, summary="Submit agent advisory feedback")
def submit_agent_feedback(
    agent_id: Annotated[str, FPath(max_length=32, pattern=r"^[A-Za-z0-9_-]+$")],
    payload: FeedbackRequest = FeedbackRequest(helpful=True),
    current_user: AuthUser = Depends(get_current_user),
) -> FeedbackResponse:
    if current_user.role == "agent" and current_user.agent_id != agent_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: agent cannot submit feedback for other agents",
        )
    if current_user.role == "manager":
        agent_area = get_agent_area_id(agent_id)
        if agent_area != current_user.area_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: agent does not belong to manager area {current_user.area_id}",
            )

    save_feedback(agent_id, payload.model_dump())
    return FeedbackResponse(ok=True)


@router.get("/{agent_id}/lost-demand", response_model=AgentLostDemandResponse, summary="Weekly unserved demand & lost commission")
def get_agent_lost_demand(
    agent_id: Annotated[str, FPath(max_length=32, pattern=r"^[A-Za-z0-9_-]+$")],
    week: Annotated[str, Query(pattern=r"^\d{4}-W\d{2}$")],
    current_user: AuthUser = Depends(get_current_user),
) -> dict:
    if current_user.role == "agent" and current_user.agent_id != agent_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: agent cannot access other agents' lost demand",
        )
    if current_user.role == "manager":
        agent_area = get_agent_area_id(agent_id)
        if agent_area != current_user.area_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: agent does not belong to manager area {current_user.area_id}",
            )

    doc = ensure_lost_demand(week)
    a = doc["agents"].get(agent_id, {"lost_count": 0, "lost_amount": 0, "lost_commission": 0})
    return {"week": week, "agent_id": agent_id, **a}
