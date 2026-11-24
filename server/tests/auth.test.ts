import request from 'supertest';
import { app } from '../src/app';

describe('Assessment 04 - Authentication, RBAC & Token Lifecycle', () => {
  let adminToken: string;
  let repToken: string;
  let refreshToken: string;

  it('should authenticate admin user and return JWT tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@clientsphere.internal',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.user.role).toBe('ADMIN');

    adminToken = res.body.data.tokens.accessToken;
    refreshToken = res.body.data.tokens.refreshToken;
  });

  it('should authenticate sales rep and return rep tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'rep1@clientsphere.internal',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('SALES_REP');
    repToken = res.body.data.tokens.accessToken;
  });

  it('should reject invalid password with 401 and safe error response', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@clientsphere.internal',
        password: 'WrongPassword999!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should rotate access token via refresh token endpoint', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('should retrieve current user profile with /me', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@clientsphere.internal');
  });

  it('should enforce RBAC: sales rep cannot access audit logs (Admin only)', async () => {
    const res = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${repToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
