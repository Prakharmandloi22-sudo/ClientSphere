import pytest
from app.services.normalizer import normalize_email, normalize_phone, clean_company_name, normalize_lead_record
from app.services.deduplicator import levenshtein_ratio, detect_duplicates
from app.services.scorer import score_lead

def test_normalization():
    assert normalize_email("  User.Test@Company.COM ") == "user.test@company.com"
    assert normalize_phone("(555) 019-2834") == "+15550192834"
    assert clean_company_name("Acme Cloud Solutions, Inc.") == "Acme Cloud Solutions"
    
    lead = {
        "firstName": "  sarah ",
        "lastName": " connor  ",
        "email": "Sarah@SkynetDefense.com ",
        "phone": "555-4433",
        "companyName": "Skynet Defense LLC.",
        "title": "chief technology officer"
    }
    normalized = normalize_lead_record(lead)
    assert normalized["first_name"] == "Sarah"
    assert normalized["last_name"] == "Connor"
    assert normalized["normalized_email"] == "sarah@skynetdefense.com"
    assert normalized["company_name"] == "Skynet Defense"
    assert normalized["title"] == "Chief Technology Officer"

def test_levenshtein_ratio():
    assert levenshtein_ratio("Skynet", "Skynet") == 1.0
    assert levenshtein_ratio("Acme Corp", "Acme Corpp") > 0.85
    assert levenshtein_ratio("Google", "Microsoft") < 0.3

def test_deduplication_exact_email():
    candidate = {"normalized_email": "alice@acme.com", "first_name": "Alice", "company_name": "Acme"}
    existing = [{"id": "lead-1", "normalized_email": "alice@acme.com", "first_name": "Alice", "company_name": "Acme"}]
    
    matches = detect_duplicates(candidate, existing)
    assert len(matches) == 1
    assert matches[0]["confidence"] == 1.0
    assert "Exact normalized email match" in matches[0]["reasons"][0]

def test_deduplication_fuzzy_name_and_company():
    candidate = {"first_name": "Marcus", "last_name": "Vance", "company_name": "Apex Dynamic", "email": "m.vance@newmail.com"}
    existing = [{"id": "lead-2", "first_name": "Marcus", "last_name": "Vance", "company_name": "Apex Dynamics", "email": "mvance@apexdynamics.io"}]
    
    matches = detect_duplicates(candidate, existing, threshold=0.80)
    assert len(matches) == 1
    assert matches[0]["confidence"] >= 0.85

def test_lead_scoring_and_explainable_factors():
    lead = {
        "email": "elena@enterprise-tech.com",
        "title": "Vice President of Infrastructure",
        "company_name": "Enterprise Tech Systems",
        "phone": "+1-555-0199"
    }
    score, factors = score_lead(lead)
    
    assert score >= 80.0
    assert "corporate_email" in factors
    assert "seniority_title" in factors
    assert "company_identity" in factors
    assert "direct_phone" in factors
