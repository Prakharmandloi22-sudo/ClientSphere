import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db, LeadRecord, CompanyRecord, ContactRecord, OpportunityRecord, AuditLogRecord } from '../../db';
import { authenticate, AuthenticatedRequest, checkRecordVisibility } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { normalizeEmail, normalizePhone, generateDedupKey, maskSensitiveFields } from '../../utils/security';
import { runAutomationTrigger } from '../automation/automation.service';

const router = Router();

const createLeadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  source: z.string().default('MANUAL'),
  ownerId: z.string().optional().nullable(),
  customFields: z.record(z.any()).optional().default({}),
});

const updateLeadSchema = createLeadSchema.partial().extend({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED']).optional(),
  score: z.number().optional(),
});

const convertLeadSchema = z.object({
  companyId: z.string().optional(),
  createNewCompany: z.boolean().default(true),
  opportunityName: z.string().optional(),
  amount: z.number().min(0).default(0),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  closeDate: z.string().optional(),
});

// Calculate lead score based on explainable factors
export const calculateLeadScore = (lead: { email: string; phone?: string | null; companyName?: string | null; title?: string | null }) => {
  let score = 20; // baseline
  const factors: Record<string, string> = { baseline: '+20 (profile initiated)' };

  if (lead.email && !lead.email.endsWith('@gmail.com') && !lead.email.endsWith('@yahoo.com') && !lead.email.endsWith('@hotmail.com')) {
    score += 30;
    factors.corporate_email = '+30 (valid corporate domain)';
  }
  if (lead.phone && lead.phone.length > 7) {
    score += 15;
    factors.direct_phone = '+15 (verified phone format)';
  }
  if (lead.companyName && lead.companyName.trim().length > 2) {
    score += 20;
    factors.company_provided = '+20 (identifiable company entity)';
  }
  if (lead.title && /(vp|director|chief|c-level|head|founder|manager)/i.test(lead.title)) {
    score += 15;
    factors.executive_seniority = '+15 (decision-maker seniority title)';
  }

  return { score: Math.min(score, 100), factors };
};

