"""Evaluation metrics and benchmark comparison schemas."""

from typing import Any, Dict
from pydantic import BaseModel, Field


class MetricsResponse(BaseModel):
    forecast_metrics: Dict[str, Any] = Field(..., description="Quantile forecast pinball and calibration metrics")
    detector_metrics: Dict[str, Any] = Field(..., description="Stock-out detection F1, precision, and recall scores")
    recovery_metrics: Dict[str, Any] = Field(..., description="Censored demand recovery MAE comparisons")
    business_sim_metrics: Dict[str, Any] = Field(..., description="Policy simulation results vs habit policy")
