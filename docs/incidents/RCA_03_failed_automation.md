# Incident RCA 03: Failed Automation & Infinite Cascade Loop

## 1. Incident Summary
- **Severity**: P1 (Service Degradation & CPU Saturation)
- **Impact**: Automation engine triggered 14,000 recursive execution events in 3 minutes, causing Redis job queue memory exhaustion and delayed customer notifications.
- **Root Cause**: Rule A triggered an update when a lead score changed (`SCORE_UPDATED`), which updated a custom field, which inadvertently re-fired Rule B that recalculated the score, creating an infinite mutual cascade.

## 2. Technical Investigation
- Rule 1: `IF score >= 80 THEN update custom_fields.priority = 'HIGH'`
- Rule 2: `IF custom_fields.priority == 'HIGH' THEN recalculate_score()`
- Neither rule tracked execution recursion depth or context origin, causing the loop: A -> B -> A -> B -> ...

## 3. Remediation & Implementation Fix
1. **Depth Limit Safeguard**: Implemented `MAX_EXECUTION_DEPTH = 5` inside `runAutomationTrigger()` in `server/src/modules/automation/automation.service.ts`.
2. **Abortion State**: When `depth_level > 5`, the engine terminates immediately, writes `ABORTED_LOOP` status into `automation_executions`, and logs an alert.
3. **Debounce**: Identical entity-rule trigger combinations within 10 seconds are deduplicated.

## 4. Regression Test Added
- Added automated test in `server/tests/automation_safeguards.test.ts`:
  - `should detect cascading execution beyond max depth and abort with ABORTED_LOOP`.
