# Incident RCA 04: Inaccurate Sales Forecast & Probability Inconsistency

## 1. Incident Summary
- **Severity**: P2 (Executive Reporting Inaccuracy)
- **Impact**: Sales leadership quarterly forecast showed a \$4.2M overstatement, misaligning board expectations.
- **Root Cause**: The forecasting query summed amounts from both open deals and closed lost deals, and applied unweighted stage probabilities incorrectly when deals were moved between custom pipelines.

## 2. Technical Investigation
- Legacy endpoint in frontend calculated `sum(opp.amount * opp.probability)` without filtering `opp.status = 'OPEN'`.
- Deals in `Closed Lost` status retained their historical pre-loss stage probability (e.g. 0.8), adding phantom revenue to projected figures.

## 3. Remediation & Implementation Fix
1. **Mathematical Service Delegation**: Shifted all forecasting calculations to the FastAPI microservice (`services/analytics/app/services/intelligence.py`).
2. **Strict 3-Tier Forecast Model**:
   - `Closed Won`: Authoritative recognized revenue.
   - `Commit`: Closed Won + Open Deals with `probability >= 0.80`.
   - `Best Case`: Closed Won + Open Deals with `probability >= 0.50`.
   - `Weighted Expected`: Closed Won + `Sum(Open Deals Amount * Probability)`.
3. **Database Constraints**: Ensured stage transitions explicitly set `status = 'WON'` or `'LOST'` and reset probability when marked lost.

## 4. Regression Test Added
- Added Python test in `services/analytics/tests/test_sales_intelligence.py`:
  - `test_sales_forecast_tiers()`.
