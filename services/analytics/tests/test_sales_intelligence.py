import pytest
from app.services.intelligence import (
    calculate_sales_velocity,
    calculate_forecast,
    calculate_pipeline_conversion,
)

def test_sales_velocity_calculation():
    # V = (N * S * W) / T
    # N = 10 opps, S = $50,000, W = 40% (0.4), T = 45 days
    # Expected: (10 * 50000 * 0.4) / 45 = 200,000 / 45 = 4444.44
    res = calculate_sales_velocity(
        open_opps_count=10,
        avg_deal_size=50000.0,
        win_rate_percentage=40.0,
        avg_cycle_days=45.0,
    )
    
    assert res["velocity_per_day"] == 4444.44
    assert res["velocity_per_month"] == 133333.33
    assert res["formula"] == "V = (N * S * W) / T"

def test_sales_forecast_tiers():
    opps = [
        {"id": "opp-1", "amount": 100000, "probability": 0.9, "status": "OPEN"}, # Commit & Best Case
        {"id": "opp-2", "amount": 50000, "probability": 0.6, "status": "OPEN"},  # Best Case only
        {"id": "opp-3", "amount": 80000, "probability": 0.2, "status": "OPEN"},  # Pipeline only
    ]
    closed_won = 150000.0
    
    res = calculate_forecast(opps, closed_won_revenue=closed_won)
    
    # Commit: Closed Won + Opp 1 = 150,000 + 100,000 = 250,000
    assert res["commit_forecast"] == 250000.0
    # Best Case: Closed Won + Opp 1 + Opp 2 = 150,000 + 150,000 = 300,000
    assert res["best_case_forecast"] == 300000.0
    # Weighted: 150,000 + (100k*0.9 + 50k*0.6 + 80k*0.2) = 150,000 + 90,000 + 30,000 + 16,000 = 286,000
    assert res["weighted_expected_forecast"] == 286000.0
    assert res["total_active_pipeline"] == 230000.0

def test_pipeline_conversion_and_bottleneck_detection():
    stages = [
        {"name": "Discovery", "count": 100, "total_value": 1000000},
        {"name": "Qualification", "count": 80, "total_value": 850000},  # 80%
        {"name": "Proposal", "count": 20, "total_value": 300000},       # 25% drop-off bottleneck!
        {"name": "Closed Won", "count": 15, "total_value": 250000},     # 75%
    ]
    
    res = calculate_pipeline_conversion(stages)
    assert len(res["funnel"]) == 4
    assert res["bottleneck"] is not None
    assert res["bottleneck"]["stage"] == "Proposal"
    assert res["bottleneck"]["conversion_rate"] == 25.0
