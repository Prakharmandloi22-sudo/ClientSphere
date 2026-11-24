import { Router, Response } from 'express';
import { db } from '../../db';
import { authenticate, AuthenticatedRequest, requireRole } from '../../middleware/auth';

const router = Router();

// GET /api/v1/audit - View audit history (Assessment 04 - Audit sensitive customer data)
router.get('/', authenticate, requireRole(['ADMIN', 'SALES_MANAGER']), (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const orgId = req.user!.orgId;
    const entityType = req.query.entityType as string;
    const entityId = req.query.entityId as string;
    const action = req.query.action as string;

    let logs = Array.from(db.auditLogs.values()).filter((l) => {
      if (l.org_id !== orgId) return false;
      if (entityType && l.entity_type !== entityType) return false;
      if (entityId && l.entity_id !== entityId) return false;
      if (action && l.action !== action) return false;
      return true;
    });

    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const result = logs.map((log) => {
      const user = log.user_id ? db.users.get(log.user_id) : null;
      return {
        ...log,
        userName: user ? `${user.first_name} ${user.last_name}` : 'System',
        userEmail: user?.email,
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

export default router;
