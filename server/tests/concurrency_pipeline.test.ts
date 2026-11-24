import request from 'supertest';
import { app } from '../src/app';

describe('Assessment 03 & 12 - Optimistic Concurrency Control & Pipeline Transitions', () => {
  let token: string;
  let opportunityId: string;
  let currentVersion: number;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@clientsphere.internal', password: 'Password123!' });
    token = res.body.data.tokens.accessToken;

    const opp = await request(app)
      .post('/api/v1/opportunities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Concurrent Edit Benchmark Deal',
        pipelineId: 'pipe-enterprise-standard',
        stageId: 'stage-1-discovery',
        amount: 120000,
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

    opportunityId = opp.body.data.id;
    currentVersion = opp.body.data.version; // starts at 1
  });

  it('should successfully update opportunity when providing correct version', async () => {
    const res = await request(app)
      .put(`/api/v1/opportunities/${opportunityId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Concurrent Edit Benchmark Deal (Updated Amount)',
        amount: 150000,
        version: currentVersion,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(150000);
    expect(res.body.data.version).toBe(currentVersion + 1);

    currentVersion = res.body.data.version; // now 2
  });

  it('should reject concurrent modification when submitting outdated version with 409', async () => {
    const staleVersion = currentVersion - 1; // version 1 when server is at 2

    const res = await request(app)
      .put(`/api/v1/opportunities/${opportunityId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Stale Overwrite Attempt',
        amount: 999999,
        version: staleVersion,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONCURRENT_MODIFICATION_ERROR');
    expect(res.body.error.details.currentVersion).toBe(currentVersion);
  });

  it('should transition stage, auto-adjust probability, and create STAGE_TRANSITION audit log', async () => {
    const res = await request(app)
      .put(`/api/v1/opportunities/${opportunityId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        stageId: 'stage-3-proposal',
        version: currentVersion,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.stage_id).toBe('stage-3-proposal');
    expect(res.body.data.probability).toBe(0.6); // Proposal stage probability

    // Check audit logs
    const auditRes = await request(app)
      .get(`/api/v1/audit?entityType=OPPORTUNITY&entityId=${opportunityId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.some((l: any) => l.action === 'STAGE_TRANSITION')).toBe(true);
  });
});
