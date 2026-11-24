# Incident RCA 02: Incorrect Lead Assignment & Territory Leakage

## 1. Incident Summary
- **Severity**: P2 (Revenue Attribution Conflict)
- **Impact**: Strategic enterprise leads generated via public web forms were assigned to deactivated or out-of-territory sales representatives, violating team ownership rules.
- **Root Cause**: The lead capture worker read a cached, non-invalidated rep routing array that included deactivated user IDs, and lacked organizational tenant/team validation at assignment time.

## 2. Technical Investigation
- Lead `priya.sharma@quantumai.dev` was captured via webhook.
- The assignment routing logic selected `user_id` without verifying `is_active = true` and `org_id = target_org_id`.
- The assigned rep could neither see the record due to deactivated status nor follow up within the 1-hour SLA.

## 3. Remediation & Implementation Fix
1. **Active Rep Filtering**: Updated query to explicitly enforce `WHERE is_active = true AND org_id = :orgId AND role IN ('SALES_REP', 'SALES_MANAGER')`.
2. **Fallback Assignment**: If round-robin points to an unavailable owner, the system defaults to the designated Team Manager (`team.manager_id`).
3. **Audit Tracking**: Every assignment or reassignment creates an `audit_logs` record capturing `action = 'UPDATE'` and the assigning actor/system worker.

## 4. Regression Test Added
- Added automated check in `server/tests/leads_dedup.test.ts` verifying that deactivated users cannot be assigned leads.
