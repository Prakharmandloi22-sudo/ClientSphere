import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db, UserRecord, OrgRecord } from '../../db';
import {
  generateTokens,
  comparePassword,
  hashPassword,
  verifyRefreshToken,
  normalizeEmail,
} from '../../utils/security';
import { AppError } from '../../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  orgName: z.string().min(2),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'SALES_MANAGER', 'SALES_REP', 'MARKETING', 'SUPPORT']).default('SALES_REP'),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalized = normalizeEmail(email);

    const user = Array.from(db.users.values()).find((u) => normalizeEmail(u.email) === normalized);
    if (!user || !user.is_active) {
      return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const tokens = generateTokens({
      userId: user.id,
      orgId: user.org_id,
      role: user.role,
      teamId: user.team_id,
      email: user.email,
    });

    // Store refresh token
    const tokenId = uuidv4();
    db.refreshTokens.set(tokenId, {
      id: tokenId,
      user_id: user.id,
      token_hash: tokens.tokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      revoked_at: null,
      created_at: new Date().toISOString(),
    });

    const org = db.organizations.get(user.org_id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          teamId: user.team_id,
          orgId: user.org_id,
          organization: org ? { id: org.id, name: org.name, plan: org.plan } : null,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const normalized = normalizeEmail(data.email);

    const existing = Array.from(db.users.values()).find((u) => normalizeEmail(u.email) === normalized);
    if (existing) {
      return next(new AppError('User with this email already exists', 409, 'USER_EXISTS'));
    }

    const orgId = uuidv4();
    const newOrg: OrgRecord = {
      id: orgId,
      name: data.orgName,
      domain: normalized.split('@')[1] || null,
      plan: 'ENTERPRISE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.organizations.set(orgId, newOrg);

    const userId = uuidv4();
    const passHash = await hashPassword(data.password);
    const newUser: UserRecord = {
      id: userId,
      org_id: orgId,
      team_id: null,
      email: data.email,
      password_hash: passHash,
      first_name: data.firstName,
      last_name: data.lastName,
      role: data.role as any,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.users.set(userId, newUser);

    const tokens = generateTokens({
      userId: newUser.id,
      orgId: newUser.org_id,
      role: newUser.role,
      teamId: newUser.team_id,
      email: newUser.email,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          orgId: newUser.org_id,
          organization: { id: newOrg.id, name: newOrg.name, plan: newOrg.plan },
        },
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(new AppError('Refresh token required', 400, 'MISSING_REFRESH_TOKEN'));
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = db.users.get(decoded.userId);
    if (!user || !user.is_active) {
      return next(new AppError('User not found or inactive', 401, 'UNAUTHORIZED'));
    }

    // Verify token hash in store and ensure not revoked
    const foundToken = Array.from(db.refreshTokens.values()).find(
      (t) => t.user_id === user.id && !t.revoked_at && new Date(t.expires_at) > new Date()
    );

    if (!foundToken) {
      return next(new AppError('Refresh token revoked or expired', 401, 'INVALID_REFRESH_TOKEN'));
    }

    // Rotate tokens
    foundToken.revoked_at = new Date().toISOString();

    const newTokens = generateTokens({
      userId: user.id,
      orgId: user.org_id,
      role: user.role,
      teamId: user.team_id,
      email: user.email,
    });

    const newTokId = uuidv4();
    db.refreshTokens.set(newTokId, {
      id: newTokId,
      user_id: user.id,
      token_hash: newTokens.tokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      revoked_at: null,
      created_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      },
    });
  } catch (err) {
    next(new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN'));
  }
});

router.post('/revoke', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.userId;
    // Revoke all tokens for this user
    for (const token of db.refreshTokens.values()) {
      if (token.user_id === userId) {
        token.revoked_at = new Date().toISOString();
      }
    }
    res.json({ success: true, message: 'All active sessions revoked successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  const user = db.users.get(req.user!.userId);
  if (!user) {
    return next(new AppError('User not found', 404, 'NOT_FOUND'));
  }

  const org = db.organizations.get(user.org_id);
  const team = user.team_id ? db.teams.get(user.team_id) : null;

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      team: team ? { id: team.id, name: team.name } : null,
      organization: org ? { id: org.id, name: org.name, plan: org.plan } : null,
    },
  });
});

export default router;
