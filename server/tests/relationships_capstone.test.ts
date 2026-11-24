import request from 'supertest';
import { app } from '../src/app';

describe('Domain-Specific Capstone - Multi-Company Contacts & Opportunity Teams', () => {
  let token: string;
  let contactId: string;
  let company1Id: string;
  let company2Id: string;
  let opportunityId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@clientsphere.internal', password: 'Password123!' });
    token = res.body.data.tokens.accessToken;

    // Create 2 test companies
    const comp1 = await request(app)
      .post('/api/v1/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Alpha Biotech Labs', domain: 'alphabiotech.com' });
    company1Id = comp1.body.data.id;

    const comp2 = await request(app)
      .post('/api/v1/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Beta Health AI', domain: 'betahealth.ai' });
    company2Id = comp2.body.data.id;

    // Create 1 contact
    const cont = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Dr. Evelyn',
        lastName: 'Vance',
        email: 'evelyn.vance@alphabiotech.com',
        title: 'Chief Scientific Officer',
        companyId: company1Id,
        roleTitle: 'CSO (Primary)',
        isPrimary: true,
      });
    contactId = cont.body.data.id;

    // Create an opportunity
    const opp = await request(app)
      .post('/api/v1/opportunities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Alpha Genomics Enterprise License',
        pipelineId: 'pipe-enterprise-standard',
        stageId: 'stage-1-discovery',
        companyId: company1Id,
        primaryContactId: contactId,
        amount: 250000,
        closeDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      });
    opportunityId = opp.body.data.id;
  });

  it('should associate the same contact with a second company (Many-to-Many)', async () => {
    const res = await request(app)
      .post(`/api/v1/contacts/${contactId}/companies`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyId: company2Id,
        roleTitle: 'Scientific Advisory Board Chair',
        isPrimary: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.company_id).toBe(company2Id);
  });

  it('should reject duplicate company-contact relationship pairing with 409', async () => {
    const res = await request(app)
      .post(`/api/v1/contacts/${contactId}/companies`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyId: company2Id,
        roleTitle: 'Duplicate Link',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('RELATIONSHIP_EXISTS');
  });

  it('should retrieve contact and return all associated companies', async () => {
    const res = await request(app)
      .get(`/api/v1/contacts/${contactId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.companies).toHaveLength(2);
    expect(res.body.data.companies.some((c: any) => c.companyId === company1Id && c.isPrimary)).toBe(true);
    expect(res.body.data.companies.some((c: any) => c.companyId === company2Id && !c.isPrimary)).toBe(true);
  });

  it('should add multiple sales representatives to opportunity collaboration team', async () => {
    const res = await request(app)
      .post(`/api/v1/opportunities/${opportunityId}/team`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        userId: 'user-rep-2',
        role: 'COLLABORATOR',
        accessLevel: 'WRITE',
        splitPercentage: 35.0,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.split_percentage).toBe(35.0);
  });

  it('should reject duplicate user in opportunity team with 409', async () => {
    const res = await request(app)
      .post(`/api/v1/opportunities/${opportunityId}/team`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        userId: 'user-rep-2',
        role: 'COLLABORATOR',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TEAM_MEMBER_EXISTS');
  });
});
