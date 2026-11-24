import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db, AutomationRuleRecord } from '../../db';
import { authenticate, AuthenticatedRequest, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  triggerEvent: z.enum(['LEAD_CREATED', 'STAGE_CHANGED', 'SCORE_UPDATED', 'ACTIVITY_LOGGED']),
  conditions: z.array(
    z.object({
      field: z.string(),
      operator: z.string(),
      value: z.any(),
    })
  ).default([]),
  actions: z.array(
    z.object({
      type: z.string(),
      params: z.record(z.any()),
    })
  ).min(1),
  isActive: z.boolean().default(true),
});

// GET /api/v1/automation/rules
router.get('/rules', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const orgId = req.user!.orgId;
    const rules = Array.from(db.automationRules.values()).filter((r) => r.org_id === orgId);
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/automation/rules
router.post('/rules', authenticate, requireRole(['ADMIN', 'SALES_MANAGER']), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = createRuleSchema.parse(req.body);
    const orgId = req.user!.orgId;

    const ruleId = uuidv4();
    const newRule: AutomationRuleRecord = {
      id: ruleId,
      org_id: orgId,
      created_by_id: req.user!.userId,
      name: data.name,
      description: data.description || null,
      trigger_event: data.triggerEvent,
      conditions: data.conditions as any,
      actions: data.actions as any,
      is_active: data.isActive,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.automationRules.set(ruleId, newRule);

    res.status(201).json({ success: true, data: newRule });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/automation/rules/:id
router.put('/rules/:id', authenticate, requireRole(['ADMIN', 'SALES_MANAGER']), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const ruleId = req.params.id as string;
    const rule = db.automationRules.get(ruleId);
    if (!rule || rule.org_id !== req.user!.orgId) {
      return next(new AppError('Automation rule not found', 404, 'NOT_FOUND'));
    }

    const { name, description, triggerEvent, conditions, actions, isActive } = req.body;
    if (name) rule.name = name;
    if (description !== undefined) rule.description = description;
    if (triggerEvent) rule.trigger_event = triggerEvent;
    if (conditions) rule.conditions = conditions;
    if (actions) rule.actions = actions;
    if (isActive !== undefined) rule.is_active = isActive;
    rule.updated_at = new Date().toISOString();

    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/automation/rules/:id
router.delete('/rules/:id', authenticate, requireRole(['ADMIN']), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const ruleId = req.params.id as string;
    const rule = db.automationRules.get(ruleId);
    if (!rule || rule.org_id !== req.user!.orgId) {
      return next(new AppError('Automation rule not found', 404, 'NOT_FOUND'));
    }

    db.automationRules.delete(rule.id);
    res.json({ success: true, message: 'Automation rule deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/automation/executions - Execution history & audit
router.get('/executions', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const ruleId = req.query.ruleId as string;
    const status = req.query.status as string;

    let executions = Array.from(db.automationExecutions.values()).filter((e) => {
      if (ruleId && e.rule_id !== ruleId) return false;
      if (status && e.status !== status) return false;
      return true;
    });

    executions.sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime());

    const result = executions.map((exec) => {
      const rule = db.automationRules.get(exec.rule_id);
      return {
        ...exec,
        ruleName: rule?.name || 'Unknown Rule',
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
