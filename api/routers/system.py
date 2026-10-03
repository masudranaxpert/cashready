from fastapi import APIRouter
from api.config import settings
from api.schemas import HealthResponse

router = APIRouter(tags=["System"])


@router.get("/health", response_model=HealthResponse, summary="Service health status")
def health() -> HealthResponse:
    """Readiness probe checking availability of core artifacts."""
    ok = (settings.artifacts_dir / "metrics.json").exists()
    return HealthResponse(
        status="ok" if ok else "degraded",
        artifacts_dir=str(settings.artifacts_dir),
    )
