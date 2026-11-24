from typing import List, Dict, Any, Tuple

def levenshtein_ratio(s1: str, s2: str) -> float:
    """Calculates Levenshtein similarity ratio between 0.0 and 1.0."""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    
    s1, s2 = s1.lower(), s2.lower()
    if s1 == s2:
        return 1.0
        
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
        
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,       # deletion
                dp[i][j - 1] + 1,       # insertion
                dp[i - 1][j - 1] + cost # substitution
            )
            
    max_len = max(m, n)
    distance = dp[m][n]
    return max(0.0, 1.0 - (distance / max_len))

def detect_duplicates(
    candidate: Dict[str, Any],
    existing_records: List[Dict[str, Any]],
    threshold: float = 0.80
) -> List[Dict[str, Any]]:
    """Detects duplicate candidates using multi-factor fuzzy matching."""
    matches = []
    
    cand_email = (candidate.get("normalized_email") or candidate.get("email") or "").strip().lower()
    cand_phone = (candidate.get("normalized_phone") or candidate.get("phone") or "").strip()
    cand_name = f"{candidate.get('first_name', '')} {candidate.get('last_name', '')}".strip().lower()
    cand_company = (candidate.get("company_name") or candidate.get("companyName") or "").strip().lower()

    for item in existing_records:
        item_email = (item.get("normalized_email") or item.get("email") or "").strip().lower()
        item_phone = (item.get("normalized_phone") or item.get("phone") or "").strip()
        item_name = f"{item.get('first_name', '')} {item.get('last_name', '')}".strip().lower()
        item_company = (item.get("company_name") or item.get("companyName") or "").strip().lower()

        reasons = []
        confidence = 0.0

        # Exact email match
        if cand_email and item_email and cand_email == item_email:
            confidence = 1.0
            reasons.append("Exact normalized email match")

        # Exact phone match
        elif cand_phone and item_phone and cand_phone == item_phone:
            confidence = 0.95
            reasons.append("Exact normalized phone match")

        else:
            # Fuzzy name and company comparison
            name_sim = levenshtein_ratio(cand_name, item_name)
            comp_sim = levenshtein_ratio(cand_company, item_company)

            if name_sim >= 0.85 and comp_sim >= 0.80:
                confidence = round((name_sim * 0.6) + (comp_sim * 0.4), 2)
                reasons.append(f"Fuzzy match on Name ({int(name_sim*100)}%) and Company ({int(comp_sim*100)}%)")
            elif name_sim >= 0.92:
                confidence = round(name_sim * 0.85, 2)
                reasons.append(f"High similarity in Contact Full Name ({int(name_sim*100)}%)")

        if confidence >= threshold:
            matches.append({
                "existing_id": item.get("id"),
                "existing_name": f"{item.get('first_name', '')} {item.get('last_name', '')}",
                "existing_email": item.get("email"),
                "confidence": confidence,
                "reasons": reasons,
            })

    # Sort matches by confidence descending
    matches.sort(key=lambda x: x["confidence"], reverse=True)
    return matches
