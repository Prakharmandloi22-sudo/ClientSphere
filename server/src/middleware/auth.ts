import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/security';
import { AppError } from './errorHandler';
import { db } from '../db';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    const user = db.users.get(payload.userId);
    if (!user || !user.is_active) {
      return next(new AppError('User account not found or deactivated.', 401, 'USER_DEACTIVATED'));
    }
    req.user = payload;
    next();
  } catch (err: any) {
    return next(new AppError('Invalid or expired authentication token.', 401, 'INVALID_TOKEN'));
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user.role}' lacks permission for this operation. Required: [${allowedRoles.join(', ')}]`,
          403,
          'FORBIDDEN'
        )
      );
    }
    next();
  };
};

/**
 * Assessment 04 & Capstone: Enforce Record Ownership & Opportunity Team Visibility
 * - ADMIN: unrestricted access across organization
 * - SALES_MANAGER: can access own records + records of members in their managed teams
 * - SALES_REP: can access records they own, OR opportunities where they are in opportunity_teams
 * - MARKETING / SUPPORT: read access to allowed categories only
 */
export const checkRecordVisibility = (
  user: TokenPayload,
  recordOwnerId: string | null | undefined,
  entityType?: string,
  entityId?: string
): boolean => {
  if (user.role === 'ADMIN') return true;

  // If user owns the record
  if (recordOwnerId && recordOwnerId === user.userId) return true;

  // Manager hierarchy check
  if (user.role === 'SALES_MANAGER') {
    if (!recordOwnerId) return true;
    const owner = db.users.get(recordOwnerId);
    if (owner && owner.team_id && user.teamId && owner.team_id === user.teamId) {
      return true;
    }
    // Also check if user manages the team
    const teams = Array.from(db.teams.values()).filter((t) => t.manager_id === user.userId);
    if (teams.some((t) => t.id === owner?.team_id)) {
      return true;
    }
  }

  // Opportunity Team Member check (Domain-Specific Capstone)
  if (entityType === 'OPPORTUNITY' && entityId) {
    const oppTeam = Array.from(db.opportunityTeams.values()).find(
      (ot) => ot.opportunity_id === entityId && ot.user_id === user.userId
    );
    if (oppTeam) return true;
  }

  // Shared organizational reads for Marketing and Support
  if ((user.role === 'MARKETING' || user.role === 'SUPPORT') && (entityType === 'LEAD' || entityType === 'CONTACT' || entityType === 'COMPANY')) {
    return true;
  }

  return false;
};
