"""System and feedback schema definitions."""

from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service status: ok or degraded", examples=["ok"])
    artifacts_dir: str = Field(..., description="Path to serving artifacts", examples=["artifacts/serve"])


class FeedbackRequest(BaseModel):
    helpful: bool = Field(..., description="Whether the recommendation was helpful")
    comment: Optional[str] = Field(None, description="Optional user comment", examples=["Useful advice"])


class FeedbackResponse(BaseModel):
    ok: bool = Field(True, description="Submission confirmation flag", examples=[True])
