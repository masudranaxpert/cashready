"""Area classification, cluster risk, and aggregated unserved demand schemas."""

from typing import Dict, List
from pydantic import BaseModel, Field


class AreaItem(BaseModel):
    area_id: str = Field(..., description="Unique area identifier", examples=["A01"])
    area_type: str = Field(..., description="Area type: urban_market, peri_urban, rural", examples=["urban_market"])


class AreaAgentRiskItem(BaseModel):
    agent_id: str = Field(..., description="Unique agent identifier", examples=["T0000"])
    stockout_prob_habit: float = Field(..., description="Stockout probability under habit policy", examples=[0.38])
    risk_hour: int = Field(..., description="Hour of peak liquidity shortfall risk (24h format)", examples=[14])


class AreaRiskResponse(BaseModel):
    date: str = Field(..., description="Evaluation date (YYYY-MM-DD)", examples=["2026-10-02"])
    area_id: str = Field(..., description="Unique area identifier", examples=["A01"])
    agents: List[AreaAgentRiskItem] = Field(..., description="List of agents with risk metrics in area")


class AreaLostDemandItem(BaseModel):
    lost_count: float = Field(..., description="Total unserved transactions across area agents", examples=[45.0])
    lost_amount: float = Field(..., description="Total lost withdrawal demand in BDT", examples=[68400.0])
    demand_shift: int = Field(..., description="Digital payment substitution flag (1 = active shift)", examples=[1])


class AreaLostDemandResponse(BaseModel):
    week: str = Field(..., description="ISO week identifier (YYYY-Www)", examples=["2026-W40"])
    areas: Dict[str, AreaLostDemandItem] = Field(..., description="Aggregated unserved demand mapped by area ID")
