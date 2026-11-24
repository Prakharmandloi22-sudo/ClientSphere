import re
from typing import Optional, Dict, Any

def normalize_email(email: Optional[str]) -> str:
    if not email:
        return ""
    email = email.strip().lower()
    return email

def normalize_phone(phone: Optional[str]) -> str:
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    # Format to international/E.164-like if standard 10 or 11 digits
    if len(digits) == 10:
        return f"+1{digits}"
    elif len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    elif digits:
        return f"+{digits}"
    return ""

def clean_company_name(name: Optional[str]) -> str:
    if not name:
        return ""
    cleaned = re.sub(r"(?i)\b(inc|incorporated|llc|ltd|limited|corp|corporation|gmbh|co)\b\.?", "", name)
    cleaned = re.sub(r"[^\w\s]", "", cleaned)
    return " ".join(cleaned.split()).strip().title()

def normalize_lead_record(lead: Dict[str, Any]) -> Dict[str, Any]:
    norm_email = normalize_email(lead.get("email"))
    norm_phone = normalize_phone(lead.get("phone"))
    company = clean_company_name(lead.get("company_name") or lead.get("companyName"))
    
    first_name = (lead.get("first_name") or lead.get("firstName") or "").strip().title()
    last_name = (lead.get("last_name") or lead.get("lastName") or "").strip().title()
    title = (lead.get("title") or "").strip().title()

    dedup_key = norm_email if norm_email else norm_phone

    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": lead.get("email", ""),
        "normalized_email": norm_email,
        "phone": lead.get("phone", ""),
        "normalized_phone": norm_phone,
        "company_name": company,
        "title": title,
        "dedup_key": dedup_key,
    }
