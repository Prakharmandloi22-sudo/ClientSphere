# ClientSphere - Mandatory Hands-on Assessment Handbook

This handbook maps each of the **15 Mandatory Hands-on Assessments** and the **Domain-Specific Capstone Challenge** to its working implementation, test files, and evidence deliverables.

---

### Assessment 01 – CRM Frontend
- **Objective**: Build lead/contact/company profiles, relationship views, pipeline Kanban, opportunity detail, activity timeline, import wizard, and sales dashboards.
- **Implementation**:
  - App Router: `client/src/app/`
  - Dashboard & Visual Analytics: `client/src/app/page.tsx`
  - Interactive Pipeline Kanban: `client/src/app/pipeline/page.tsx`
  - Leads & Explainable Scoring: `client/src/app/leads/page.tsx`
  - Contacts Multi-Company View: `client/src/app/contacts/page.tsx`
  - Opportunities Collaboration Teams: `client/src/app/opportunities/page.tsx`
  - Activity Timeline: `client/src/app/activities/page.tsx`
  - CSV Import Wizard: `client/src/app/imports/page.tsx`
- **Evidence**: Responsive TypeScript frontend with TanStack React Query, Lucide icons, and Tailwind CSS.

---

### Assessment 02 – CRM Backend APIs
- **Objective**: Implement CRUD and workflow APIs for leads, contacts, companies, opportunities, activities, tasks, pipelines, imports, and automation rules.
- **Implementation**:
  - Express App & Middleware: `server/src/app.ts`, `server/src/middleware/errorHandler.ts`
  - Routers: `server/src/modules/` (auth, leads, contacts, companies, opportunities, pipelines, activities, automation, imports, integrations, analytics)
- **Tests**: `server/tests/leads_dedup.test.ts`, `server/tests/auth.test.ts`
- **Evidence**: Passing 20 Jest tests with standardized error format, request IDs, and pagination.

---

### Assessment 03 – CRM Relational Model
- **Objective**: Model many-to-many contacts/companies, opportunity teams, ownership, activities, custom fields, deduplication keys, and audit history.
- **Implementation**:
  - Prisma Schema: `server/prisma/schema.prisma`
  - Raw PostgreSQL DDL: `server/src/db/migrations/001_initial_schema.sql`
  - Many-to-Many Join Table: `company_contacts` with role titles and primary flag.
  - Collaboration Join Table: `opportunity_teams` with split percentages and access levels.
- **Tests**: `server/tests/relationships_capstone.test.ts`
- **Evidence**: Tested relational integrity, unique constraints, and foreign key cascades.

---

### Assessment 04 – CRM Access Control
- **Objective**: Implement organization/team roles, record ownership, sharing rules, field restrictions, and audit access to sensitive customer data.
- **Implementation**:
  - RBAC Middleware: `server/src/middleware/auth.ts` (`requireRole`, `checkRecordVisibility`)
  - Sensitive Field Masking: `server/src/utils/security.ts` (`maskSensitiveFields`)
  - Sensitive Data Audit Logging: `server/src/modules/leads/leads.router.ts` (logs `VIEW_SENSITIVE`)
- **Tests**: `server/tests/auth.test.ts`
- **Evidence**: Admin vs Rep vs Marketing access boundaries verified by automated tests.

---

### Assessment 05 – Python Lead Processing
- **Objective**: Build CSV import, normalization, duplicate candidate detection, validation reports, and configurable lead scoring with explainable factors.
- **Implementation**:
  - Normalizer: `services/analytics/app/services/normalizer.py`
  - Deduplicator (Levenshtein): `services/analytics/app/services/deduplicator.py`
  - Scorer & Factors: `services/analytics/app/services/scorer.py`
  - FastAPI Endpoints: `services/analytics/app/routers/lead_processing.py`
- **Tests**: `services/analytics/tests/test_lead_processing.py`
- **Evidence**: 5 passing pytest unit tests covering normalization, fuzzy matching, and scoring.

---

### Assessment 06 – FastAPI Sales Intelligence
- **Objective**: Provide pipeline conversion, sales velocity, forecast, and lead-priority analytics with documented assumptions and reproducible calculations.
- **Implementation**:
  - Intelligence Algorithms: `services/analytics/app/services/intelligence.py`
  - Sales Velocity Formula: $V = \frac{N \times S \times W}{T}$
  - Forecast Model: 3-tier Commit, Best-case, and Weighted Expected value.
  - Endpoints: `services/analytics/app/routers/sales_intelligence.py`
- **Tests**: `services/analytics/tests/test_sales_intelligence.py`
- **Evidence**: 3 passing pytest unit tests verifying velocity, forecasting, and conversion bottleneck analysis.

