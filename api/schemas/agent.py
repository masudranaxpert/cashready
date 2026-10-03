"""Agent, plan, and unserved demand schema definitions."""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class AgentItem(BaseModel):
    agent_id: str = Field(..., description="Unique agent identifier", examples=["T0000"])
    area_id: str = Field(..., description="Assigned geographic cluster area", examples=["A01"])
    area_type: str = Field(..., description="Area classification: urban_market, peri_urban, rural", examples=["urban_market"])
    lat: float = Field(..., description="Latitude coordinate", examples=[23.7501])
    lon: float = Field(..., description="Longitude coordinate", examples=[90.3802])
    is_new: bool = Field(..., description="Whether agent joined within the last 7 days", examples=[False])


class ReasonItem(BaseModel):
    key: str = Field(..., description="Feature identifier", examples=["salary_window"])
    label_bn: str = Field(..., description="Bangla explanation label", examples=["মাসের বেতনের সময়"])
    label_en: Optional[str] = Field(None, description="English explanation label", examples=["Salary window"])
    impact: float = Field(..., description="SHAP feature impact score", examples=[0.32])


class PlanResponse(BaseModel):
    date: str = Field(..., description="Plan date (YYYY-MM-DD)", examples=["2026-10-02"])
    agent_id: str = Field(..., description="Unique agent identifier", examples=["T0000"])
    opening_cash: int = Field(..., description="Calibrated opening cash recommendation (BDT)", examples=[66000])
    opening_cash_by_level: Optional[Dict[str, int]] = Field(
        None, description="Opening cash amounts by risk tier (0.8, 0.9, 0.95)"
    )
    stockout_prob_plan: Dict[str, float] = Field(
        ..., description="Predicted stockout probability under recommended plan by risk tier"
    )
    stockout_prob_habit: Dict[str, float] = Field(
        ..., description="Historical baseline stockout probability under habit policy"
    )
    risk_hour: int = Field(..., description="Hour of peak liquidity shortfall risk (24h format)", examples=[13])
    reasons: List[ReasonItem] = Field(..., description="Top SHAP feature drivers explaining recommendation")
    message_bn: str = Field(..., description="Advisory message in Bengali")
    message_en: Optional[str] = Field(None, description="Advisory message in English")


class AgentLostDemandResponse(BaseModel):
    week: str = Field(..., description="ISO week identifier (YYYY-Www)", examples=["2026-W40"])
    agent_id: str = Field(..., description="Unique agent identifier", examples=["T0000"])
    lost_count: float = Field(..., description="Estimated number of unserved transactions", examples=[12.0])
    lost_amount: float = Field(..., description="Estimated lost withdrawal demand (BDT)", examples=[18500.0])
    lost_commission: float = Field(..., description="Estimated lost agent commission (BDT)", examples=[333.0])
