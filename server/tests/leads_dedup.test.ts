import request from 'supertest';
import { app } from '../src/app';

describe('Assessment 02, 03 & 05 - Leads, Deduplication & Atomic Conversion', () => {
  let token: string;
  let testLeadId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@clientsphere.internal', password: 'Password123!' });
    token = res.body.data.tokens.accessToken;
  });

  it('should create a new lead with automated explainable scoring', async () => {
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Alexander',
        lastName: 'Wright',
        email: 'alexander.wright@techfrontier.io',
        phone: '+1-555-4422',
        companyName: 'Tech Frontier Innovations',
        title: 'Vice President of Product',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.score).toBeGreaterThanOrEqual(80); // Seniority + corporate email
    expect(res.body.data.score_factors.corporate_email).toBeDefined();

    testLeadId = res.body.data.id;
  });

  it('should detect duplicate lead and reject with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Alex',
        lastName: 'Wright',
        email: 'alexander.wright@techfrontier.io', // Duplicate Email
        phone: '+1-555-4422',
        companyName: 'Tech Frontier',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_LEAD_DETECTED');
    expect(res.body.error.details.existingLeadId).toBe(testLeadId);
  });

  it('should atomically convert lead into Contact, Company and Opportunity', async () => {
    const res = await request(app)
      .post(`/api/v1/leads/${testLeadId}/convert`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        opportunityName: 'Tech Frontier Enterprise Platform Deal',
        amount: 85000,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lead.status).toBe('CONVERTED');
    expect(res.body.data.contact.email).toBe('alexander.wright@techfrontier.io');
    expect(res.body.data.opportunity.amount).toBe(85000);
  });

  it('should reject converting an already converted lead', async () => {
    const res = await request(app)
      .post(`/api/v1/leads/${testLeadId}/convert`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 10000 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ALREADY_CONVERTED');
  });
});