---

### Assessment 07 – Workflow Automation Engine
- **Objective**: Implement configurable triggers, conditions, actions, delayed follow-ups, retries, execution history, and safeguards against infinite automation loops.
- **Implementation**:
  - Engine: `server/src/modules/automation/automation.service.ts`
  - Recursion Depth Check: Maximum depth 5 (`ABORTED_LOOP` status)
  - Execution History: `server/src/modules/automation/automation.router.ts`
- **Tests**: `server/tests/automation_safeguards.test.ts`
- **Evidence**: Test verifying loop abort when depth exceeds limit.

---

### Assessment 08 – CRM External Integrations
- **Objective**: Integrate email and calendar sandbox, telephony mock/webhook, and external lead-capture endpoint. Store consent and integration status appropriately.
- **Implementation**:
  - Sandbox & Webhooks: `server/src/modules/integrations/integrations.router.ts`
  - HMAC SHA-256 Signature Verification: Telephony webhook endpoint.
  - Consent Enforcement: Blocks email dispatch if `EMAIL_MARKETING` consent is revoked.
- **Evidence**: Working interactive test bench in `client/src/app/integrations/page.tsx`.

---

### Assessment 09 – Docker CRM Stack
- **Objective**: Containerize UI, API, intelligence service, PostgreSQL, Redis, and automation workers with health checks and persistent data.
- **Implementation**:
  - Server Dockerfile: `docker/Dockerfile.server`
  - Analytics Dockerfile: `docker/Dockerfile.analytics`
  - Client Dockerfile: `docker/Dockerfile.client`
  - Compose Orchestration: `docker-compose.yml`
  - Health checks on all services.

---

### Assessment 10 – Git Collaboration
- **Objective**: Use feature branches, PR reviews, protected branches, code ownership, test requirements, and reviewed migrations.
- **Implementation**:
  - Code Owners: `.github/CODEOWNERS`
  - PR Template: `.github/pull_request_template.md`
  - Branch protection and review policies documented in `docs/ARCHITECTURE.md`.

---

### Assessment 11 – CRM CI/CD
- **Objective**: Automate linting, type checks, Node/Python tests, integration tests, security scanning, image publishing, staging, and rollback.
- **Implementation**:
  - GitHub Actions Workflow: `.github/workflows/ci.yml`
  - Parallel test jobs for Express and FastAPI.

---

### Assessment 12 – CRM Test Strategy
- **Objective**: Test duplicate contacts, relationship integrity, team access, pipeline transitions, automation retries, concurrent edits, and import failures.
- **Implementation**:
  - 5 Jest test suites (20 tests) in `server/tests/`
  - 2 Pytest test suites (8 tests) in `services/analytics/tests/`
  - Total: **28 automated tests passing**.

---

### Assessment 13 – CRM API Documentation
- **Objective**: Document lead, contact, company, opportunity, activity, import, automation, and webhook APIs including pagination and errors.
- **Implementation**:
  - OpenAPI 3.0 Specification: `docs/openapi.yaml`
  - Postman Collection: `docs/clientsphere.postman_collection.json`

---

### Assessment 14 – CRM Production Deployment
- **Objective**: Deploy multi-tenant CRM with secure domains, HTTPS, private database, backups, logs, metrics, and configurable integrations.
- **Implementation**:
  - Nginx Reverse Proxy & Security Headers: `nginx/nginx.conf`
  - Multi-tenant tenant scoping via `org_id`.
  - Production Compose: `docker-compose.prod.yml`.

---

### Assessment 15 – CRM Incident Simulation
- **Objective**: Investigate duplicate imports, wrong lead assignment, failed automation, inaccurate forecast, and slow reporting; submit RCA and regression tests.
- **Implementation**:
  - `docs/incidents/RCA_01_duplicate_imports.md`
  - `docs/incidents/RCA_02_wrong_lead_assignment.md`
  - `docs/incidents/RCA_03_failed_automation.md`
  - `docs/incidents/RCA_04_inaccurate_forecast.md`
  - `docs/incidents/RCA_05_slow_reporting.md`

---

### Domain-Specific Capstone Challenge
- **Challenge**: A contact may be associated with multiple companies, and multiple representatives may collaborate on an opportunity. Preserve relationship integrity and enforce team visibility rules.
- **Implementation & Verification**:
  - Verified in `server/tests/relationships_capstone.test.ts`
  - Tested in Contacts UI (`client/src/app/contacts/page.tsx`) and Opportunities UI (`client/src/app/opportunities/page.tsx`).
