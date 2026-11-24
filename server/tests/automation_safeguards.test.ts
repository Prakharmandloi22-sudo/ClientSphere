import request from 'supertest';
import { app } from '../src/app';
import { runAutomationTrigger } from '../src/modules/automation/automation.service';
import { db } from '../src/db';

describe('Assessment 07 & 12 - Workflow Automation Engine & Loop Safeguards', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@clientsphere.internal', password: 'Password123!' });
    token = res.body.data.tokens.accessToken;
  });

  it('should retrieve registered automation rules', async () => {
    const res = await request(app)
      .get('/api/v1/automation/rules')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should detect cascading execution beyond max depth and abort with ABORTED_LOOP', async () => {
    // Run automation trigger with depthLevel = 6 (exceeding MAX_EXECUTION_DEPTH = 5)
    await runAutomationTrigger('SCORE_UPDATED', {
      orgId: 'org-clientsphere-demo',
      lead: { id: 'lead-test-loop', score: 95, owner_id: 'user-rep-1' },
      depthLevel: 6,
    });

    const res = await request(app)
      .get('/api/v1/automation/executions?status=ABORTED_LOOP')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const aborted = res.body.data[0];
    expect(aborted.status).toBe('ABORTED_LOOP');
    expect(aborted.error_message).toContain('Recursion depth exceeded maximum limit');
  });
});
