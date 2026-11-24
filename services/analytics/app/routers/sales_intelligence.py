from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.services.intelligence import (
    calculate_sales_velocity,
    calculate_forecast,
    calculate_pipeline_conversion,
)

router = APIRouter(prefix="/api/v1/sales-intelligence", tags=["Sales Intelligence"])

class VelocityRequest(BaseModel):
    open_opportunities: int = Field(..., ge=0)
    average_deal_size: float = Field(..., ge=0.0)
    win_rate_percentage: float = Field(..., ge=0.0, le=100.0)
    sales_cycle_days: float = Field(..., gt=0.0)

class OpportunityItem(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    amount: float = Field(0.0, ge=0.0)
    probability: float = Field(0.1, ge=0.0, le=1.0)
    status: str = Field("OPEN")

class ForecastRequest(BaseModel):
    opportunities: List[OpportunityItem]
    closed_won_revenue: float = Field(0.0, ge=0.0)

class StageItem(BaseModel):
    name: str
    stage_order: int
    count: int = 0
    total_value: float = 0.0

class ConversionRequest(BaseModel):
    stages: List[StageItem]

@router.post("/velocity")
def get_sales_velocity(req: VelocityRequest):
    return {
        "success": True,
        "data": calculate_sales_velocity(
            open_opps_count=req.open_opportunities,
            avg_deal_size=req.average_deal_size,
            win_rate_percentage=req.win_rate_percentage,
            avg_cycle_days=req.sales_cycle_days,
        ),
    }

@router.post("/forecast")
def get_sales_forecast(req: ForecastRequest):
    opps = [o.model_dump() for o in req.opportunities]
    return {
        "success": True,
        "data": calculate_forecast(
            opportunities=opps,
            closed_won_revenue=req.closed_won_revenue,
        ),
    }

@router.post("/conversion")
def get_pipeline_conversion(req: ConversionRequest):
    stages = [s.model_dump() for s in req.stages]
    return {
        "success": True,
        "data": calculate_pipeline_conversion(stages_data=stages),
    }
