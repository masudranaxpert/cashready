"""API request and response schemas for CashReady FastAPI service."""

from api.schemas.system import HealthResponse, FeedbackRequest, FeedbackResponse
from api.schemas.agent import (
    AgentItem,
    ReasonItem,
    PlanResponse,
    AgentLostDemandResponse,
    StockoutConfirmationCreate,
    StockoutConfirmationResponse,
)
from api.schemas.area import (
    AreaItem,
    AreaAgentRiskItem,
    AreaRiskResponse,
    AreaLostDemandItem,
    AreaLostDemandResponse,
    AreaImpactAgentItem,
    AreaImpactResponse,
)
from api.schemas.metrics import MetricsResponse

__all__ = [
    "HealthResponse",
    "FeedbackRequest",
    "FeedbackResponse",
    "AgentItem",
    "ReasonItem",
    "PlanResponse",
    "AgentLostDemandResponse",
    "StockoutConfirmationCreate",
    "StockoutConfirmationResponse",
    "AreaItem",
    "AreaAgentRiskItem",
    "AreaRiskResponse",
    "AreaLostDemandItem",
    "AreaLostDemandResponse",
    "AreaImpactAgentItem",
    "AreaImpactResponse",
    "MetricsResponse",
]
