import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db, ActivityRecord } from '../../db';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const createActivitySchema = z.object({
  activityType: z.enum(['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE', 'STATUS_CHANGE']),
  subject: z.string().min(1),
  description: z.string().optional().nullable(),
  entityType: z.enum(['LEAD', 'CONTACT', 'COMPANY', 'OPPORTUNITY']),
  entityId: z.string().min(1),
  scheduledAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).default('COMPLETED'),
  metadata: z.record(z.any()).optional().default({}),
});

// GET /api/v1/activities - Activity Timeline
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const orgId = req.user!.orgId;
    const entityType = req.query.entityType as string;
    const entityId = req.query.entityId as string;
    const activityType = req.query.activityType as string;

    let activities = Array.from(db.activities.values()).filter((a) => {
      if (a.org_id !== orgId) return false;
      if (entityType && a.entity_type !== entityType) return false;
      if (entityId && a.entity_id !== entityId) return false;
      if (activityType && a.activity_type !== activityType) return false;
      return true;
    });

    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const result = activities.map((act) => {
      const user = db.users.get(act.performed_by_id);
      return {
        ...act,
        performedByName: user ? `${user.first_name} ${user.last_name}` : 'System / Unknown',
      };
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activities
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = createActivitySchema.parse(req.body);
    const orgId = req.user!.orgId;

    const actId = uuidv4();
    const newActivity: ActivityRecord = {
      id: actId,
      org_id: orgId,
      performed_by_id: req.user!.userId,
      activity_type: data.activityType,
      subject: data.subject,
      description: data.description || null,
      entity_type: data.entityType,
      entity_id: data.entityId,
      scheduled_at: data.scheduledAt || null,
      completed_at: data.status === 'COMPLETED' ? (data.completedAt || new Date().toISOString()) : null,
      status: data.status,
      metadata: data.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.activities.set(actId, newActivity);

    res.status(201).json({
      success: true,
      data: newActivity,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/activities/:id
router.put('/:id', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const actId = req.params.id as string;
    const act = db.activities.get(actId);
    if (!act || act.org_id !== req.user!.orgId) {
      return next(new AppError('Activity not found', 404, 'NOT_FOUND'));
    }

    const { status, subject, description, completedAt, metadata } = req.body;
    if (status) {
      act.status = status;
      if (status === 'COMPLETED' && !act.completed_at) {
        act.completed_at = completedAt || new Date().toISOString();
      }
    }
    if (subject) act.subject = subject;
    if (description !== undefined) act.description = description;
    if (metadata) act.metadata = { ...act.metadata, ...metadata };
    act.updated_at = new Date().toISOString();

    res.json({ success: true, data: act });
  } catch (err) {
    next(err);
  }
});

export default router;
