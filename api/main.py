from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.routers import system, agents, areas, metrics

tags_metadata = [
    {"name": "System", "description": "Healthcheck and runtime readiness probes."},
    {"name": "Agents", "description": "Agent profiles, day-ahead liquidity plans, unserved demand, and feedback."},
    {"name": "Areas", "description": "Area classifications, agent risk distributions, and weekly aggregations."},
    {"name": "Metrics", "description": "Pipeline metrics, detector F1, recovery MAE, and business impact."},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Readiness audit on startup
    if not settings.artifacts_dir.exists():
        print(f"Warning: Artifacts directory not found at {settings.artifacts_dir}")
    yield


def create_app() -> FastAPI:
    """Application factory applying modern FastAPI architecture patterns."""
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=settings.app_description,
        openapi_tags=tags_metadata,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    origins = settings.cors_origins
    allow_regex = r".*" if "*" in origins else None
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[] if allow_regex else origins,
        allow_origin_regex=allow_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Modular feature routers
    app.include_router(system.router)
    app.include_router(agents.router)
    app.include_router(areas.router)
    app.include_router(metrics.router)

    return app


app = create_app()
