from fastapi import APIRouter, Depends
from api.dependencies import verify_api_key
from api.schemas import MetricsResponse
from api.services.plan_service import load_artifact

router = APIRouter(prefix="/metrics", tags=["Metrics"], dependencies=[Depends(verify_api_key)])


@router.get("", response_model=MetricsResponse, summary="Model evaluation metrics & baselines")
def get_metrics() -> dict:
    return load_artifact("metrics.json")