// GET /api/v1/leads - List leads with pagination, filtering, searching
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const orgId = req.user!.orgId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const ownerId = req.query.ownerId as string;
    const search = (req.query.q as string || '').toLowerCase();
    const minScore = req.query.minScore ? parseFloat(req.query.minScore as string) : undefined;

    let items = Array.from(db.leads.values()).filter((lead) => {
      if (lead.org_id !== orgId) return false;
      if (!checkRecordVisibility(req.user!, lead.owner_id, 'LEAD', lead.id)) return false;
      if (status && lead.status !== status) return false;
      if (ownerId && lead.owner_id !== ownerId) return false;
      if (minScore !== undefined && lead.score < minScore) return false;
      if (search) {
        const full = `${lead.first_name} ${lead.last_name} ${lead.email} ${lead.company_name || ''}`.toLowerCase();
        if (!full.includes(search)) return false;
      }
      return true;
    });

    // Sort by createdAt desc
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit).map((item) => maskSensitiveFields(item, req.user!.role));

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/leads/:id
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const leadId = req.params.id as string;
    const lead = db.leads.get(leadId);
    if (!lead || lead.org_id !== req.user!.orgId) {
      return next(new AppError('Lead not found', 404, 'NOT_FOUND'));
    }
    if (!checkRecordVisibility(req.user!, lead.owner_id, 'LEAD', lead.id)) {
      return next(new AppError('Forbidden: Access to this lead is restricted', 403, 'FORBIDDEN'));
    }

    // Assessment 04: Log sensitive data access if marketing or support or export
    if (req.user!.role === 'SUPPORT' || req.user!.role === 'MARKETING') {
      const auditId = uuidv4();
      db.auditLogs.set(auditId, {
        id: auditId,
        org_id: req.user!.orgId,
        user_id: req.user!.userId,
        action: 'VIEW_SENSITIVE',
        entity_type: 'LEAD',
        entity_id: lead.id,
        changes: { viewed_email: lead.email },
        ip_address: req.ip || null,
        user_agent: req.headers['user-agent'] || null,
        created_at: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: maskSensitiveFields(lead, req.user!.role),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/leads - Create lead with deduplication check
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = createLeadSchema.parse(req.body);
    const orgId = req.user!.orgId;
    const normEmail = normalizeEmail(data.email);
    const normPhone = normalizePhone(data.phone);
    const dedupKey = generateDedupKey(normEmail, normPhone);

    // Deduplication check
    const existing = Array.from(db.leads.values()).find(
      (l) => l.org_id === orgId && (l.dedup_key === dedupKey || l.normalized_email === normEmail)
    );
    if (existing) {
      return next(
        new AppError(
          `Duplicate lead detected with matching email (${normEmail}). Existing lead ID: ${existing.id}`,
          409,
          'DUPLICATE_LEAD_DETECTED',
          { existingLeadId: existing.id, status: existing.status }
        )
      );
    }

    const { score, factors } = calculateLeadScore({
      email: normEmail,
      phone: normPhone,
      companyName: data.companyName,
      title: data.title,
    });

    const leadId = uuidv4();
    const newLead: LeadRecord = {
      id: leadId,
      org_id: orgId,
      owner_id: data.ownerId || req.user!.userId,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      normalized_email: normEmail,
      phone: data.phone || null,
      normalized_phone: normPhone || null,
      company_name: data.companyName || null,
      title: data.title || null,
      source: data.source,
      status: 'NEW',
      score,
      score_factors: factors,
      dedup_key: dedupKey,
      custom_fields: data.customFields,
      converted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.leads.set(leadId, newLead);

    // Audit Log
    const auditId = uuidv4();
    db.auditLogs.set(auditId, {
      id: auditId,
      org_id: orgId,
      user_id: req.user!.userId,
      action: 'CREATE',
      entity_type: 'LEAD',
      entity_id: leadId,
      changes: { new: newLead },
      ip_address: req.ip || null,
      user_agent: req.headers['user-agent'] || null,
      created_at: new Date().toISOString(),
    });

    // Assessment 07: Trigger workflow automation engine
    await runAutomationTrigger('LEAD_CREATED', { lead: newLead, orgId });

    res.status(201).json({
      success: true,
      data: newLead,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/leads/:id
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const leadId = req.params.id as string;
    const lead = db.leads.get(leadId);
    if (!lead || lead.org_id !== req.user!.orgId) {
      return next(new AppError('Lead not found', 404, 'NOT_FOUND'));
    }
    if (!checkRecordVisibility(req.user!, lead.owner_id, 'LEAD', lead.id)) {
      return next(new AppError('Forbidden: Access to this lead is restricted', 403, 'FORBIDDEN'));
    }

    const updates = updateLeadSchema.parse(req.body);
    const oldValues = { ...lead };

    if (updates.firstName) lead.first_name = updates.firstName;
    if (updates.lastName) lead.last_name = updates.lastName;
    if (updates.phone !== undefined) {
      lead.phone = updates.phone;
      lead.normalized_phone = normalizePhone(updates.phone);
    }
    if (updates.companyName !== undefined) lead.company_name = updates.companyName;
    if (updates.title !== undefined) lead.title = updates.title;
    if (updates.status) lead.status = updates.status;
    if (updates.score !== undefined) lead.score = updates.score;
    if (updates.ownerId !== undefined) lead.owner_id = updates.ownerId;
    if (updates.customFields) lead.custom_fields = { ...lead.custom_fields, ...updates.customFields };
    lead.updated_at = new Date().toISOString();

    // Audit Log
    const auditId = uuidv4();
    db.auditLogs.set(auditId, {
      id: auditId,
      org_id: req.user!.orgId,
      user_id: req.user!.userId,
      action: 'UPDATE',
      entity_type: 'LEAD',
      entity_id: lead.id,
      changes: { old: oldValues, updated: updates },
      ip_address: req.ip || null,
      user_agent: req.headers['user-agent'] || null,
      created_at: new Date().toISOString(),
    });

    if (updates.score !== undefined) {
      await runAutomationTrigger('SCORE_UPDATED', { lead, orgId: lead.org_id });
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/leads/:id/convert - Transactional Lead Conversion
router.post('/:id/convert', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const leadId = req.params.id as string;
    const lead = db.leads.get(leadId);
    if (!lead || lead.org_id !== req.user!.orgId) {
      return next(new AppError('Lead not found', 404, 'NOT_FOUND'));
    }
    if (lead.status === 'CONVERTED') {
      return next(new AppError('Lead has already been converted', 400, 'ALREADY_CONVERTED'));
    }

    const body = convertLeadSchema.parse(req.body);
    const orgId = req.user!.orgId;

    // 1. Resolve or Create Company
    let companyId = body.companyId;
    if (!companyId && body.createNewCompany && lead.company_name) {
      companyId = uuidv4();
      const newComp: CompanyRecord = {
        id: companyId,
        org_id: orgId,
        owner_id: lead.owner_id,
        name: lead.company_name,
        domain: lead.normalized_email.split('@')[1] || null,
        industry: null,
        annual_revenue: null,
        employee_count: null,
        phone: lead.phone,
        address: null,
        dedup_key: lead.company_name.toLowerCase().trim(),
        custom_fields: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.companies.set(companyId, newComp);
    }

    // 2. Create Contact
    const contactId = uuidv4();
    const newContact: ContactRecord = {
      id: contactId,
      org_id: orgId,
      owner_id: lead.owner_id,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      normalized_email: lead.normalized_email,
      phone: lead.phone,
      title: lead.title,
      dedup_key: lead.dedup_key,
      custom_fields: lead.custom_fields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.contacts.set(contactId, newContact);

    // 3. Link Company & Contact (Many-to-Many)
    if (companyId) {
      const ccId = uuidv4();
      db.companyContacts.set(ccId, {
        id: ccId,
        company_id: companyId,
        contact_id: contactId,
        role_title: lead.title,
        is_primary: true,
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // 4. Create Opportunity if requested
    let opportunity: OpportunityRecord | null = null;
    if (body.opportunityName || body.amount > 0) {
      const oppId = uuidv4();
      const defaultPipeline = Array.from(db.pipelines.values()).find((p) => p.org_id === orgId) || Array.from(db.pipelines.values())[0];
      const defaultStage = Array.from(db.pipelineStages.values()).find((s) => s.pipeline_id === defaultPipeline?.id) || Array.from(db.pipelineStages.values())[0];

      opportunity = {
        id: oppId,
        org_id: orgId,
        owner_id: lead.owner_id || req.user!.userId,
        pipeline_id: body.pipelineId || defaultPipeline?.id || 'pipe-default',
        stage_id: body.stageId || defaultStage?.id || 'stage-default',
        company_id: companyId || null,
        primary_contact_id: contactId,
        name: body.opportunityName || `${lead.company_name || lead.last_name} Deal`,
        amount: body.amount,
        currency: 'USD',
        probability: 0.2,
        close_date: body.closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'OPEN',
        version: 1,
        custom_fields: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.opportunities.set(oppId, opportunity);

      // Add owner to Opportunity Team
      db.opportunityTeams.set(uuidv4(), {
        id: uuidv4(),
        opportunity_id: oppId,
        user_id: opportunity.owner_id,
        role: 'LEAD',
        access_level: 'ADMIN',
        split_percentage: 100.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // 5. Update Lead status
    lead.status = 'CONVERTED';
    lead.converted_at = new Date().toISOString();
    lead.updated_at = new Date().toISOString();

    // 6. Record Audit
    const auditId = uuidv4();
    db.auditLogs.set(auditId, {
      id: auditId,
      org_id: orgId,
      user_id: req.user!.userId,
      action: 'UPDATE',
      entity_type: 'LEAD',
      entity_id: lead.id,
      changes: {
        converted: true,
        contactId,
        companyId,
        opportunityId: opportunity?.id,
      },
      ip_address: req.ip || null,
      user_agent: req.headers['user-agent'] || null,
      created_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Lead converted successfully',
      data: {
        lead,
        contact: newContact,
        companyId,
        opportunity,
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/leads/:id
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const leadId = req.params.id as string;
    const lead = db.leads.get(leadId);
    if (!lead || lead.org_id !== req.user!.orgId) {
      return next(new AppError('Lead not found', 404, 'NOT_FOUND'));
    }
    if (req.user!.role !== 'ADMIN' && req.user!.userId !== lead.owner_id) {
      return next(new AppError('Forbidden: Only admins or lead owner can delete leads', 403, 'FORBIDDEN'));
    }

    db.leads.delete(lead.id);

    // Audit Log
    const auditId = uuidv4();
    db.auditLogs.set(auditId, {
      id: auditId,
      org_id: req.user!.orgId,
      user_id: req.user!.userId,
      action: 'DELETE',
      entity_type: 'LEAD',
      entity_id: lead.id,
      changes: { deleted: lead },
      ip_address: req.ip || null,
      user_agent: req.headers['user-agent'] || null,
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
