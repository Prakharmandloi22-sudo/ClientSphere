import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface OrgRecord {
  id: string;
  name: string;
  domain: string | null;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface UserRecord {
  id: string;
  org_id: string;
  team_id: string | null;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP' | 'MARKETING' | 'SUPPORT';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface TeamRecord {
  id: string;
  org_id: string;
  name: string;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadRecord {
  id: string;
  org_id: string;
  owner_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  normalized_email: string;
  phone: string | null;
  normalized_phone: string | null;
  company_name: string | null;
  title: string | null;
  source: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'CONVERTED';
  score: number;
  score_factors: any;
  dedup_key: string;
  custom_fields: Record<string, any>;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyRecord {
  id: string;
  org_id: string;
  owner_id: string | null;
  name: string;
  domain: string | null;
  industry: string | null;
  annual_revenue: number | null;
  employee_count: number | null;
  phone: string | null;
  address: string | null;
  dedup_key: string;
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ContactRecord {
  id: string;
  org_id: string;
  owner_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  normalized_email: string;
  phone: string | null;
  title: string | null;
  dedup_key: string;
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CompanyContactRecord {
  id: string;
  company_id: string;
  contact_id: string;
  role_title: string | null;
  is_primary: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineRecord {
  id: string;
  org_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineStageRecord {
  id: string;
  pipeline_id: string;
  name: string;
  stage_order: number;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpportunityRecord {
  id: string;
  org_id: string;
  owner_id: string;
  pipeline_id: string;
  stage_id: string;
  company_id: string | null;
  primary_contact_id: string | null;
  name: string;
  amount: number;
  currency: string;
  probability: number;
  close_date: string;
  status: 'OPEN' | 'WON' | 'LOST';
  version: number;
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OpportunityTeamRecord {
  id: string;
  opportunity_id: string;
  user_id: string;
  role: 'LEAD' | 'COLLABORATOR' | 'SPECIALIST' | 'VIEWER';
  access_level: 'READ' | 'WRITE' | 'ADMIN';
  split_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityRecord {
  id: string;
  org_id: string;
  performed_by_id: string;
  activity_type: 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'NOTE' | 'STATUS_CHANGE';
  subject: string;
  description: string | null;
  entity_type: 'LEAD' | 'CONTACT' | 'COMPANY' | 'OPPORTUNITY';
  entity_id: string;
  scheduled_at: string | null;
  completed_at: string | null;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRecord {
  id: string;
  org_id: string;
  user_id: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW_SENSITIVE' | 'EXPORT' | 'STAGE_TRANSITION';
  entity_type: string;
  entity_id: string;
  changes: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ImportRecord {
  id: string;
  org_id: string;
  uploaded_by_id: string;
  entity_type: string;
  filename: string;
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  failed_rows: number;
  duplicate_rows: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error_report: any;
  created_at: string;
  updated_at: string;
}

export interface AutomationRuleRecord {
  id: string;
  org_id: string;
  created_by_id: string;
  name: string;
  description: string | null;
  trigger_event: 'LEAD_CREATED' | 'STAGE_CHANGED' | 'SCORE_UPDATED' | 'ACTIVITY_LOGGED';
  conditions: Array<{ field: string; operator: string; value: any }>;
  actions: Array<{ type: string; params: Record<string, any> }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationExecutionRecord {
  id: string;
  rule_id: string;
  entity_type: string;
  entity_id: string;
  trigger_event: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRYING' | 'ABORTED_LOOP';
  retry_count: number;
  depth_level: number;
  payload: any;
  result: any;
  error_message: string | null;
  executed_at: string;
}

export interface IntegrationRecord {
  id: string;
  org_id: string;
  provider: string;
  status: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ConsentRecord {
  id: string;
  org_id: string;
  entity_type: string;
  entity_id: string;
  consent_type: string;
  status: string;
  granted_at: string;
  ip_address: string | null;
  created_at: string;
}

// In-Memory Database Store for Testing / Standalone Execution
class InMemoryDB {
  organizations: Map<string, OrgRecord> = new Map();
  teams: Map<string, TeamRecord> = new Map();
  users: Map<string, UserRecord> = new Map();
  refreshTokens: Map<string, RefreshTokenRecord> = new Map();
  leads: Map<string, LeadRecord> = new Map();
  companies: Map<string, CompanyRecord> = new Map();
  contacts: Map<string, ContactRecord> = new Map();
  companyContacts: Map<string, CompanyContactRecord> = new Map();
  pipelines: Map<string, PipelineRecord> = new Map();
  pipelineStages: Map<string, PipelineStageRecord> = new Map();
  opportunities: Map<string, OpportunityRecord> = new Map();
  opportunityTeams: Map<string, OpportunityTeamRecord> = new Map();
  activities: Map<string, ActivityRecord> = new Map();
  auditLogs: Map<string, AuditLogRecord> = new Map();
  imports: Map<string, ImportRecord> = new Map();
  automationRules: Map<string, AutomationRuleRecord> = new Map();
  automationExecutions: Map<string, AutomationExecutionRecord> = new Map();
  integrations: Map<string, IntegrationRecord> = new Map();
  consents: Map<string, ConsentRecord> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  seedDefaultData() {
    // 1. Organization
    const defaultOrgId = 'org-clientsphere-demo';
    this.organizations.set(defaultOrgId, {
      id: defaultOrgId,
      name: 'ClientSphere Global Tech Inc.',
      domain: 'clientsphere.internal',
      plan: 'ENTERPRISE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 2. Teams
    const enterpriseTeamId = 'team-enterprise-sales';
    this.teams.set(enterpriseTeamId, {
      id: enterpriseTeamId,
      org_id: defaultOrgId,
      name: 'Enterprise Strategic Sales',
      manager_id: 'user-manager-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 3. Users with hashed passwords ('Password123!')
    // bcrypt hash of 'Password123!': $2a$10$wN10Y8TzJ3hU7e6E9Wl37.7qUuLkVvJbVn8K5E1Xw7Q5M2Z2fN6q2
    const passwordHash = '$2a$10$3p9YIe2BvYc7Wj3R7qHn2.gZfNkV1n8K5E1Xw7Q5M2Z2fN6q2092a';

    const users: UserRecord[] = [
      {
        id: 'user-admin-1',
        org_id: defaultOrgId,
        team_id: null,
        email: 'admin@clientsphere.internal',
        password_hash: passwordHash,
        first_name: 'Sarah',
        last_name: 'Connor',
        role: 'ADMIN',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'user-manager-1',
        org_id: defaultOrgId,
        team_id: enterpriseTeamId,
        email: 'manager@clientsphere.internal',
        password_hash: passwordHash,
        first_name: 'Marcus',
        last_name: 'Vance',
        role: 'SALES_MANAGER',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'user-rep-1',
        org_id: defaultOrgId,
        team_id: enterpriseTeamId,
        email: 'rep1@clientsphere.internal',
        password_hash: passwordHash,
        first_name: 'Elena',
        last_name: 'Rostova',
        role: 'SALES_REP',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'user-rep-2',
        org_id: defaultOrgId,
        team_id: enterpriseTeamId,
        email: 'rep2@clientsphere.internal',
        password_hash: passwordHash,
        first_name: 'David',
        last_name: 'Kim',
        role: 'SALES_REP',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'user-marketing-1',
        org_id: defaultOrgId,
        team_id: null,
        email: 'marketing@clientsphere.internal',
        password_hash: passwordHash,
        first_name: 'Chloe',
        last_name: 'Bennet',
        role: 'MARKETING',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'user-support-1',
        org_id: defaultOrgId,
        team_id: null,
        email: 'support@clientsphere.internal',
        password_hash: passwordHash,
        first_name: 'Liam',
        last_name: 'Neeson',
        role: 'SUPPORT',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    users.forEach((u) => this.users.set(u.id, u));

    // 4. Default Sales Pipeline & Stages
    const pipelineId = 'pipe-enterprise-standard';
    this.pipelines.set(pipelineId, {
      id: pipelineId,
      org_id: defaultOrgId,
      name: 'Standard B2B Sales Pipeline',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const stages: PipelineStageRecord[] = [
      {
        id: 'stage-1-discovery',
        pipeline_id: pipelineId,
        name: 'Discovery',
        stage_order: 1,
        probability: 0.2,
        is_won: false,
        is_lost: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'stage-2-qualification',
        pipeline_id: pipelineId,
        name: 'Qualification',
        stage_order: 2,
        probability: 0.4,
        is_won: false,
        is_lost: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'stage-3-proposal',
        pipeline_id: pipelineId,
        name: 'Proposal / Demo',
        stage_order: 3,
        probability: 0.6,
        is_won: false,
        is_lost: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'stage-4-negotiation',
        pipeline_id: pipelineId,
        name: 'Negotiation',
        stage_order: 4,
        probability: 0.8,
        is_won: false,
        is_lost: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'stage-5-closed-won',
        pipeline_id: pipelineId,
        name: 'Closed Won',
        stage_order: 5,
        probability: 1.0,
        is_won: true,
        is_lost: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'stage-6-closed-lost',
        pipeline_id: pipelineId,
        name: 'Closed Lost',
        stage_order: 6,
        probability: 0.0,
        is_won: false,
        is_lost: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    stages.forEach((s) => this.pipelineStages.set(s.id, s));

    // 5. Sample Companies
    const acmeCompanyId = 'comp-acme-corp';
    const apexCompanyId = 'comp-apex-dynamics';
    this.companies.set(acmeCompanyId, {
      id: acmeCompanyId,
      org_id: defaultOrgId,
      owner_id: 'user-rep-1',
      name: 'Acme Cloud Solutions',
      domain: 'acmecloud.com',
      industry: 'Technology',
      annual_revenue: 15000000,
      employee_count: 350,
      phone: '+1-555-0100',
      address: '100 Silicon Way, San Francisco, CA',
      dedup_key: 'acmecloud.com',
      custom_fields: { tier: 'Strategic Enterprise', tech_stack: ['AWS', 'Kubernetes'] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.companies.set(apexCompanyId, {
      id: apexCompanyId,
      org_id: defaultOrgId,
      owner_id: 'user-rep-2',
      name: 'Apex Dynamics',
      domain: 'apexdynamics.io',
      industry: 'FinTech',
      annual_revenue: 45000000,
      employee_count: 850,
      phone: '+1-555-0200',
      address: '250 Financial Blvd, New York, NY',
      dedup_key: 'apexdynamics.io',
      custom_fields: { tier: 'Global Key Account', regulatory_body: 'SEC' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 6. Sample Contacts & Many-to-Many Relationships
    const contactAliceId = 'cont-alice-walker';
    const contactBobId = 'cont-bob-martin';

    this.contacts.set(contactAliceId, {
      id: contactAliceId,
      org_id: defaultOrgId,
      owner_id: 'user-rep-1',
      first_name: 'Alice',
      last_name: 'Walker',
      email: 'alice.walker@acmecloud.com',
      normalized_email: 'alice.walker@acmecloud.com',
      phone: '+1-555-0101',
      title: 'VP of Engineering',
      dedup_key: 'alice.walker@acmecloud.com',
      custom_fields: { linkedin: 'https://linkedin.com/in/alicewalker', decision_maker: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.contacts.set(contactBobId, {
      id: contactBobId,
      org_id: defaultOrgId,
      owner_id: 'user-rep-2',
      first_name: 'Robert',
      last_name: 'Martin',
      email: 'bob.martin@apexdynamics.io',
      normalized_email: 'bob.martin@apexdynamics.io',
      phone: '+1-555-0201',
      title: 'Chief Technology Officer',
      dedup_key: 'bob.martin@apexdynamics.io',
      custom_fields: { linkedin: 'https://linkedin.com/in/bobmartin', decision_maker: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Many-to-many associations: Alice is primary at Acme, also consulting CTO at Apex Dynamics!
    this.companyContacts.set('cc-1', {
      id: 'cc-1',
      company_id: acmeCompanyId,
      contact_id: contactAliceId,
      role_title: 'VP of Engineering',
      is_primary: true,
      start_date: '2023-01-01',
      end_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.companyContacts.set('cc-2', {
      id: 'cc-2',
      company_id: apexCompanyId,
      contact_id: contactAliceId,
      role_title: 'Technical Advisory Board Member',
      is_primary: false,
      start_date: '2024-03-01',
      end_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.companyContacts.set('cc-3', {
      id: 'cc-3',
      company_id: apexCompanyId,
      contact_id: contactBobId,
      role_title: 'Chief Technology Officer',
      is_primary: true,
      start_date: '2022-06-01',
      end_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 7. Sample Leads
    const lead1Id = 'lead-quantum-ai';
    this.leads.set(lead1Id, {
      id: lead1Id,
      org_id: defaultOrgId,
      owner_id: 'user-rep-1',
      first_name: 'Priya',
      last_name: 'Sharma',
      email: 'priya.sharma@quantumai.dev',
      normalized_email: 'priya.sharma@quantumai.dev',
      phone: '+1-555-0301',
      normalized_phone: '15550301',
      company_name: 'Quantum AI Labs',
      title: 'Head of Infrastructure',
      source: 'WEB_FORM',
      status: 'QUALIFIED',
      score: 88.5,
      score_factors: { company_size: '+25', intent_activity: '+30', email_verified: '+20', title_match: '+13.5' },
      dedup_key: 'priya.sharma@quantumai.dev',
      custom_fields: { budget_allocated: true, timeframe: 'Q1' },
      converted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 8. Sample Opportunities with Collaboration Teams
    const oppAcmeId = 'opp-acme-cloud-expansion';
    this.opportunities.set(oppAcmeId, {
      id: oppAcmeId,
      org_id: defaultOrgId,
      owner_id: 'user-rep-1',
      pipeline_id: pipelineId,
      stage_id: 'stage-3-proposal',
      company_id: acmeCompanyId,
      primary_contact_id: contactAliceId,
      name: 'Acme Global Infrastructure Expansion',
      amount: 175000,
      currency: 'USD',
      probability: 0.6,
      close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'OPEN',
      version: 1,
      custom_fields: { competitors: ['LegacyVendorX'], product_line: 'Enterprise Cloud' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Opportunity Team collaboration: Rep 1 is Lead, Rep 2 is Specialist Collaborator with 20% split
    this.opportunityTeams.set('ot-1', {
      id: 'ot-1',
      opportunity_id: oppAcmeId,
      user_id: 'user-rep-1',
      role: 'LEAD',
      access_level: 'ADMIN',
      split_percentage: 80.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.opportunityTeams.set('ot-2', {
      id: 'ot-2',
      opportunity_id: oppAcmeId,
      user_id: 'user-rep-2',
      role: 'COLLABORATOR',
      access_level: 'WRITE',
      split_percentage: 20.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 9. Sample Activities
    this.activities.set('act-1', {
      id: 'act-1',
      org_id: defaultOrgId,
      performed_by_id: 'user-rep-1',
      activity_type: 'CALL',
      subject: 'Discovery & Solution Architecture Call',
      description: 'Discussed high availability requirements and multi-region failover with Alice.',
      entity_type: 'OPPORTUNITY',
      entity_id: oppAcmeId,
      scheduled_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'COMPLETED',
      metadata: { duration_minutes: 45, outcome: 'POSITIVE' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 10. Sample Automation Rule
    this.automationRules.set('rule-auto-assign-high-score', {
      id: 'rule-auto-assign-high-score',
      org_id: defaultOrgId,
      created_by_id: 'user-admin-1',
      name: 'High Score Lead Round-Robin & Notification',
      description: 'Automatically notify team and create follow-up task when lead score exceeds 80',
      trigger_event: 'SCORE_UPDATED',
      conditions: [{ field: 'score', operator: '>=', value: 80 }],
      actions: [
        { type: 'CREATE_TASK', params: { title: 'High-Priority 24h Outreach', due_days: 1 } },
        { type: 'SEND_NOTIFICATION', params: { channel: 'SLACK_SANDBOX', message: 'Hot Lead Detected!' } },
      ],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

export const db = new InMemoryDB();
