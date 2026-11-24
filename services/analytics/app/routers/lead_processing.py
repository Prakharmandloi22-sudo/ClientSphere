from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from app.services.normalizer import normalize_lead_record
from app.services.deduplicator import detect_duplicates
from app.services.scorer import score_lead

router = APIRouter(prefix="/api/v1/lead-processing", tags=["Lead Processing"])

class LeadInput(BaseModel):
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    email: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = Field(None, alias="companyName")
    title: Optional[str] = None

    class Config:
        populate_by_name = True

class NormalizeRequest(BaseModel):
    leads: List[LeadInput]

class DeduplicateRequest(BaseModel):
    candidate: LeadInput
    existing_records: List[Dict[str, Any]]
    threshold: Optional[float] = 0.80

class ScoreRequest(BaseModel):
    lead: LeadInput
    custom_weights: Optional[Dict[str, float]] = None

class BatchProcessRequest(BaseModel):
    rows: List[LeadInput]
    existing_records: Optional[List[Dict[str, Any]]] = []

@router.post("/normalize")
def normalize_leads(req: NormalizeRequest):
    results = [normalize_lead_record(l.model_dump()) for l in req.leads]
    return {"success": True, "count": len(results), "data": results}

@router.post("/deduplicate")
def deduplicate_lead(req: DeduplicateRequest):
    normalized = normalize_lead_record(req.candidate.model_dump())
    matches = detect_duplicates(normalized, req.existing_records, threshold=req.threshold or 0.80)
    return {
        "success": True,
        "is_duplicate_candidate": len(matches) > 0,
        "matches_count": len(matches),
        "matches": matches,
    }

@router.post("/score")
def score_single_lead(req: ScoreRequest):
    data = req.lead.model_dump()
    score, factors = score_lead(data, weights=req.custom_weights)
    return {
        "success": True,
        "score": score,
        "tier": "HOT" if score >= 80 else "WARM" if score >= 50 else "COLD",
        "factors": factors,
    }

@router.post("/process-batch")
def process_batch(req: BatchProcessRequest):
    valid_records = []
    duplicate_records = []
    invalid_records = []

    for idx, row in enumerate(req.rows):
        row_dict = row.model_dump()
        email = row_dict.get("email")

        if not email or "@" not in email:
            invalid_records.append({
                "row_index": idx,
                "data": row_dict,
                "error": "Missing or malformed email address",
            })
            continue

        normalized = normalize_lead_record(row_dict)
        duplicates = detect_duplicates(normalized, req.existing_records or [], threshold=0.85)

        score, factors = score_lead(normalized)
        record_output = {
            **normalized,
            "score": score,
            "score_factors": factors,
        }

        if duplicates:
            duplicate_records.append({
                "row_index": idx,
                "record": record_output,
                "duplicates": duplicates,
            })
        else:
            valid_records.append(record_output)

    return {
        "success": True,
        "summary": {
            "total_processed": len(req.rows),
            "valid_count": len(valid_records),
            "duplicate_count": len(duplicate_records),
            "invalid_count": len(invalid_records),
        },
        "valid_records": valid_records,
        "duplicate_records": duplicate_records,
        "invalid_records": invalid_records,
    }
