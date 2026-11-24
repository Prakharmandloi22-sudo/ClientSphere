import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db, OpportunityRecord, OpportunityTeamRecord } from '../../db';
import { authenticate, AuthenticatedRequest, checkRecordVisibility } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { maskSensitiveFields } from '../../utils/security';
import { runAutomationTrigger } from '../automation/automation.service';

const router = Router();

const createOpportunitySchema = z.object({
  name: z.string().min(1),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  companyId: z.string().optional().nullable(),
  primaryContactId: z.string().optional().nullable(),
  amount: z.number().min(0).default(0),
  currency: z.string().default('USD'),
  probability: z.number().min(0).max(1).optional(),
  closeDate: z.string(),
  ownerId: z.string().optional().nullable(),
  customFields: z.record(z.any()).optional().default({}),
});

const updateOpportunitySchema = z.object({
  name: z.string().optional(),
  stageId: z.string().optional(),
  companyId: z.string().optional().nullable(),
  primaryContactId: z.string().optional().nullable(),
  amount: z.number().min(0).optional(),
  currency: z.string().optional(),
  probability: z.number().min(0).max(1).optional(),
  closeDate: z.string().optional(),
  status: z.enum(['OPEN', 'WON', 'LOST']).optional(),
  ownerId: z.string().optional(),
  version: z.number().int().min(1), // Optimistic concurrency check
  customFields: z.record(z.any()).optional(),
});

const addTeamMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['LEAD', 'COLLABORATOR', 'SPECIALIST', 'VIEWER']).default('COLLABORATOR'),
  accessLevel: z.enum(['READ', 'WRITE', 'ADMIN']).default('READ'),
  splitPercentage: z.number().min(0).max(100).default(0),
});

// GET /api/v1/opportunities
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const orgId = req.user!.orgId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const pipelineId = req.query.pipelineId as string;
    const stageId = req.query.stageId as string;
    const status = req.query.status as string;
    const search = (req.query.q as string || '').toLowerCase();

    let opps = Array.from(db.opportunities.values()).filter((o) => {
      if (o.org_id !== orgId) return false;
      if (!checkRecordVisibility(req.user!, o.owner_id, 'OPPORTUNITY', o.id)) return false;
      if (pipelineId && o.pipeline_id !== pipelineId) return false;
      if (stageId && o.stage_id !== stageId) return false;
      if (status && o.status !== status) return false;
      if (search && !o.name.toLowerCase().includes(search)) return false;
      return true;
    });

    opps.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = opps.length;
    const paginated = opps.slice((page - 1) * limit, page * limit).map((opp) => {
      const company = opp.company_id ? db.companies.get(opp.company_id) : null;
      const contact = opp.primary_contact_id ? db.contacts.get(opp.primary_contact_id) : null;
      const stage = db.pipelineStages.get(opp.stage_id);
      const owner = db.users.get(opp.owner_id);

      return {
        ...maskSensitiveFields(opp, req.user!.role),
        companyName: company?.name || null,
        contactName: contact ? `${contact.first_name} ${contact.last_name}` : null,
        stageName: stage?.name || 'Unknown',
        ownerName: owner ? `${owner.first_name} ${owner.last_name}` : 'Unassigned',
      };
    });

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

