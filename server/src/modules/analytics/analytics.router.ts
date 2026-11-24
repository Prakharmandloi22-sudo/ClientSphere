import { Router, Response } from 'express';
import { db } from '../../db';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

// GET /api/v1/analytics/dashboard - Real-time Sales Metrics & Executive Overview
router.get('/dashboard', authenticate, (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const orgId = req.user!.orgId;

    const leads = Array.from(db.leads.values()).filter((l) => l.org_id === orgId);
    const opps = Array.from(db.opportunities.values()).filter((o) => o.org_id === orgId);
    const companies = Array.from(db.companies.values()).filter((c) => c.org_id === orgId);
    const contacts = Array.from(db.contacts.values()).filter((c) => c.org_id === orgId);

    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter((l) => l.status === 'QUALIFIED' || l.status === 'CONVERTED').length;
    const leadConversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;

    const wonOpps = opps.filter((o) => o.status === 'WON');
    const closedOpps = opps.filter((o) => o.status === 'WON' || o.status === 'LOST');
    const winRate = closedOpps.length > 0 ? (wonOpps.length / closedOpps.length) * 100 : 0;

    const totalPipelineValue = opps
      .filter((o) => o.status === 'OPEN')
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);

    const weightedPipelineValue = opps
      .filter((o) => o.status === 'OPEN')
      .reduce((sum, o) => sum + Number(o.amount || 0) * Number(o.probability || 0), 0);

    const closedRevenue = wonOpps.reduce((sum, o) => sum + Number(o.amount || 0), 0);

    // Sales Velocity Calculation (Assessment 06)
    // Formula: V = (Number of Opps * Average Deal Size * Win Rate) / Average Sales Cycle Days
    const avgDealSize = wonOpps.length > 0 ? closedRevenue / wonOpps.length : 25000;
    const avgCycleDays = 45; // benchmark days
    const salesVelocity = ((opps.length * (avgDealSize || 10000) * (winRate / 100 || 0.25)) / avgCycleDays);

    // Forecast Categories
    const commitForecast = opps
      .filter((o) => o.status === 'OPEN' && o.probability >= 0.8)
      .reduce((sum, o) => sum + Number(o.amount), 0) + closedRevenue;

    const bestCaseForecast = opps
      .filter((o) => o.status === 'OPEN' && o.probability >= 0.5)
      .reduce((sum, o) => sum + Number(o.amount), 0) + closedRevenue;

    res.json({
      success: true,
      data: {
        counts: {
          totalLeads,
          qualifiedLeads,
          totalCompanies: companies.length,
          totalContacts: contacts.length,
          totalOpportunities: opps.length,
          openOpportunities: opps.filter((o) => o.status === 'OPEN').length,
          wonOpportunities: wonOpps.length,
        },
        pipeline: {
          totalPipelineValue,
          weightedPipelineValue,
          closedRevenue,
          winRate: Math.round(winRate * 10) / 10,
          leadConversionRate: Math.round(leadConversionRate * 10) / 10,
          salesVelocityPerDay: Math.round(salesVelocity),
        },
        forecast: {
          commit: commitForecast,
          bestCase: bestCaseForecast,
          pipelineTotal: totalPipelineValue,
          weightedExpected: Math.round(weightedPipelineValue + closedRevenue),
        },
        leadPriorityDistribution: {
          hot: leads.filter((l) => l.score >= 80).length,
          warm: leads.filter((l) => l.score >= 50 && l.score < 80).length,
          cold: leads.filter((l) => l.score < 50).length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
