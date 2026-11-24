import re
from typing import Dict, Any, Tuple

DEFAULT_WEIGHTS = {
    "baseline": 10.0,
    "corporate_domain": 30.0,
    "seniority_title": 25.0,
    "company_provided": 20.0,
    "phone_verified": 15.0,
}

SENIORITY_PATTERN = re.compile(
    r"(?i)\b(vp|vice president|director|head|chief|cto|ceo|cfo|cmo|coo|founder|co-founder|president|principal|architect|lead)\b"
)

FREE_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "mail.com", "aol.com", "proton.me", "protonmail.com"
}

def score_lead(lead: Dict[str, Any], weights: Dict[str, float] = None) -> Tuple[float, Dict[str, str]]:
    w = weights if weights else DEFAULT_WEIGHTS
    score = w.get("baseline", 10.0)
    factors: Dict[str, str] = {
        "baseline": f"+{w.get('baseline', 10.0):.1f} (Default initialized weight)"
    }

    email = (lead.get("email") or lead.get("normalized_email") or "").strip().lower()
    if email and "@" in email:
        domain = email.split("@")[1]
        if domain not in FREE_EMAIL_DOMAINS:
            points = w.get("corporate_domain", 30.0)
            score += points
            factors["corporate_email"] = f"+{points:.1f} (Verified business domain: @{domain})"

    title = lead.get("title") or ""
    if SENIORITY_PATTERN.search(title):
        points = w.get("seniority_title", 25.0)
        score += points
        factors["seniority_title"] = f"+{points:.1f} (Executive / Decision Maker title: '{title}')"

    company = lead.get("company_name") or lead.get("companyName") or ""
    if len(company.strip()) >= 2:
        points = w.get("company_provided", 20.0)
        score += points
        factors["company_identity"] = f"+{points:.1f} (Associated company: '{company}')"

    phone = lead.get("phone") or lead.get("normalized_phone") or ""
    if len(re.sub(r"\D", "", phone)) >= 7:
        points = w.get("phone_verified", 15.0)
        score += points
        factors["direct_phone"] = f"+{points:.1f} (Direct phone reachability)"

    final_score = min(100.0, max(0.0, score))
    return round(final_score, 1), factors
