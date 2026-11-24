# Incident RCA 01: Bulk CSV Duplicate Imports Ingestion

## 1. Incident Summary
- **Severity**: P2 (Data Integrity & Customer Confusion)
- **Impact**: Marketing users uploading vendor lead lists caused 412 duplicate leads to be injected into the CRM, skewing sales territory counts and resulting in multiple reps contacting the same prospect.
- **Root Cause**: The legacy import script performed naive exact string matching on raw email addresses without prior normalization (e.g. `John.Doe@Acme.com` vs `john.doe@acme.com`), and failed to check secondary deduplication keys (normalized phone number).

## 2. Technical Investigation & Reproduction
- Lead `priya.sharma@quantumai.dev` was imported via CSV with whitespace and mixed casing (`  Priya.Sharma@QuantumAI.dev `).
- SQL `SELECT id FROM leads WHERE email = '  Priya.Sharma@QuantumAI.dev '` returned zero matches because the existing record stored `priya.sharma@quantumai.dev`.
- A duplicate record was created, violating the tenant's data governance policy.

## 3. Remediation & Implementation Fix
1. **Pre-ingestion Normalization**: Introduced `normalizeEmail()` (lowercasing, whitespace trimming) and `normalizePhone()` (E.164 digit extraction).
2. **Deterministic Dedup Key**: Added composite `dedup_key` indexed at the database level (`CREATE INDEX idx_leads_org_dedup ON leads(org_id, dedup_key)`).
3. **Fuzzy Levenshtein Guard**: Integrated Python FastAPI deduplication service (`detect_duplicates()`) which computes similarity ratios across full name and company name when email domain is ambiguous.
4. **Validation Report**: The CSV import wizard now generates an itemized validation report flagging duplicates before persisting records.

## 4. Regression Test Added
- Added automated test in `server/tests/leads_dedup.test.ts`:
  - `should detect duplicate lead and reject with 409 Conflict`.
- Added Python test in `services/analytics/tests/test_lead_processing.py`:
  - `test_deduplication_exact_email()` and `test_deduplication_fuzzy_name_and_company()`.
