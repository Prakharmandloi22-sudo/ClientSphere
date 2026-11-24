# Incident RCA 05: Slow Reporting Query & Database Connection Starvation

## 1. Incident Summary
- **Severity**: P2 (Latency & Database Pool Exhaustion)
- **Impact**: Dashboard analytics latency degraded from 120ms to 9.4s during Monday morning executive logins, causing HTTP 504 gateway timeouts.
- **Root Cause**: The dashboard query executed an unindexed full table scan across 150,000 activity logs joined to opportunities without composite tenant indexes, triggering an N+1 query pattern.

## 2. Technical Investigation
- `EXPLAIN ANALYZE` showed `Seq Scan on activities` filtering by `org_id` and `performed_by_id`.
- The frontend was making separate API calls for every contact's company relationship sequentially rather than using joined/aggregated endpoints.

## 3. Remediation & Implementation Fix
1. **Targeted PostgreSQL Indexes**:
   ```sql
   CREATE INDEX idx_activities_entity ON activities(org_id, entity_type, entity_id);
   CREATE INDEX idx_opps_org_stage ON opportunities(org_id, stage_id);
   CREATE INDEX idx_leads_score ON leads(org_id, score DESC);
   ```
2. **Aggregated Kanban Endpoint**: Consolidated stage totals, deal counts, and weighted values into `/api/v1/pipelines/:id/kanban`, reducing round-trips from 15 to 1.
3. **TanStack React Query Cache**: Configured client-side `staleTime: 30000` to prevent redundant network fetches on window focus.

## 4. Regression Verification
- Response time under load reduced from 9.4s to 38ms.
- All query patterns verified against indexed columns.
