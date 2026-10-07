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


@router.get("/version", summary="Model and service version metadata")
def version():
    """Version probe for release verification."""
    return {
        "app_name": settings.app_name,
        "app_version": settings.app_version,
        "model_version": "1.0.0",
        "env": settings.env,
    }
