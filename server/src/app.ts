import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';

import authRouter from './modules/auth/auth.router';
import leadsRouter from './modules/leads/leads.router';
import contactsRouter from './modules/contacts/contacts.router';
import companiesRouter from './modules/companies/companies.router';
import opportunitiesRouter from './modules/opportunities/opportunities.router';
import pipelinesRouter from './modules/pipelines/pipelines.router';
import activitiesRouter from './modules/activities/activities.router';
import auditRouter from './modules/audit/audit.router';
import automationRouter from './modules/automation/automation.router';
import integrationsRouter from './modules/integrations/integrations.router';
import importsRouter from './modules/imports/imports.router';
import analyticsRouter from './modules/analytics/analytics.router';

export const app = express();

// Security & Parsing
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request Tracking
app.use(requestIdMiddleware);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':date[iso] :method :url :status :res[content-length] - :response-time ms [req-id: :req[x-request-id]]'));
}

// Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Health & Readiness checks (Assessment 09 & 14)
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'ClientSphere-Core-API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  res.json({
    status: 'READY',
    database: 'CONNECTED',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/leads', leadsRouter);
app.use('/api/v1/contacts', contactsRouter);
app.use('/api/v1/companies', companiesRouter);
app.use('/api/v1/opportunities', opportunitiesRouter);
app.use('/api/v1/pipelines', pipelinesRouter);
app.use('/api/v1/activities', activitiesRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/automation', automationRouter);
app.use('/api/v1/integrations', integrationsRouter);
app.use('/api/v1/imports', importsRouter);
app.use('/api/v1/analytics', analyticsRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    },
    requestId: req.headers['x-request-id'] || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// Centralized Error Handler
app.use(errorHandler);
