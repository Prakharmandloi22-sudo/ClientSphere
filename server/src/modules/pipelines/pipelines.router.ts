import { Router, Response } from 'express';
import { db } from '../../db';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// GET /api/v1/pipelines
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const orgId = req.user!.orgId;
    const pipelines = Array.from(db.pipelines.values()).filter((p) => p.org_id === orgId);

    const result = pipelines.map((p) => {
      const stages = Array.from(db.pipelineStages.values())
        .filter((s) => s.pipeline_id === p.id)
        .sort((a, b) => a.stage_order - b.stage_order);
      return {
        ...p,
        stages,
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

// GET /api/v1/pipelines/:id/kanban - Kanban board stage grouping
router.get('/:id/kanban', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const orgId = req.user!.orgId;
    const pipelineId = req.params.id as string;
    const pipeline = db.pipelines.get(pipelineId);
    if (!pipeline || pipeline.org_id !== orgId) {
      return next(new AppError('Pipeline not found', 404, 'NOT_FOUND'));
    }

    const stages = Array.from(db.pipelineStages.values())
      .filter((s) => s.pipeline_id === pipeline.id)
      .sort((a, b) => a.stage_order - b.stage_order);

    const kanbanStages = stages.map((stage) => {
      const opps = Array.from(db.opportunities.values())
        .filter((o) => o.pipeline_id === pipeline.id && o.stage_id === stage.id && o.org_id === orgId)
        .map((o) => {
          const company = o.company_id ? db.companies.get(o.company_id) : null;
          const contact = o.primary_contact_id ? db.contacts.get(o.primary_contact_id) : null;
          const owner = db.users.get(o.owner_id);
          return {
            ...o,
            companyName: company?.name || null,
            contactName: contact ? `${contact.first_name} ${contact.last_name}` : null,
            ownerName: owner ? `${owner.first_name} ${owner.last_name}` : 'Unassigned',
          };
        });

      const stageValue = opps.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const weightedValue = opps.reduce((acc, curr) => acc + Number(curr.amount || 0) * (curr.probability || 0), 0);

      return {
        stageId: stage.id,
        stageName: stage.name,
        stageOrder: stage.stage_order,
        probability: stage.probability,
        isWon: stage.is_won,
        isLost: stage.is_lost,
        count: opps.length,
        totalValue: stageValue,
        weightedValue,
        opportunities: opps,
      };
    });

    const totalPipelineValue = kanbanStages.reduce((acc, s) => acc + s.totalValue, 0);
    const totalWeightedValue = kanbanStages.reduce((acc, s) => acc + s.weightedValue, 0);

    res.json({
      success: true,
      data: {
        pipeline: {
          id: pipeline.id,
          name: pipeline.name,
        },
        metrics: {
          totalPipelineValue,
          totalWeightedValue,
          totalOpportunities: kanbanStages.reduce((acc, s) => acc + s.count, 0),
        },
        columns: kanbanStages,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
