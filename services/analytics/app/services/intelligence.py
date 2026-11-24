from typing import List, Dict, Any

def calculate_sales_velocity(
    open_opps_count: int,
    avg_deal_size: float,
    win_rate_percentage: float,
    avg_cycle_days: float
) -> Dict[str, Any]:
    """
    Calculates Sales Velocity: V = (N * S * W) / T
    - N: Number of Opportunities in Pipeline
    - S: Average Deal Size ($)
    - W: Win Rate (Decimal 0.0 to 1.0)
    - T: Average Sales Cycle Length (Days)
    Returns estimated revenue generated per day and per month.
    """
    if avg_cycle_days <= 0:
        avg_cycle_days = 30.0

    win_rate_decimal = max(0.0, min(1.0, win_rate_percentage / 100.0 if win_rate_percentage > 1.0 else win_rate_percentage))
    velocity_per_day = (open_opps_count * avg_deal_size * win_rate_decimal) / avg_cycle_days
    velocity_per_month = velocity_per_day * 30.0

    return {
        "inputs": {
            "open_opportunities": open_opps_count,
            "average_deal_size": avg_deal_size,
            "win_rate_percentage": round(win_rate_decimal * 100, 2),
            "cycle_days": avg_cycle_days,
        },
        "velocity_per_day": round(velocity_per_day, 2),
        "velocity_per_month": round(velocity_per_month, 2),
        "formula": "V = (N * S * W) / T",
        "explanation": f"Pipeline produces approximately ${round(velocity_per_day, 2):,} in new business revenue per day."
    }

def calculate_forecast(
    opportunities: List[Dict[str, Any]],
    closed_won_revenue: float = 0.0
) -> Dict[str, Any]:
    """
    Calculates 3-tier sales forecast: Commit, Best Case, and Expected Weighted Value.
    - Closed Won: Authoritative booked revenue
    - Commit: Closed Won + Open Deals with probability >= 80% (High Confidence)
    - Best Case: Closed Won + Open Deals with probability >= 50% (Moderate to High Confidence)
    - Weighted: Closed Won + Sum(Deal Amount * Stage Probability)
    """
    commit_additional = 0.0
    best_case_additional = 0.0
    weighted_additional = 0.0
    total_pipeline = 0.0

    deals_in_commit = 0
    deals_in_best_case = 0

    for opp in opportunities:
        if opp.get("status") == "OPEN":
            amount = float(opp.get("amount", 0.0) or 0.0)
            prob = float(opp.get("probability", 0.1) or 0.1)
            total_pipeline += amount
            weighted_additional += (amount * prob)

            if prob >= 0.8:
                commit_additional += amount
                deals_in_commit += 1
            if prob >= 0.5:
                best_case_additional += amount
                deals_in_best_case += 1

    return {
        "closed_won_revenue": round(closed_won_revenue, 2),
        "commit_forecast": round(closed_won_revenue + commit_additional, 2),
        "best_case_forecast": round(closed_won_revenue + best_case_additional, 2),
        "weighted_expected_forecast": round(closed_won_revenue + weighted_additional, 2),
        "total_active_pipeline": round(total_pipeline, 2),
        "breakdown": {
            "commit_open_deals_count": deals_in_commit,
            "best_case_open_deals_count": deals_in_best_case,
            "commit_additional_amount": round(commit_additional, 2),
            "best_case_additional_amount": round(best_case_additional, 2),
        }
    }

def calculate_pipeline_conversion(stages_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculates stage-to-stage transition conversion rates and identifies bottlenecks."""
    funnel = []
    total_stages = len(stages_data)

    for i, stage in enumerate(stages_data):
        current_count = stage.get("count", 0)
        conversion_from_previous = 100.0
        
        if i > 0 and stages_data[i-1].get("count", 0) > 0:
            prev_count = stages_data[i-1].get("count", 0)
            conversion_from_previous = round((current_count / prev_count) * 100, 2)

        funnel.append({
            "stage_name": stage.get("name"),
            "stage_order": stage.get("stage_order", i + 1),
            "count": current_count,
            "value": stage.get("total_value", 0.0),
            "conversion_from_previous_stage": conversion_from_previous,
        })

    # Detect lowest conversion stage (bottleneck)
    bottleneck = None
    if len(funnel) > 1:
        min_conv = 100.0
        for item in funnel[1:]:
            if item["conversion_from_previous_stage"] < min_conv:
                min_conv = item["conversion_from_previous_stage"]
                bottleneck = {
                    "stage": item["stage_name"],
                    "conversion_rate": min_conv,
                    "insight": f"Significant drop-off detected entering '{item['stage_name']}'. Review sales qualification criteria."
                }

    return {
        "funnel": funnel,
        "bottleneck": bottleneck,
    }
