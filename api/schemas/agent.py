"""Agent, plan, and unserved demand schema definitions."""

from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field, model_validator


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


class StockoutConfirmationCreate(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Reported date (YYYY-MM-DD)", examples=["2026-10-02"])
    cash_ran_out: bool = Field(..., description="Whether agent ran out of cash")
    from_hour: Optional[int] = Field(None, ge=0, le=23, description="Hour when cash ran out (0-23)", examples=[13])
    to_hour: Optional[int] = Field(None, ge=0, le=23, description="Hour when cash was replenished or shop closed (0-23)", examples=[15])
    customers_turned_away: Optional[int] = Field(None, ge=0, description="Estimated number of customers turned away", examples=[4])
    kept_recommended_cash: Literal["yes", "partly", "no"] = Field(..., description="Whether recommended cash was held", examples=["yes"])
    opening_cash_kept: Optional[float] = Field(None, ge=0.0, description="Actual opening cash amount kept (BDT)", examples=[60000.0])

    @model_validator(mode="after")
    def validate_hours(self):
        if self.cash_ran_out:
            if self.from_hour is not None and self.to_hour is not None:
                if self.from_hour > self.to_hour:
                    raise ValueError("from_hour cannot exceed to_hour")
        return self


class StockoutConfirmationResponse(BaseModel):
    id: str = Field(..., description="Unique confirmation identifier", examples=["conf_1a2b3c4d"])
    timestamp: str = Field(..., description="ISO 8601 UTC submission timestamp")
    agent_id: str = Field(..., description="Agent identifier", examples=["T0000"])
    area_id: str = Field(..., description="Assigned geographic cluster area", examples=["A01"])
    model_version: str = Field(..., description="Active model version", examples=["v1.2-temporal"])
    date: str
    cash_ran_out: bool
    from_hour: Optional[int] = None
    to_hour: Optional[int] = None
    customers_turned_away: Optional[int] = None
    kept_recommended_cash: Literal["yes", "partly", "no"]
    opening_cash_kept: Optional[float] = None

