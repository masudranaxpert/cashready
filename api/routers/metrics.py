from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import AuthUser, get_current_user, verify_api_key
from api.schemas import MetricsResponse
from api.services.plan_service import load_artifact

router = APIRouter(prefix="/metrics", tags=["Metrics"], dependencies=[Depends(verify_api_key)])


@router.get("", response_model=MetricsResponse, summary="Model evaluation metrics & baselines")
def get_metrics(current_user: AuthUser = Depends(get_current_user)) -> dict:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: global metrics access restricted to administrator",
        )
    return load_artifact("metrics.json")