// GET /api/v1/opportunities/:id
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const oppId = req.params.id as string;
    const opp = db.opportunities.get(oppId);
    if (!opp || opp.org_id !== req.user!.orgId) {
      return next(new AppError('Opportunity not found', 404, 'NOT_FOUND'));
    }
    if (!checkRecordVisibility(req.user!, opp.owner_id, 'OPPORTUNITY', opp.id)) {
      return next(new AppError('Forbidden: Access to this opportunity is restricted', 403, 'FORBIDDEN'));
    }

    const company = opp.company_id ? db.companies.get(opp.company_id) : null;
    const contact = opp.primary_contact_id ? db.contacts.get(opp.primary_contact_id) : null;
    const stage = db.pipelineStages.get(opp.stage_id);
    const pipeline = db.pipelines.get(opp.pipeline_id);
    const owner = db.users.get(opp.owner_id);

    // Opportunity Team members (Capstone)
    const teamMembers = Array.from(db.opportunityTeams.values())
      .filter((ot) => ot.opportunity_id === opp.id)
      .map((ot) => {
        const u = db.users.get(ot.user_id);
        return {
          id: ot.id,
          userId: ot.user_id,
          name: u ? `${u.first_name} ${u.last_name}` : 'Unknown',
          email: u?.email,
          role: ot.role,
          accessLevel: ot.access_level,
          splitPercentage: ot.split_percentage,
        };
      });

    res.json({
      success: true,
      data: {
        ...maskSensitiveFields(opp, req.user!.role),
        company,
        contact,
        stage,
        pipeline,
        owner: owner ? { id: owner.id, name: `${owner.first_name} ${owner.last_name}`, email: owner.email } : null,
        teamMembers,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/opportunities
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = createOpportunitySchema.parse(req.body);
    const orgId = req.user!.orgId;
    const stage = db.pipelineStages.get(data.stageId);

    const oppId = uuidv4();
    const newOpp: OpportunityRecord = {
      id: oppId,
      org_id: orgId,
      owner_id: data.ownerId || req.user!.userId,
      pipeline_id: data.pipelineId,
      stage_id: data.stageId,
      company_id: data.companyId || null,
      primary_contact_id: data.primaryContactId || null,
      name: data.name,
      amount: data.amount,
      currency: data.currency,
      probability: data.probability ?? (stage ? stage.probability : 0.2),
      close_date: data.closeDate,
      status: 'OPEN',
      version: 1,
      custom_fields: data.customFields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.opportunities.set(oppId, newOpp);

    // Add owner to Opportunity Team with LEAD role
    const otId = uuidv4();
    db.opportunityTeams.set(otId, {
      id: otId,
      opportunity_id: oppId,
      user_id: newOpp.owner_id,
      role: 'LEAD',
      access_level: 'ADMIN',
      split_percentage: 100.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: newOpp,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/opportunities/:id - Update with Optimistic Concurrency Control
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const oppId = req.params.id as string;
    const opp = db.opportunities.get(oppId);
    if (!opp || opp.org_id !== req.user!.orgId) {
      return next(new AppError('Opportunity not found', 404, 'NOT_FOUND'));
    }

    // Check write permission (owner or admin or team member with WRITE/ADMIN)
    let canWrite = req.user!.role === 'ADMIN' || opp.owner_id === req.user!.userId;
    if (!canWrite) {
      const member = Array.from(db.opportunityTeams.values()).find(
        (ot) => ot.opportunity_id === opp.id && ot.user_id === req.user!.userId
      );
      if (member && (member.access_level === 'WRITE' || member.access_level === 'ADMIN')) {
        canWrite = true;
      }
    }
    if (!canWrite) {
      return next(new AppError('Forbidden: Write access denied for this opportunity', 403, 'FORBIDDEN'));
    }

    const updates = updateOpportunitySchema.parse(req.body);

    // Assessment 03 & Concurrency Requirement: Optimistic Lock Check
    if (updates.version !== opp.version) {
      return next(
        new AppError(
          `Conflict: Opportunity was modified by another user. Expected version ${opp.version}, but received version ${updates.version}. Please refresh and reapply your changes.`,
          409,
          'CONCURRENT_MODIFICATION_ERROR',
          { currentVersion: opp.version, providedVersion: updates.version }
        )
      );
    }

    const oldStageId = opp.stage_id;
    const stageChanged = updates.stageId && updates.stageId !== oldStageId;

    if (updates.name) opp.name = updates.name;
    if (updates.stageId) {
      opp.stage_id = updates.stageId;
      const stage = db.pipelineStages.get(updates.stageId);
      if (stage) {
        opp.probability = stage.probability;
        if (stage.is_won) opp.status = 'WON';
        else if (stage.is_lost) opp.status = 'LOST';
        else opp.status = 'OPEN';
      }
    }
    if (updates.amount !== undefined) opp.amount = updates.amount;
    if (updates.currency) opp.currency = updates.currency;
    if (updates.probability !== undefined) opp.probability = updates.probability;
    if (updates.closeDate) opp.close_date = updates.closeDate;
    if (updates.status) opp.status = updates.status;
    if (updates.companyId !== undefined) opp.company_id = updates.companyId;
    if (updates.primaryContactId !== undefined) opp.primary_contact_id = updates.primaryContactId;
    if (updates.customFields) opp.custom_fields = { ...opp.custom_fields, ...updates.customFields };

    // Increment version for optimistic locking
    opp.version += 1;
    opp.updated_at = new Date().toISOString();

    // Audit Log for stage transitions
    if (stageChanged) {
      const auditId = uuidv4();
      db.auditLogs.set(auditId, {
        id: auditId,
        org_id: opp.org_id,
        user_id: req.user!.userId,
        action: 'STAGE_TRANSITION',
        entity_type: 'OPPORTUNITY',
        entity_id: opp.id,
        changes: { oldStageId, newStageId: opp.stage_id },
        ip_address: req.ip || null,
        user_agent: req.headers['user-agent'] || null,
        created_at: new Date().toISOString(),
      });

      // Assessment 07: Trigger workflow automation on stage changed
      await runAutomationTrigger('STAGE_CHANGED', {
        opportunity: opp,
        previousStageId: oldStageId,
        newStageId: opp.stage_id,
        orgId: opp.org_id,
      });
    }

    res.json({
      success: true,
      data: opp,
    });
  } catch (err) {
    next(err);
  }
});

// Domain-Specific Challenge: Manage Opportunity Collaboration Teams
// POST /api/v1/opportunities/:id/team - Add Team Member
router.post('/:id/team', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const oppId = req.params.id as string;
    const opp = db.opportunities.get(oppId);
    if (!opp || opp.org_id !== req.user!.orgId) {
      return next(new AppError('Opportunity not found', 404, 'NOT_FOUND'));
    }

    const data = addTeamMemberSchema.parse(req.body);
    const targetUser = db.users.get(data.userId);
    if (!targetUser || targetUser.org_id !== req.user!.orgId) {
      return next(new AppError('Target user not found in organization', 404, 'USER_NOT_FOUND'));
    }

    const existing = Array.from(db.opportunityTeams.values()).find(
      (ot) => ot.opportunity_id === opp.id && ot.user_id === data.userId
    );
    if (existing) {
      return next(new AppError('User is already a member of this opportunity team', 409, 'TEAM_MEMBER_EXISTS'));
    }

    const otId = uuidv4();
    const newMember: OpportunityTeamRecord = {
      id: otId,
      opportunity_id: opp.id,
      user_id: data.userId,
      role: data.role as any,
      access_level: data.accessLevel as any,
      split_percentage: data.splitPercentage,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.opportunityTeams.set(otId, newMember);

    res.status(201).json({
      success: true,
      message: 'Collaborator added to opportunity team',
      data: newMember,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/opportunities/:id/team/:userId - Remove Team Member
router.delete('/:id/team/:userId', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const oppId = req.params.id as string;
    const userId = req.params.userId as string;
    const member = Array.from(db.opportunityTeams.values()).find(
      (ot) => ot.opportunity_id === oppId && ot.user_id === userId
    );
    if (!member) {
      return next(new AppError('Opportunity team member not found', 404, 'NOT_FOUND'));
    }

    db.opportunityTeams.delete(member.id);
    res.json({ success: true, message: 'Collaborator removed from opportunity team' });
  } catch (err) {
    next(err);
  }
});

export default router;
